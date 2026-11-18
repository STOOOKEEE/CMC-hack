import { describe, expect, it } from "vitest";
import { normalizeAsset } from "@/lib/normalize";
import { rankAsset, weightedMedian } from "@/lib/score/rank";
import type { AssetHeader, Wrapper } from "@/lib/model";
import { fixtureBundle } from "./helpers/fixtures";

function ranked(symbol: string, mutate?: (w: Wrapper[], h: AssetHeader) => void) {
  const { header, wrappers } = normalizeAsset(fixtureBundle(symbol));
  mutate?.(wrappers, header);
  return rankAsset(header, wrappers);
}

describe("weightedMedian", () => {
  it("returns the value where cumulative weight reaches half", () => {
    expect(
      weightedMedian([
        { value: 1, weight: 1 },
        { value: 2, weight: 1 },
        { value: 10, weight: 5 },
      ]),
    ).toBe(10);
    expect(weightedMedian([{ value: 3, weight: 1 }])).toBe(3);
  });
});

describe("rankAsset — NVDA (mixed liquidity, two dead wrappers)", () => {
  const r = ranked("NVDA");

  it("picks the most liquid in-line wrapper as best", () => {
    expect(r.best?.cryptoId).toBe(36992);
    expect(r.best?.label).toBe("best");
    expect(r.best?.score).toBe(100);
    expect(r.eligibleCount).toBe(5);
  });

  it("scores and labels the alternatives per the spec formula", () => {
    const byId = new Map(r.wrappers.map((w) => [w.cryptoId, w]));
    expect(byId.get(38093)?.score).toBe(81);
    expect(byId.get(38093)?.label).toBe("good");
    expect(byId.get(90003)?.score).toBe(56);
    expect(byId.get(90003)?.label).toBe("weak");
  });

  it("marks the $43 wrapper as too thin with an explicit warning", () => {
    const thin = r.wrappers.find((w) => w.cryptoId === 90006)!;
    expect(thin.label).toBe("too_thin");
    expect(thin.score).toBeNull();
    expect(thin.warnings.join(" ")).toContain("$43");
  });

  it("orders eligible by score, then too thin, then no market", () => {
    expect(r.wrappers.map((w) => w.cryptoId)).toEqual([
      36992, 38093, 90003, 90004, 90005, 90006, 28616, 90008,
    ]);
    expect(r.wrappers.slice(-2).every((w) => w.label === "no_market")).toBe(true);
  });

  it("explains the best pick", () => {
    const reasons = r.best!.reasons.join(" | ");
    expect(reasons).toContain("Most liquid version");
    expect(reasons).toContain("markets");
  });

  it("summarises what is wrong with the other versions", () => {
    expect(r.summaryWarnings).toContain("2 versions have no market");
    expect(r.summaryWarnings).toContain("1 version trades under $10k/day");
  });

  it("computes the deviation from the consensus price", () => {
    expect(r.best!.deviationFromConsensus).toBeCloseTo(229.28 / 229.07 - 1, 10);
    expect(r.wrappers.find((w) => w.cryptoId === 28616)!.deviationFromConsensus).toBeNull();
  });
});

describe("rankAsset — gold (mixed units)", () => {
  it("never ranks per-gram wrappers against per-ounce ones", () => {
    const r = ranked("XAU");
    const units = r.wrappers.filter((w) => w.label === "different_unit").map((w) => w.cryptoId);
    expect(units.sort()).toEqual([90106, 90107]);
    expect(r.best?.cryptoId).toBe(4705);
    expect(r.wrappers.find((w) => w.cryptoId === 90106)!.warnings.join(" ")).toContain("different unit");
  });

  it("falls back to the median price when the consensus is missing", () => {
    const r = ranked("XAU", (_w, h) => {
      h.consensusPrice = null;
    });
    expect(r.wrappers.filter((w) => w.label === "different_unit")).toHaveLength(2);
    expect(r.best?.cryptoId).toBe(4705);
  });
});

describe("rankAsset — edge cases", () => {
  it("has no best pick when nothing trades", () => {
    const r = ranked("MS");
    expect(r.best).toBeNull();
    expect(r.eligibleCount).toBe(0);
    expect(r.summaryWarnings).toContain("No tradable version right now");
    expect(r.wrappers[0].label).toBe("no_market");
  });

  it("labels a single eligible wrapper as the only option", () => {
    const r = ranked("SPY", (w) => {
      w.find((x) => x.cryptoId === 90302)!.price = null;
    });
    expect(r.best?.cryptoId).toBe(90301);
    expect(r.best?.label).toBe("only_option");
    expect(r.summaryWarnings).toContain("Only one tradable version");
  });

  it("breaks score ties by volume", () => {
    const header: AssetHeader = {
      rwaId: 1, symbol: "T", name: "Tie", assetType: "stock", consensusPrice: 100,
      lastUpdated: null, industry: null, secCik: null,
    };
    const base: Omit<Wrapper, "cryptoId" | "symbol" | "volume24h"> = {
      name: "x", issuerName: null, price: 100, marketCap: null, numMarketPairs: 5,
      chain: null, contract: null, explorerUrl: null, exchanges: [],
    };
    // Same volume ⇒ same score; ordering must then follow input-independent volume tiebreak.
    const r = rankAsset(header, [
      { ...base, cryptoId: 1, symbol: "A", volume24h: 50_000 },
      { ...base, cryptoId: 2, symbol: "B", volume24h: 50_000.4 },
    ]);
    expect(r.wrappers[0].score).toBe(r.wrappers[1].score);
    expect(r.wrappers[0].cryptoId).toBe(2);
  });
});
