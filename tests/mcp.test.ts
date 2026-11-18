import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createFixtureEndpoints } from "@/lib/cmc/fixtureEndpoints";
import { SnapshotSource } from "@/lib/data/source";
import { writeSnapshot } from "@/lib/data/snapshotWriter";
import { bestVersionTool, compareTool, searchTool } from "../mcp/tools";

const root = path.resolve(__dirname, "..");
let snapDir: string;
let opts: { sources: { primary: SnapshotSource; fallback: null } };

beforeAll(async () => {
  snapDir = fs.mkdtempSync(path.join(os.tmpdir(), "wrapscout-mcp-"));
  await writeSnapshot(createFixtureEndpoints(path.join(root, "fixtures/cmc")), snapDir, {
    generatedAt: "2026-11-17T08:00:00.000Z",
  });
  opts = { sources: { primary: new SnapshotSource(snapDir, "snapshot"), fallback: null } };
});
afterAll(() => fs.rmSync(snapDir, { recursive: true, force: true }));

describe("MCP tool handlers", () => {
  it("searches tokenized assets", async () => {
    const res = await searchTool("gold", opts);
    expect(res.data.map((e) => e.symbol)).toEqual(["XAU"]);
    expect(res.text).toContain("XAU — Gold");
  });

  it("answers which version to buy, with reasons, where and warnings", async () => {
    const res = await bestVersionTool("nvda", opts);
    expect(res.text).toContain("Best pick: NVDAx (Backed Assets, Solana)");
    expect(res.text).toContain("Most liquid version");
    expect(res.text).toContain("Kraken");
    expect(res.text).toContain("2 versions have no market");
    expect(res.text).toContain("snapshot from 2026-11-17");
    expect(res.text).toContain("Not financial advice");
    expect(res.data?.best?.symbol).toBe("NVDAx");
  });

  it("says plainly when nothing is tradable", async () => {
    const res = await bestVersionTool("MS", opts);
    expect(res.text).toContain("No tradable version right now");
    expect(res.data?.best).toBeNull();
  });

  it("reports unknown tickers without throwing", async () => {
    const res = await bestVersionTool("zzzz", opts);
    expect(res.text).toContain('No tokenized asset found for "zzzz"');
    expect(res.data).toBeNull();
  });

  it("compares every version with its label and score", async () => {
    const res = await compareTool("XAU", opts);
    expect(res.text).toContain("PAXG");
    expect(res.text).toContain("Different unit");
    expect(res.data?.wrappers).toHaveLength(7);
  });
});

describe("MCP server over stdio", () => {
  it("lists the tools and answers a call", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [path.join(root, "node_modules/tsx/dist/cli.mjs"), path.join(root, "mcp/server.ts")],
      cwd: root,
      env: { ...(process.env as Record<string, string>), WRAPSCOUT_DATA: "demo" },
      stderr: "ignore",
    });
    const client = new Client({ name: "wrapscout-test", version: "0.0.0" });
    await client.connect(transport);
    try {
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name).sort()).toEqual([
        "best_tokenized_version",
        "compare_tokenized_versions",
        "search_tokenized_assets",
      ]);
      const result = await client.callTool({ name: "best_tokenized_version", arguments: { symbol: "NVDA" } });
      const text = (result.content as { type: string; text: string }[])[0].text;
      expect(text).toContain("Best pick: NVDAx");
      expect(text).toContain("Demo data");
    } finally {
      await client.close();
    }
  }, 30_000);
});
