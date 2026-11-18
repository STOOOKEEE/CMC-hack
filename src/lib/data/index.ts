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
}

/** Spec §7.4: live calls that take longer than this fall back to the snapshot. */
export const LIVE_TIMEOUT_MS = 8_000;

export function defaultConfig(): SourceConfig {
  return {
    apiKey: process.env.CMC_API_KEY,
    snapshotDir: path.join(process.cwd(), "data", "snapshot"),
    demoDir: path.join(process.cwd(), "fixtures", "demo-snapshot"),
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
  const snapshot = SnapshotSource.exists(cfg.snapshotDir) ? snapshotSource(cfg.snapshotDir, "snapshot") : null;
  if (cfg.apiKey) {
    if (liveSingleton?.key !== cfg.apiKey) {
      liveSingleton = { key: cfg.apiKey, source: new LiveSource(createEndpoints({ apiKey: cfg.apiKey })) };
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

async function withFallback<T>(
  sources: Sources,
  fn: (s: DataSource) => Promise<T>,
  timeoutMs: number,
): Promise<{ value: T; source: DataSource }> {
  try {
    return { value: await withTimeout(fn(sources.primary), timeoutMs), source: sources.primary };
  } catch (e) {
    if (!sources.fallback) throw e;
    console.warn(`[wrapscout] ${sources.primary.mode} source failed, using ${sources.fallback.mode}:`, (e as Error).message);
    return { value: await fn(sources.fallback), source: sources.fallback };
  }
}

export interface ViewOptions {
  sources?: Sources;
  timeoutMs?: number;
}

export async function getAssetView(symbol: string, opts: ViewOptions = {}): Promise<AssetView | null> {
  const sources = opts.sources ?? getSources();
  const timeoutMs = opts.timeoutMs ?? LIVE_TIMEOUT_MS;
  const { value: index } = await withFallback(sources, (s) => s.searchIndex(), timeoutMs);
  const entry = resolveSymbol(index, symbol);
  if (!entry) return null;

  const { value: bundle, source } = await withFallback(sources, (s) => s.assetBundle(entry.rwaId), timeoutMs);
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
  const sources = opts.sources ?? getSources();
  const { value, source } = await withFallback(sources, (s) => s.searchIndex(), opts.timeoutMs ?? LIVE_TIMEOUT_MS);
  return { entries: value, dataMode: source.mode, asOf: await source.asOf() };
}

export async function getPopular(limit: number, opts: ViewOptions = {}): Promise<Listing<PopularEntry>> {
  const sources = opts.sources ?? getSources();
  const { value, source } = await withFallback(sources, (s) => s.popular(limit), opts.timeoutMs ?? LIVE_TIMEOUT_MS);
  return { entries: value, dataMode: source.mode, asOf: await source.asOf() };
}
