import { describe, expect, it } from "vitest";
import { resolveSymbol, searchAssets } from "@/lib/search";
import type { SearchEntry } from "@/lib/model";

const e = (rwaId: number, symbol: string, name: string, rank: number | null): SearchEntry => ({
  rwaId, symbol, name, assetType: "stock", rank,
});
const index: SearchEntry[] = [
  e(300, "NVDL", "GraniteShares 2x Long NVDA Daily ETF", 300),
  e(9, "NVDAQ", "Hypothetical NVDA Quarterly", 0),
  e(2, "NVDA", "NVIDIA Corp", 1),
  e(30, "GLD", "SPDR Gold Shares", 30),
  e(10, "XAU", "Gold", 2),
  e(11, "XAU", "Gold (duplicate listing)", 50),
];

describe("searchAssets", () => {
  it("ranks exact symbol, then symbol prefix, then name matches", () => {
    expect(searchAssets(index, "NVDA").map((x) => x.symbol)).toEqual(["NVDA", "NVDAQ", "NVDL"]);
  });

  it("is case-insensitive and orders prefix matches by rank", () => {
    expect(searchAssets(index, "nv").map((x) => x.symbol)).toEqual(["NVDAQ", "NVDA", "NVDL"]);
  });

  it("matches on the asset name", () => {
    expect(searchAssets(index, "gold").map((x) => x.rwaId)).toEqual([10, 30, 11]);
  });

  it("returns nothing for an empty query and respects the limit", () => {
    expect(searchAssets(index, "  ")).toEqual([]);
    expect(searchAssets(index, "n", 2)).toHaveLength(2);
  });
});

describe("resolveSymbol", () => {
  it("resolves a lowercase symbol to the best-ranked exact match", () => {
    expect(resolveSymbol(index, "xau")?.rwaId).toBe(10);
    expect(resolveSymbol(index, "Nvda")?.rwaId).toBe(2);
  });

  it("returns null for an unknown symbol", () => {
    expect(resolveSymbol(index, "zzzz")).toBeNull();
  });
});
