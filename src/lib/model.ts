// Domain and raw CoinMarketCap types.
//
// Raw types describe the fields we read from the CMC API. Field names for the
// /v5/real-world-assets family come from public write-ups of round-1 projects
// and must be confirmed against real responses (`npm run explore`).

// ---------- Raw CMC shapes ----------

/** One entry of the v5 `quotes` ARRAY (v5 differs from v1/v2, which use an object keyed by currency). */
export interface RawV5Quote {
  symbol: string;
  average_tokenized_price?: number | null;
  tokenized_market_cap?: number | null;
  last_updated?: string | null;
}

/** One wrapper row of `/v5/real-world-assets/quotes/latest` → `tokens[]`. */
export interface RawRwaToken {
  crypto_id: number;
  symbol: string;
  name: string;
  issuer_id?: string | null;
  issuer_name?: string | null;
  price: number | null;
  market_cap?: number | null;
  volume_24h?: number | null;
}

/** One asset of `/v5/real-world-assets/quotes/latest`. */
export interface RawRwaQuote {
  rwa_id: number;
  symbol: string;
  name?: string;
  asset_type?: string;
  quotes?: RawV5Quote[];
  tokens?: RawRwaToken[];
}

/** `/v5/real-world-assets/info` — registrant metadata. `about` is an object, not a string. */
export interface RawRwaInfo {
  rwa_id?: number;
  name?: string;
  symbol?: string;
  industry?: string | null;
  sec_cik?: string | number | null;
  cik?: string | number | null;
  about?: unknown;
}

/** `/v5/real-world-assets/map` entry. */
export interface RawRwaMapEntry {
  rwa_id?: number;
  id?: number;
  symbol: string;
  name: string;
  asset_type?: string;
  has_tokens?: boolean;
  rwa_rank?: number | null;
}

/** `/v5/real-world-assets/assets/list` entry. */
export interface RawRwaAssetListEntry extends RawRwaMapEntry {
  tokenized_market_cap?: number | null;
  quotes?: RawV5Quote[];
}

/** `/v2/cryptocurrency/info` entry (keyed by id in the response). */
export interface RawCryptoInfo {
  id: number;
  name: string;
  symbol: string;
  slug?: string;
  platform?: {
    id?: number;
    name: string;
    slug?: string;
    token_address?: string;
  } | null;
  urls?: { explorer?: string[]; website?: string[] };
}

/** `/v2/cryptocurrency/quotes/latest` entry — `quote` is an OBJECT keyed by currency. */
export interface RawCryptoQuote {
  id: number;
  symbol: string;
  num_market_pairs?: number | null;
  quote?: Record<
    string,
    {
      price?: number | null;
      volume_24h?: number | null;
      market_cap?: number | null;
      percent_change_24h?: number | null;
      last_updated?: string;
    }
  >;
}

/** `/v2/cryptocurrency/market-pairs/latest` → `market_pairs[]` entry. */
export interface RawMarketPair {
  exchange?: { id?: number; name?: string; slug?: string };
  market_pair?: string;
  category?: string;
  quote?: Record<string, { price?: number | null; volume_24h?: number | null }>;
}

// ---------- Data bundle (live, snapshot and demo share this format) ----------

export interface AssetBundle {
  fetchedAt: string;
  quote: RawRwaQuote;
  info: RawRwaInfo | null;
  /** keyed by crypto_id as a string */
  tokenMeta: Record<string, RawCryptoInfo>;
  /** keyed by crypto_id as a string */
  tokenQuotes: Record<string, RawCryptoQuote>;
  /** keyed by crypto_id as a string; null when the plan does not allow market pairs */
  marketPairs: Record<string, RawMarketPair[]> | null;
  /** Parts that failed to load and were left empty (e.g. "info", "token metadata"). Absent when complete. */
  degraded?: string[];
}

// ---------- Domain ----------

export interface Wrapper {
  cryptoId: number;
  symbol: string;
  name: string;
  issuerName: string | null;
  price: number | null;
  volume24h: number | null;
  marketCap: number | null;
  numMarketPairs: number | null;
  chain: string | null;
  contract: string | null;
  explorerUrl: string | null;
  exchanges: string[];
  /** Why `exchanges` looks the way it does: listed, none tracked, not fetched for this wrapper, or refused by the plan. */
  exchangesStatus: "listed" | "none" | "not_fetched" | "plan";
}

export interface AssetHeader {
  rwaId: number;
  symbol: string;
  name: string;
  assetType: string;
  consensusPrice: number | null;
  lastUpdated: string | null;
  industry: string | null;
  secCik: string | null;
}

export type Label =
  | "best"
  | "only_option"
  | "good"
  | "weak"
  | "too_thin"
  | "different_unit"
  | "no_market";

export interface ScoredWrapper extends Wrapper {
  label: Label;
  score: number | null;
  /** price / reference price − 1 (the reference is the consensus when it is consistent), null if unknown */
  deviationFromConsensus: number | null;
  reasons: string[];
  warnings: string[];
}

export interface RankedAsset {
  wrappers: ScoredWrapper[];
  best: ScoredWrapper | null;
  /** Price defining the asset's unit: CMC's consensus when consistent, else the volume-weighted median. */
  referencePrice: number | null;
  eligibleCount: number;
  summaryWarnings: string[];
}

export type DataMode = "live" | "snapshot" | "demo";

export interface SearchEntry {
  rwaId: number;
  symbol: string;
  name: string;
  assetType: string;
  rank: number | null;
}

export interface PopularEntry extends SearchEntry {
  tokenizedMarketCap: number | null;
}

export interface AssetView {
  header: AssetHeader;
  ranked: RankedAsset;
  dataMode: DataMode;
  asOf: string;
}
