import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { TtlCache } from "../cache";
import type { CmcEndpoints } from "../cmc/endpoints";
import type {
  AssetBundle,
  DataMode,
  PopularEntry,
  RawCryptoInfo,
  RawMarketPair,
  RawRwaMapEntry,
  SearchEntry,
} from "../model";

export interface DataSource {
  mode: DataMode;
  /** When the data was produced; null for live data (use the bundle's fetchedAt). */
  asOf(): Promise<string | null>;
  searchIndex(): Promise<SearchEntry[]>;
  popular(limit: number): Promise<PopularEntry[]>;
  assetBundle(rwaId: number, opts?: { marketPairs?: boolean }): Promise<AssetBundle | null>;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
/** Spec §6.1 cache TTLs. */
export const TTL = {
  map: 24 * HOUR,
  assetsList: 15 * MIN,
  rwaQuotes: 2 * MIN,
  rwaInfo: 24 * HOUR,
  cryptoInfo: 7 * 24 * HOUR,
  cryptoQuotes: 2 * MIN,
  marketPairs: 10 * MIN,
} as const;

/** Max wrappers per asset for which market pairs are fetched (1 call each). */
const MARKET_PAIR_WRAPPERS = 4;

const rwaIdOf = (e: RawRwaMapEntry) => e.rwa_id ?? e.id ?? -1;
const toSearchEntry = (e: RawRwaMapEntry): SearchEntry => ({
  rwaId: rwaIdOf(e),
  symbol: e.symbol,
  name: e.name,
  assetType: e.asset_type ?? "unknown",
  rank: e.rwa_rank ?? null,
});

export interface LiveSourceOptions {
  cache?: TtlCache;
  /** Floor for every TTL — the snapshot writer keeps everything for the whole run. */
  minTtlMs?: number;
}

export class LiveSource implements DataSource {
  readonly mode = "live" as const;
  private readonly cache: TtlCache;
  private readonly minTtlMs: number;

  constructor(
    private readonly api: CmcEndpoints,
    opts: LiveSourceOptions = {},
  ) {
    this.cache = opts.cache ?? new TtlCache(5000);
    this.minTtlMs = opts.minTtlMs ?? 0;
  }

  private ttl(ms: number): number {
    return Math.max(ms, this.minTtlMs);
  }

  async asOf() {
    return null;
  }

  async searchIndex(): Promise<SearchEntry[]> {
    return this.cache.getOrLoad("map", this.ttl(TTL.map), async () =>
      (await this.api.rwaMap()).filter((e) => e.has_tokens && rwaIdOf(e) >= 0).map(toSearchEntry),
    );
  }

  async popular(limit: number): Promise<PopularEntry[]> {
    return this.cache.getOrLoad(`assets:${limit}`, this.ttl(TTL.assetsList), async () => {
      // Only offer tiles that lead somewhere: the asset must be in the searchable (has_tokens) index.
      const searchable = new Set((await this.searchIndex()).map((e) => e.rwaId));
      return (await this.api.rwaAssetsList(limit))
        .filter((e) => searchable.has(rwaIdOf(e)))
        .map((e) => ({
          ...toSearchEntry(e),
          tokenizedMarketCap:
            e.tokenized_market_cap ?? e.quotes?.find((q) => q.symbol === "USD")?.tokenized_market_cap ?? null,
        }))
        .sort((a, b) => (b.tokenizedMarketCap ?? -1) - (a.tokenizedMarketCap ?? -1));
    });
  }

  /** Batch-fetch RWA quotes and token metadata for many assets at once (used by the snapshot writer). */
  async warm(rwaIds: number[]): Promise<void> {
    const quotes = await this.api.rwaQuotes(rwaIds);
    for (const q of quotes) await this.cache.getOrLoad(`rwaq:${q.rwa_id}`, this.ttl(TTL.rwaQuotes), async () => q);
    const tokenIds = quotes.flatMap((q) => (q.tokens ?? []).map((t) => t.crypto_id));
    await this.tokenMeta(tokenIds);
    const tokenQuotes = await this.api.cryptoQuotes(tokenIds);
    for (const q of quotes) {
      const ids = (q.tokens ?? []).map((t) => t.crypto_id);
      const subset = Object.fromEntries(ids.filter((id) => tokenQuotes[id]).map((id) => [String(id), tokenQuotes[id]]));
      await this.cache.getOrLoad(`cq:${ids.join(",")}`, this.ttl(TTL.cryptoQuotes), async () => subset);
    }
    // Registrant info, 50 assets per call. If the batch fails, assetBundle falls back to one call per asset.
    try {
      const infos = await this.api.rwaInfoMany(quotes.map((q) => q.rwa_id));
      for (const q of quotes) {
        const info = infos[String(q.rwa_id)] ?? null;
        await this.cache.getOrLoad(`rwai:${q.rwa_id}`, this.ttl(TTL.rwaInfo), async () => info);
      }
    } catch {
      // leave uncached
    }
  }

  /** Set once CMC answers that the plan does not include market pairs: no point asking for every asset. */
  private marketPairsRefused = false;

  async assetBundle(rwaId: number, opts: { marketPairs?: boolean } = {}): Promise<AssetBundle | null> {
    const quote = await this.cache.getOrLoad(`rwaq:${rwaId}`, this.ttl(TTL.rwaQuotes), async () => {
      const [q] = await this.api.rwaQuotes([rwaId]);
      return q ?? null;
    });
    if (!quote) return null;

    const tokens = quote.tokens ?? [];
    const ids = tokens.map((t) => t.crypto_id);
    const degraded: string[] = [];
    const orEmpty =
      <T,>(part: string, empty: T) =>
      () => {
        degraded.push(part);
        return empty;
      };
    const [info, tokenMeta, tokenQuotes] = await Promise.all([
      this.cache
        .getOrLoad(`rwai:${rwaId}`, this.ttl(TTL.rwaInfo), () => this.api.rwaInfo(rwaId))
        .catch(orEmpty("info", null)),
      this.tokenMeta(ids).catch(orEmpty("token metadata", {})),
      this.cache
        .getOrLoad(`cq:${ids.join(",")}`, this.ttl(TTL.cryptoQuotes), () => this.api.cryptoQuotes(ids))
        .catch(orEmpty("token quotes", {})),
    ]);

    let marketPairs: Record<string, RawMarketPair[]> | null = this.marketPairsRefused ? null : {};
    if (opts.marketPairs !== false && marketPairs !== null) {
      const candidates = tokens
        .filter((t) => t.price !== null)
        .sort((a, b) => (b.volume_24h ?? 0) - (a.volume_24h ?? 0))
        .slice(0, MARKET_PAIR_WRAPPERS);
      for (const t of candidates) {
        const pairs = await this.cache
          .getOrLoad(`mp:${t.crypto_id}`, this.ttl(TTL.marketPairs), () => this.api.cryptoMarketPairs(t.crypto_id))
          .catch(orEmpty("market pairs", [] as RawMarketPair[]));
        if (pairs === null) {
          marketPairs = null; // the plan does not include market pairs — stop asking, for every asset
          this.marketPairsRefused = true;
          break;
        }
        marketPairs[String(t.crypto_id)] = pairs;
      }
    }

    return {
      fetchedAt: new Date().toISOString(),
      quote,
      info,
      tokenMeta,
      tokenQuotes,
      marketPairs,
      ...(degraded.length > 0 ? { degraded: [...new Set(degraded)] } : {}),
    };
  }

  /** Token metadata cached per id for 7 days; ids CMC cannot resolve are cached as null. */
  private async tokenMeta(ids: number[]): Promise<Record<string, RawCryptoInfo>> {
    const missing = ids.filter((id) => this.cache.get(`ci:${id}`) === undefined);
    if (missing.length > 0) {
      const { byId } = await this.api.cryptoInfo(missing);
      for (const id of missing) {
        const meta = byId[String(id)] ?? null;
        await this.cache.getOrLoad(`ci:${id}`, this.ttl(TTL.cryptoInfo), async () => meta);
      }
    }
    const out: Record<string, RawCryptoInfo> = {};
    for (const id of ids) {
      const meta = this.cache.get<RawCryptoInfo | null>(`ci:${id}`);
      if (meta) out[String(id)] = meta;
    }
    return out;
  }
}

export interface SnapshotIndex {
  generatedAt: string;
  searchIndex: SearchEntry[];
  popular: PopularEntry[];
}

/** Reads a snapshot directory: `index.json` + `assets/<rwaId>.json` (one AssetBundle each). */
export class SnapshotSource implements DataSource {
  private index: Promise<SnapshotIndex> | null = null;

  constructor(
    private readonly dir: string,
    readonly mode: "snapshot" | "demo",
  ) {}

  static exists(dir: string): boolean {
    return fs.existsSync(path.join(dir, "index.json"));
  }

  private loadIndex(): Promise<SnapshotIndex> {
    this.index ??= fsp
      .readFile(path.join(this.dir, "index.json"), "utf8")
      .then((raw) => JSON.parse(raw) as SnapshotIndex)
      .catch((e: unknown) => {
        // A read during a snapshot swap must not break this source until the next restart.
        this.index = null;
        throw e;
      });
    return this.index;
  }

  async asOf() {
    return (await this.loadIndex()).generatedAt;
  }

  async searchIndex() {
    return (await this.loadIndex()).searchIndex;
  }

  async popular(limit: number) {
    return (await this.loadIndex()).popular.slice(0, limit);
  }

  async assetBundle(rwaId: number): Promise<AssetBundle | null> {
    if (!Number.isInteger(rwaId)) return null;
    try {
      return JSON.parse(await fsp.readFile(path.join(this.dir, "assets", `${rwaId}.json`), "utf8")) as AssetBundle;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }
}
