import path from "node:path";
import { createEndpoints } from "../cmc/endpoints";
import type { AssetView, DataMode, PopularEntry, SearchEntry } from "../model";
import { normalizeAsset } from "../normalize";
import { rankAsset } from "../score/rank";
import { resolveSymbol } from "../search";
import { LiveSource, SnapshotSource, type DataSource } from "./source";

export interface Sources {
  primary: DataSource;
  /** Used when the primary errors or times out. Null means "show an error state". */
  fallback: DataSource | null;
}

export interface SourceConfig {
  apiKey: string | undefined;
  snapshotDir: string;
  demoDir: string;
  /** WRAPSCOUT_DATA=demo: always serve the synthetic demo snapshot (the e2e suite relies on it). */
  forceDemo?: boolean;
}

/** Spec §7.4: a view whose live calls take longer than this (in total) falls back to the snapshot. */
export const LIVE_TIMEOUT_MS = 8_000;
/** After a live failure, go straight to the snapshot for this long instead of paying the timeout again. */
export const LIVE_COOL_DOWN_MS = 2 * 60_000;

export function defaultConfig(): SourceConfig {
  return {
    apiKey: process.env.CMC_API_KEY,
    snapshotDir: path.join(process.cwd(), "data", "snapshot"),
    demoDir: path.join(process.cwd(), "fixtures", "demo-snapshot"),
    forceDemo: process.env.WRAPSCOUT_DATA === "demo",
  };
}

let liveSingleton: { key: string; source: LiveSource } | null = null;
const snapshotSingletons = new Map<string, SnapshotSource>();

function snapshotSource(dir: string, mode: "snapshot" | "demo"): SnapshotSource {
  const key = `${mode}:${dir}`;
  let s = snapshotSingletons.get(key);
  if (!s) {
    s = new SnapshotSource(dir, mode);
    snapshotSingletons.set(key, s);
  }
  return s;
}

/**
 * Key set → live CMC, falling back to the real snapshot if there is one.
 * No key → the real snapshot if present, otherwise the synthetic demo snapshot.
 */
export function getSources(cfg: SourceConfig = defaultConfig()): Sources {
  if (cfg.forceDemo) return { primary: snapshotSource(cfg.demoDir, "demo"), fallback: null };
  const snapshot = SnapshotSource.exists(cfg.snapshotDir) ? snapshotSource(cfg.snapshotDir, "snapshot") : null;
  if (cfg.apiKey) {
    if (liveSingleton?.key !== cfg.apiKey) {
      // In the request path: one quick retry at most, and no single HTTP call longer than 5 s.
      const api = createEndpoints({ apiKey: cfg.apiKey, retries: 1, requestTimeoutMs: 5_000 });
      liveSingleton = { key: cfg.apiKey, source: new LiveSource(api) };
    }
    return { primary: liveSingleton.source, fallback: snapshot };
  }
  return { primary: snapshot ?? snapshotSource(cfg.demoDir, "demo"), fallback: null };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Live data timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Circuit breaker: primary source → time until which it is skipped. */
const downUntil = new WeakMap<DataSource, number>();

interface CallContext {
  sources: Sources;
  /** Absolute deadline (ms since epoch) shared by every live call of one view. */
  deadline: number;
  coolDownMs: number;
}

async function withFallback<T>(ctx: CallContext, fn: (s: DataSource) => Promise<T>): Promise<{ value: T; source: DataSource }> {
  const { primary, fallback } = ctx.sources;
  if (fallback && (downUntil.get(primary) ?? 0) > Date.now()) {
    return { value: await fn(fallback), source: fallback };
  }
  try {
    const remaining = Math.max(0, ctx.deadline - Date.now());
    return { value: await withTimeout(fn(primary), remaining), source: primary };
  } catch (e) {
    if (!fallback) throw e;
    downUntil.set(primary, Date.now() + ctx.coolDownMs);
    console.warn(`[wrapscout] ${primary.mode} source failed, using ${fallback.mode} for a while:`, (e as Error).message);
    return { value: await fn(fallback), source: fallback };
  }
}

export interface ViewOptions {
  sources?: Sources;
  /** Total live-data budget for the call (default LIVE_TIMEOUT_MS). */
  timeoutMs?: number;
  /** How long to skip live after a failure when a snapshot exists (default LIVE_COOL_DOWN_MS). */
  coolDownMs?: number;
}

function context(opts: ViewOptions): CallContext {
  return {
    sources: opts.sources ?? getSources(),
    deadline: Date.now() + (opts.timeoutMs ?? LIVE_TIMEOUT_MS),
    coolDownMs: opts.coolDownMs ?? LIVE_COOL_DOWN_MS,
  };
}

export async function getAssetView(symbol: string, opts: ViewOptions = {}): Promise<AssetView | null> {
  const ctx = context(opts);
  const { value: index } = await withFallback(ctx, (s) => s.searchIndex());
  const entry = resolveSymbol(index, symbol);
  if (!entry) return null;

  const { value: bundle, source } = await withFallback(ctx, (s) => s.assetBundle(entry.rwaId));
  if (!bundle) return null;

  const { header, wrappers } = normalizeAsset(bundle);
  const asOf = source.mode === "live" ? bundle.fetchedAt : ((await source.asOf()) ?? bundle.fetchedAt);
  return { header, ranked: rankAsset(header, wrappers), dataMode: source.mode, asOf };
}

export interface Listing<T> {
  entries: T[];
  dataMode: DataMode;
  asOf: string | null;
}

export async function getSearchIndex(opts: ViewOptions = {}): Promise<Listing<SearchEntry>> {
  const { value, source } = await withFallback(context(opts), (s) => s.searchIndex());
  return { entries: value, dataMode: source.mode, asOf: await source.asOf() };
}

export async function getPopular(limit: number, opts: ViewOptions = {}): Promise<Listing<PopularEntry>> {
  const { value, source } = await withFallback(context(opts), (s) => s.popular(limit));
  return { entries: value, dataMode: source.mode, asOf: await source.asOf() };
}
