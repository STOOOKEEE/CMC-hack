import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFixtureEndpoints } from "@/lib/cmc/fixtureEndpoints";
import type { CmcEndpoints } from "@/lib/cmc/endpoints";
import { SnapshotSource } from "@/lib/data/source";
import { writeSnapshot } from "@/lib/data/snapshotWriter";

const fixturesDir = path.resolve(__dirname, "../fixtures/cmc");
const tmpDirs: string[] = [];
function tmpDir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "wrapscout-writer-"));
  tmpDirs.push(d);
  return path.join(d, "snapshot");
}
afterEach(() => {
  vi.useRealTimers();
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

type Counted = CmcEndpoints & { counts: Record<string, number> };

/** Wraps endpoints, counts calls, and lets a hook run before each call (to move the clock or fail). */
function counted(api: CmcEndpoints, before?: (name: string, args: unknown[]) => void): Counted {
  const counts: Record<string, number> = {};
  const wrapped = { counts } as Counted;
  for (const [name, fn] of Object.entries(api)) {
    (wrapped as unknown as Record<string, unknown>)[name] = (...args: unknown[]) => {
      counts[name] = (counts[name] ?? 0) + 1;
      before?.(name, args);
      return (fn as (...a: unknown[]) => unknown)(...args);
    };
  }
  return wrapped;
}

describe("writeSnapshot", () => {
  it("does not re-fetch warmed data even when the run is slow (one minute per call)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    let now = Date.parse("2026-11-18T10:00:00Z");
    vi.setSystemTime(now);
    const api = counted(createFixtureEndpoints(fixturesDir), () => vi.setSystemTime((now += 60_000)));
    await writeSnapshot(api, tmpDir(), { marketPairsTop: 0 });
    expect(api.counts.rwaQuotes).toBe(1);
    expect(api.counts.cryptoInfo).toBe(1);
    expect(api.counts.cryptoQuotes).toBe(1);
    expect(api.counts.rwaInfoMany).toBe(1); // one batched call instead of one per asset
    expect(api.counts.rwaInfo ?? 0).toBe(0);
    expect(api.counts.cryptoMarketPairs ?? 0).toBe(0);
  });

  it("stops asking for market pairs once the plan has refused them", async () => {
    const fixtures = createFixtureEndpoints(fixturesDir);
    fixtures.cryptoMarketPairs = async () => null; // 403 "plan doesn't support this endpoint"
    const api = counted(fixtures);
    await writeSnapshot(api, tmpDir(), { marketPairsTop: 50 });
    expect(api.counts.cryptoMarketPairs).toBe(1);
  });

  it("retries an asset whose bundle came back degraded", async () => {
    let failed = false;
    const api = counted(createFixtureEndpoints(fixturesDir), (name, args) => {
      if (name === "rwaInfoMany") throw new Error("batch down"); // force the per-asset path
      if (name === "rwaInfo" && args[0] === 2 && !failed) {
        failed = true;
        throw new Error("transient");
      }
    });
    const dir = tmpDir();
    const result = await writeSnapshot(api, dir, {});
    expect(result.degraded).toEqual([]);
    expect((await new SnapshotSource(dir, "snapshot").assetBundle(2))?.info?.industry).toBe("Semiconductors");
  });

  it("reports assets that stay degraded after the retry", async () => {
    const api = counted(createFixtureEndpoints(fixturesDir), (name, args) => {
      if (name === "rwaInfoMany") throw new Error("batch down");
      if (name === "rwaInfo" && args[0] === 2) throw new Error("still down");
    });
    const result = await writeSnapshot(api, tmpDir(), {});
    expect(result.degraded).toEqual([2]);
    expect(result.assets).toBe(5);
  });

  it("leaves no temporary directory behind when it fails", async () => {
    const api = counted(createFixtureEndpoints(fixturesDir), (name) => {
      if (name === "rwaQuotes") throw new Error("hard failure");
    });
    const dir = tmpDir();
    await expect(writeSnapshot(api, dir, {})).rejects.toThrow("hard failure");
    expect(fs.readdirSync(path.dirname(dir))).toEqual([]);
  });
});
