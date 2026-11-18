import type {
  RawCryptoInfo,
  RawCryptoQuote,
  RawMarketPair,
  RawRwaAssetListEntry,
  RawRwaInfo,
  RawRwaMapEntry,
  RawRwaQuote,
} from "../model";
import { CmcError, cmcGet, type CmcGetOptions } from "./client";

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Extracts the offending id from messages like `Invalid value for "id": "39839"`. */
function invalidIdFrom(message: string): number | null {
  // Real messages use single quotes (Invalid value for 'id': '39318'); older write-ups showed double quotes.
  const m = /["']id["']\D*?(\d+)/.exec(message);
  return m ? Number(m[1]) : null;
}

/** v5 list-like responses: `{ rwa_assets: [...], total_size, has_more }` (older write-ups show a bare array). */
type RwaPage<T> = { rwa_assets?: T[]; total_size?: number; has_more?: boolean } | T[];
const rwaAssetsOf = <T,>(data: RwaPage<T> | undefined): T[] =>
  Array.isArray(data) ? data : (data?.rwa_assets ?? []);
const MAP_PAGE = 200;

export interface CmcEndpoints {
  /** Every RWA underlying (all pages). */
  rwaMap(): Promise<RawRwaMapEntry[]>;
  rwaAssetsList(limit: number): Promise<RawRwaAssetListEntry[]>;
  rwaQuotes(ids: number[]): Promise<RawRwaQuote[]>;
  rwaInfo(id: number): Promise<RawRwaInfo | null>;
  /** Registrant info for many assets, keyed by rwa_id (50 per call). */
  rwaInfoMany(ids: number[]): Promise<Record<string, RawRwaInfo>>;
  cryptoInfo(ids: number[]): Promise<{ byId: Record<string, RawCryptoInfo>; unresolved: number[] }>;
  cryptoQuotes(ids: number[]): Promise<Record<string, RawCryptoQuote>>;
  cryptoMarketPairs(id: number): Promise<RawMarketPair[] | null>;
  keyInfo(): Promise<unknown>;
  /** Credits reported by CMC for every call made through this instance. */
  creditsUsed(): number;
}

export interface EndpointsOptions extends CmcGetOptions {
  /** Minimum delay between two calls (scripts use this to stay under the per-minute limit). */
  minIntervalMs?: number;
}

export function createEndpoints(opts: EndpointsOptions): CmcEndpoints {
  let credits = 0;
  let lastCallAt = 0;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const get = async <T>(path: string, params: Record<string, string | number> = {}) => {
    if (opts.minIntervalMs && lastCallAt > 0) {
      const wait = lastCallAt + opts.minIntervalMs - Date.now();
      if (wait > 0) await sleep(wait);
    }
    lastCallAt = Date.now();
    const res = await cmcGet<T>(path, params, opts);
    credits += res.creditCount;
    return res.data;
  };

  async function cryptoInfoBatch(ids: number[], unresolved: number[]): Promise<Record<string, RawCryptoInfo>> {
    let remaining = [...ids];
    while (remaining.length > 0) {
      try {
        return await get<Record<string, RawCryptoInfo>>("/v2/cryptocurrency/info", { id: remaining.join(",") });
      } catch (e) {
        const bad = e instanceof CmcError && e.kind === "bad_request" ? invalidIdFrom(e.message) : null;
        if (bad === null || !remaining.includes(bad)) throw e;
        unresolved.push(bad);
        remaining = remaining.filter((id) => id !== bad);
      }
    }
    return {};
  }

  async function rwaInfoMany(ids: number[]): Promise<Record<string, RawRwaInfo>> {
    const out: Record<string, RawRwaInfo> = {};
    for (const part of chunk(ids, 50)) {
      const data = await get<RwaPage<RawRwaInfo>>("/v5/real-world-assets/info", { rwa_id: part.join(",") });
      for (const info of rwaAssetsOf(data)) if (info.rwa_id !== undefined) out[String(info.rwa_id)] = info;
    }
    return out;
  }

  return {
    async rwaMap() {
      // Paginated: at most 200 per page (larger limits answer 4001), 0 credits per page.
      const out: RawRwaMapEntry[] = [];
      for (let start = 1; ; start += MAP_PAGE) {
        const page = await get<RwaPage<RawRwaMapEntry>>("/v5/real-world-assets/map", { start, limit: MAP_PAGE });
        const items = rwaAssetsOf(page);
        out.push(...items);
        if (!(page as { has_more?: boolean } | undefined)?.has_more || items.length === 0) return out;
      }
    },

    rwaAssetsList: async (limit) =>
      rwaAssetsOf(await get<RwaPage<RawRwaAssetListEntry>>("/v5/real-world-assets/assets/list", { limit })),

    async rwaQuotes(ids) {
      const out: RawRwaQuote[] = [];
      for (const part of chunk(ids, 50)) {
        const data = await get<RwaPage<RawRwaQuote>>("/v5/real-world-assets/quotes/latest", {
          rwa_id: part.join(","),
          convert: "USD",
        });
        out.push(...rwaAssetsOf(data));
      }
      return out;
    },

    async rwaInfo(id) {
      return (await rwaInfoMany([id]))[String(id)] ?? null;
    },

    rwaInfoMany,

    async cryptoInfo(ids) {
      const unresolved: number[] = [];
      const byId: Record<string, RawCryptoInfo> = {};
      for (const part of chunk(ids, 100)) Object.assign(byId, await cryptoInfoBatch(part, unresolved));
      return { byId, unresolved };
    },

    async cryptoQuotes(ids) {
      const out: Record<string, RawCryptoQuote> = {};
      for (const part of chunk(ids, 100)) {
        Object.assign(
          out,
          await get<Record<string, RawCryptoQuote>>("/v2/cryptocurrency/quotes/latest", {
            id: part.join(","),
            convert: "USD",
            skip_invalid: "true",
          }),
        );
      }
      return out;
    },

    async cryptoMarketPairs(id) {
      try {
        const data = await get<{ market_pairs?: RawMarketPair[] }>("/v2/cryptocurrency/market-pairs/latest", {
          id,
          limit: 50,
          convert: "USD",
        });
        return data?.market_pairs ?? [];
      } catch (e) {
        if (e instanceof CmcError && (e.kind === "plan" || e.kind === "method" || e.kind === "not_found")) return null;
        throw e;
      }
    },

    keyInfo: () => get<unknown>("/v1/key/info"),

    creditsUsed: () => credits,
  };
}
