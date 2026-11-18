import type {
  AssetBundle,
  AssetHeader,
  RawMarketPair,
  RawV5Quote,
  Wrapper,
} from "./model";

const MAX_EXCHANGES = 5;

/** v5 returns `quotes` as an array of `{ symbol, ... }`; pick the USD entry. */
export function usdQuoteV5(quotes: RawV5Quote[] | undefined): RawV5Quote | null {
  if (!Array.isArray(quotes)) return null;
  return quotes.find((q) => q.symbol === "USD") ?? null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function topExchanges(pairs: RawMarketPair[] | undefined): string[] {
  if (!pairs) return [];
  const volumeByExchange = new Map<string, number>();
  for (const pair of pairs) {
    const name = pair.exchange?.name;
    if (!name) continue;
    const volume = num(pair.quote?.USD?.volume_24h) ?? 0;
    volumeByExchange.set(name, (volumeByExchange.get(name) ?? 0) + volume);
  }
  return [...volumeByExchange.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_EXCHANGES)
    .map(([name]) => name);
}

export function normalizeAsset(bundle: AssetBundle): { header: AssetHeader; wrappers: Wrapper[] } {
  const { quote, info, tokenMeta, tokenQuotes, marketPairs } = bundle;
  const usd = usdQuoteV5(quote.quotes);

  const header: AssetHeader = {
    rwaId: quote.rwa_id,
    symbol: quote.symbol,
    name: quote.name ?? info?.name ?? quote.symbol,
    assetType: quote.asset_type ?? "unknown",
    consensusPrice: num(usd?.average_tokenized_price),
    lastUpdated: str(usd?.last_updated),
    industry: str(info?.industry),
    secCik: str(info?.sec_cik ?? info?.cik),
  };

  const wrappers: Wrapper[] = (quote.tokens ?? []).map((token) => {
    const id = String(token.crypto_id);
    const meta = tokenMeta[id];
    const cq = tokenQuotes[id];
    const cqUsd = cq?.quote?.USD;
    const exchanges = topExchanges(marketPairs?.[id]);
    return {
      cryptoId: token.crypto_id,
      symbol: token.symbol,
      name: token.name,
      issuerName: str(token.issuer_name),
      price: num(token.price),
      volume24h: num(token.volume_24h) ?? num(cqUsd?.volume_24h),
      marketCap: num(token.market_cap) ?? num(cqUsd?.market_cap),
      numMarketPairs: num(cq?.num_market_pairs),
      chain: str(meta?.platform?.name),
      contract: str(meta?.platform?.token_address),
      explorerUrl: str(meta?.urls?.explorer?.[0]),
      exchanges,
      exchangesStatus:
        marketPairs === null
          ? "plan"
          : marketPairs[id] === undefined
            ? "not_fetched"
            : exchanges.length > 0
              ? "listed"
              : "none",
    };
  });

  return { header, wrappers };
}
