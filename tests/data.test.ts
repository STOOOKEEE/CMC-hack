import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CmcError } from "@/lib/cmc/client";
import { createFixtureEndpoints } from "@/lib/cmc/fixtureEndpoints";
import { defaultConfig, getAssetView, getSources, type Sources } from "@/lib/data";
import { LiveSource, SnapshotSource, type DataSource } from "@/lib/data/source";
import { writeSnapshot } from "@/lib/data/snapshotWriter";
import { issuerNote } from "@/lib/issuers";

const fixturesDir = path.resolve(__dirname, "../fixtures/cmc");
let snapDir: string;

beforeAll(async () => {
  snapDir = fs.mkdtempSync(path.join(os.tmpdir(), "wrapscout-snap-"));
  await writeSnapshot(createFixtureEndpoints(fixturesDir), snapDir, {
    generatedAt: "2026-11-17T08:00:00.000Z",
    marketPairsTop: 2,
  });
});
afterAll(() => fs.rmSync(snapDir, { recursive: true, force: true }));

/** A live-mode source whose every call fails or hangs, to exercise the fallback path. */
function brokenLive(behaviour: "throw" | "hang"): DataSource & { calls: string[] } {
  const calls: string[] = [];
  const fail = (name: string) => () => {
    calls.push(name);
    return behaviour === "throw"
      ? Promise.reject(new CmcError("rate_limit", 429, "slow down"))
      : new Promise<never>(() => {});
  };
  return {
    mode: "live",
    calls,
    asOf: async () => null,
    searchIndex: fail("searchIndex"),
    popular: fail("popular"),
    assetBundle: fail("assetBundle"),
  };
}

describe("LiveSource on fixture endpoints", () => {
  it("only indexes assets that have tokens", async () => {
    const live = new LiveSource(createFixtureEndpoints(fixturesDir));
    const symbols = (await live.searchIndex()).map((x) => x.symbol);
    expect(symbols).toContain("NVDA");
    expect(symbols).not.toContain("BRKA");
  });

  it("builds a full bundle for an asset", async () => {
    const live = new LiveSource(createFixtureEndpoints(fixturesDir));
    const bundle = (await live.assetBundle(2))!;
    expect(bundle.quote.tokens).toHaveLength(8);
    expect(bundle.tokenMeta["36992"].platform?.name).toBe("Solana");
    expect(bundle.tokenQuotes["38093"].num_market_pairs).toBe(6);
    expect(bundle.marketPairs?.["36992"]?.length).toBeGreaterThan(0);
    expect(await live.assetBundle(424242)).toBeNull();
  });

  it("sorts popular assets by tokenized market cap", async () => {
    const live = new LiveSource(createFixtureEndpoints(fixturesDir));
    expect((await live.popular(3)).map((x) => x.symbol)).toEqual(["XAU", "NVDA", "TSLA"]);
  });
});

describe("snapshot round-trip", () => {
  it("reads back what writeSnapshot wrote", async () => {
    const snap = new SnapshotSource(snapDir, "snapshot");
    expect(await snap.asOf()).toBe("2026-11-17T08:00:00.000Z");
    expect((await snap.searchIndex()).length).toBe(5);
    expect((await snap.assetBundle(2))?.quote.symbol).toBe("NVDA");
    expect(await snap.assetBundle(424242)).toBeNull();
    expect(SnapshotSource.exists(snapDir)).toBe(true);
    expect(SnapshotSource.exists(path.join(snapDir, "nope"))).toBe(false);
  });
});

describe("getAssetView", () => {
  const snapshotSources = (): Sources => ({ primary: new SnapshotSource(snapDir, "snapshot"), fallback: null });

  it("builds a ranked view for a lowercase symbol", async () => {
    const view = (await getAssetView("nvda", { sources: snapshotSources() }))!;
    expect(view.header.symbol).toBe("NVDA");
    expect(view.ranked.best?.cryptoId).toBe(36992);
    expect(view.dataMode).toBe("snapshot");
    expect(view.asOf).toBe("2026-11-17T08:00:00.000Z");
  });

  it("returns null for an unknown symbol", async () => {
    expect(await getAssetView("zzzz", { sources: snapshotSources() })).toBeNull();
  });

  it("falls back to the snapshot when live CMC errors", async () => {
    const view = await getAssetView("NVDA", {
      sources: { primary: brokenLive("throw"), fallback: new SnapshotSource(snapDir, "snapshot") },
    });
    expect(view?.dataMode).toBe("snapshot");
    expect(view?.ranked.best?.cryptoId).toBe(36992);
  });

  it("falls back to the snapshot when live CMC hangs past the timeout", async () => {
    const view = await getAssetView("NVDA", {
      sources: { primary: brokenLive("hang"), fallback: new SnapshotSource(snapDir, "snapshot") },
      timeoutMs: 20,
    });
    expect(view?.dataMode).toBe("snapshot");
  });

  it("stops calling a failing live source for a while once it has failed", async () => {
    const live = brokenLive("throw");
    const sources = { primary: live, fallback: new SnapshotSource(snapDir, "snapshot") };
    expect((await getAssetView("NVDA", { sources }))?.dataMode).toBe("snapshot");
    expect((await getAssetView("TSLA", { sources }))?.dataMode).toBe("snapshot");
    expect(live.calls).toEqual(["searchIndex"]);
  });

  it("pays at most one timeout per view when live hangs", async () => {
    const live = brokenLive("hang");
    const started = Date.now();
    const view = await getAssetView("NVDA", {
      sources: { primary: live, fallback: new SnapshotSource(snapDir, "snapshot") },
      timeoutMs: 50,
    });
    expect(view?.dataMode).toBe("snapshot");
    expect(live.calls).toEqual(["searchIndex"]);
    expect(Date.now() - started).toBeLessThan(500);
  });

  it("tries live again once the cool-down is over", async () => {
    const live = brokenLive("throw");
    const sources = { primary: live, fallback: new SnapshotSource(snapDir, "snapshot") };
    await getAssetView("NVDA", { sources, coolDownMs: 10 });
    await new Promise((r) => setTimeout(r, 20));
    await getAssetView("NVDA", { sources, coolDownMs: 10 });
    expect(live.calls).toEqual(["searchIndex", "searchIndex"]);
  });

  it("rethrows when live fails and there is no snapshot", async () => {
    await expect(
      getAssetView("NVDA", { sources: { primary: brokenLive("throw"), fallback: null } }),
    ).rejects.toThrow("slow down");
  });
});

describe("getSources", () => {
  it("uses live with snapshot fallback when a key is set", () => {
    const s = getSources({ apiKey: "k", snapshotDir: snapDir, demoDir: "/nonexistent" });
    expect(s.primary.mode).toBe("live");
    expect(s.fallback?.mode).toBe("snapshot");
  });

  it("uses the snapshot without a key when one exists", () => {
    const s = getSources({ apiKey: undefined, snapshotDir: snapDir, demoDir: "/nonexistent" });
    expect(s.primary.mode).toBe("snapshot");
    expect(s.fallback).toBeNull();
  });

  it("forces demo data when asked, even with a key and a snapshot (used by the e2e suite)", () => {
    const s = getSources({ apiKey: "k", snapshotDir: snapDir, demoDir: snapDir, forceDemo: true });
    expect(s.primary.mode).toBe("demo");
    expect(s.fallback).toBeNull();
  });

  it("reads WRAPSCOUT_DATA=demo from the environment", () => {
    process.env.WRAPSCOUT_DATA = "demo";
    try {
      expect(defaultConfig().forceDemo).toBe(true);
    } finally {
      delete process.env.WRAPSCOUT_DATA;
    }
    expect(defaultConfig().forceDemo).toBe(false);
  });

  it("uses demo data without a key and without a snapshot", () => {
    const s = getSources({ apiKey: "", snapshotDir: "/nonexistent", demoDir: snapDir });
    expect(s.primary.mode).toBe("demo");
  });
});

describe("issuerNote", () => {
  it("matches issuer names case-insensitively", () => {
    expect(issuerNote("Backed Assets")?.label).toBe("Backed (xStocks)");
    expect(issuerNote("ONDO")?.url).toMatch(/^https:\/\//);
    expect(issuerNote("Unknown Issuer Co")).toBeNull();
    expect(issuerNote(null)).toBeNull();
  });
});
