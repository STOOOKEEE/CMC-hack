import type {
  AssetBundle,
  AssetHeader,
  Deployment,
  RawCryptoInfo,
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

/** Known block-explorer hosts per chain name (as CMC spells them). Unknown chains fall back to a unique match. */
const EXPLORER_HOSTS: [RegExp, string[]][] = [
  [/^ethereum$/i, ["etherscan.io", "ethplorer.io"]],
  [/bnb|bsc|binance/i, ["bscscan.com"]],
  [/arbitrum/i, ["arbiscan.io"]],
  [/^base$/i, ["basescan.org"]],
  [/solana/i, ["solscan.io", "solana.fm", "explorer.solana.com"]],
  [/polygon/i, ["polygonscan.com"]],
  [/avalanche/i, ["snowtrace.io", "snowscan.xyz", "avascan.info"]],
  [/optimism/i, ["optimistic.etherscan.io"]],
  [/^ink$/i, ["explorer.inkonchain.com"]],
  [/x ?layer/i, ["oklink.com"]],
  [/^ton$/i, ["tonviewer.com", "tonscan.org"]],
  [/hyperevm/i, ["hyperevmscan.io"]],
  [/stellar/i, ["stellar.expert"]],
];

function explorerHostsFor(chain: string): string[] | null {
  return EXPLORER_HOSTS.find(([pattern]) => pattern.test(chain))?.[1] ?? null;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Every chain a token is deployed on, primary (the one matching `platform.token_address`) first.
 * Each deployment only gets an explorer link that actually contains its address: real responses list explorers
 * in no particular order, and `urls.explorer[0]` can belong to another chain's contract.
 */
export function deploymentsOf(meta: RawCryptoInfo | undefined): Deployment[] {
  if (!meta) return [];
  const explorers = meta.urls?.explorer ?? [];
  const explorerFor = (address: string | null, chain: string) => {
    if (!address) return null;
    const candidates = explorers.filter((u) => u.toLowerCase().includes(address.toLowerCase()));
    const hosts = explorerHostsFor(chain);
    // EVM tokens often share one address across chains: only trust a link whose host belongs to this chain.
    if (hosts) return candidates.find((u) => hosts.includes(hostOf(u))) ?? null;
    return candidates.length === 1 ? candidates[0] : null;
  };

  const list: Deployment[] = [];
  const seen = new Set<string>();
  for (const c of meta.contract_address ?? []) {
    const chain = str(c.platform?.name);
    const address = str(c.contract_address);
    if (!chain || !address) continue;
    const key = `${chain}|${address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({ chain, address, explorerUrl: explorerFor(address, chain) });
  }

  const primaryAddress = str(meta.platform?.token_address)?.toLowerCase() ?? null;
  const primaryIndex = primaryAddress ? list.findIndex((d) => d.address?.toLowerCase() === primaryAddress) : -1;
  if (primaryIndex > 0) list.unshift(...list.splice(primaryIndex, 1));
  if (primaryIndex === -1 && meta.platform?.name) {
    const address = str(meta.platform.token_address);
    list.unshift({ chain: meta.platform.name, address, explorerUrl: explorerFor(address, meta.platform.name) });
  }
  return list;
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
    tradfiMarkets: (quote.tradfi_markets ?? []).flatMap((m) => {
      const exchange = str(m.exchange?.name);
      return exchange ? [{ exchange, url: str(m.market_url) }] : [];
    }),
  };

  const wrappers: Wrapper[] = (quote.tokens ?? []).map((token) => {
    const id = String(token.crypto_id);
    const meta = tokenMeta[id];
    const cq = tokenQuotes[id];
    const cqUsd = cq?.quote?.USD;
    const exchanges = topExchanges(marketPairs?.[id]);
    const deployments = deploymentsOf(meta);
    return {
      cryptoId: token.crypto_id,
      symbol: token.symbol,
      name: token.name,
      issuerName: str(token.issuer_name),
      price: num(token.price),
      volume24h: num(token.volume_24h) ?? num(cqUsd?.volume_24h),
      marketCap: num(token.market_cap) ?? num(cqUsd?.market_cap),
      numMarketPairs: num(cq?.num_market_pairs),
      chain: deployments[0]?.chain ?? null,
      contract: deployments[0]?.address ?? null,
      explorerUrl: deployments[0]?.explorerUrl ?? null,
      deployments,
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
