import fs from "node:fs";
import path from "node:path";
import type {
  AssetBundle,
  RawCryptoInfo,
  RawCryptoQuote,
  RawMarketPair,
  RawRwaInfo,
  RawRwaQuote,
} from "@/lib/model";

const dir = path.resolve(__dirname, "../../fixtures/cmc");
function load<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")).data as T;
}

/** Build an AssetBundle for one fixture asset (by underlying symbol) from the synthetic raw responses. */
export function fixtureBundle(symbol: string): AssetBundle {
  const quotes = load<RawRwaQuote[]>("rwa-quotes.json");
  const quote = quotes.find((q) => q.symbol === symbol);
  if (!quote) throw new Error(`no fixture for ${symbol}`);
  const info = load<Record<string, RawRwaInfo>>("rwa-info.json")[String(quote.rwa_id)] ?? null;
  const allMeta = load<Record<string, RawCryptoInfo>>("crypto-info.json");
  const allQuotes = load<Record<string, RawCryptoQuote>>("crypto-quotes.json");
  const allPairs = load<Record<string, { market_pairs: RawMarketPair[] }>>("crypto-market-pairs.json");
  const ids = (quote.tokens ?? []).map((t) => String(t.crypto_id));
  const pick = <V,>(src: Record<string, V>) =>
    Object.fromEntries(ids.filter((id) => src[id]).map((id) => [id, src[id]]));
  return {
    fetchedAt: "2026-11-18T10:00:00.000Z",
    quote,
    info,
    tokenMeta: pick(allMeta),
    tokenQuotes: pick(allQuotes),
    marketPairs: Object.fromEntries(
      ids.filter((id) => allPairs[id]).map((id) => [id, allPairs[id].market_pairs]),
    ),
  };
}
