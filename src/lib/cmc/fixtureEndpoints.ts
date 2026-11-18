import fs from "node:fs";
import path from "node:path";
import type {
  RawCryptoInfo,
  RawCryptoQuote,
  RawMarketPair,
  RawRwaAssetListEntry,
  RawRwaInfo,
  RawRwaMapEntry,
  RawRwaQuote,
} from "../model";
import type { CmcEndpoints } from "./endpoints";

/**
 * CmcEndpoints backed by recorded `{ status, data }` files (see fixtures/README.md).
 * Used to build the demo snapshot and in tests — never by the live app.
 */
export function createFixtureEndpoints(dir: string): CmcEndpoints {
  const load = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")).data as T;
  const map = load<RawRwaMapEntry[]>("rwa-map.json");
  const list = load<RawRwaAssetListEntry[]>("rwa-assets-list.json");
  const quotes = load<RawRwaQuote[]>("rwa-quotes.json");
  const info = load<Record<string, RawRwaInfo>>("rwa-info.json");
  const cryptoInfo = load<Record<string, RawCryptoInfo>>("crypto-info.json");
  const cryptoQuotes = load<Record<string, RawCryptoQuote>>("crypto-quotes.json");
  const pairs = load<Record<string, { market_pairs: RawMarketPair[] }>>("crypto-market-pairs.json");

  return {
    rwaMap: async () => map,
    rwaAssetsList: async (limit) => list.slice(0, limit),
    rwaQuotes: async (ids) => quotes.filter((q) => ids.includes(q.rwa_id)),
    rwaInfo: async (id) => info[String(id)] ?? null,
    cryptoInfo: async (ids) => ({
      byId: Object.fromEntries(ids.filter((id) => cryptoInfo[id]).map((id) => [String(id), cryptoInfo[id]])),
      unresolved: ids.filter((id) => !cryptoInfo[id]),
    }),
    cryptoQuotes: async (ids) =>
      Object.fromEntries(ids.filter((id) => cryptoQuotes[id]).map((id) => [String(id), cryptoQuotes[id]])),
    cryptoMarketPairs: async (id) => pairs[id]?.market_pairs ?? [],
    keyInfo: async () => ({ plan: "fixture" }),
    creditsUsed: () => 0,
  };
}
