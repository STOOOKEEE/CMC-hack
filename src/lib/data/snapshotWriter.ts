import fs from "node:fs";
import path from "node:path";
import { TtlCache } from "../cache";
import type { CmcEndpoints } from "../cmc/endpoints";
import type { AssetBundle } from "../model";
import { LiveSource, type SnapshotIndex } from "./source";

export interface WriteSnapshotOptions {
  generatedAt?: string;
  /** Fetch market pairs only for the N most popular assets (they cost one call per wrapper). */
  marketPairsTop?: number;
  onProgress?: (done: number, total: number) => void;
}

export interface WriteSnapshotResult {
  assets: number;
  /** Assets the API returned nothing for. */
  skipped: number[];
  /** Assets written with some parts missing even after one retry (see AssetBundle.degraded). */
  degraded: number[];
}

const BATCH = 50;
/** Everything fetched during a run stays cached for the whole run, however long it takes. */
const RUN_TTL_MS = 24 * 60 * 60_000;

/**
 * Writes every searchable asset to `dir` (index.json + assets/<rwaId>.json).
 * Assets are warmed and written batch by batch (one RWA quote call per 50 assets); assets that come back
 * degraded are retried once at the end. Everything is written to a temporary sibling directory and swapped
 * in only on success, so a failed run never leaves a half-written snapshot behind.
 */
export async function writeSnapshot(
  api: CmcEndpoints,
  dir: string,
  opts: WriteSnapshotOptions = {},
): Promise<WriteSnapshotResult> {
  const source = new LiveSource(api, { cache: new TtlCache(Number.POSITIVE_INFINITY), minTtlMs: RUN_TTL_MS });
  const tmp = `${dir}.tmp-${process.pid}-${Date.now()}`;
  try {
    const searchIndex = await source.searchIndex();
    const popular = await source.popular(50);
    const withPairs = new Set(popular.slice(0, opts.marketPairsTop ?? 50).map((p) => p.rwaId));
    fs.mkdirSync(path.join(tmp, "assets"), { recursive: true });

    const ids = searchIndex.map((e) => e.rwaId);
    const written = new Set<number>();
    const skipped: number[] = [];
    let degraded: number[] = [];
    const save = (id: number, bundle: AssetBundle) => {
      fs.writeFileSync(path.join(tmp, "assets", `${id}.json`), JSON.stringify(bundle));
      written.add(id);
    };

    let done = 0;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      await source.warm(batch);
      for (const id of batch) {
        const bundle = await source.assetBundle(id, { marketPairs: withPairs.has(id) });
        if (!bundle) skipped.push(id);
        else {
          save(id, bundle);
          if (bundle.degraded) degraded.push(id);
        }
        opts.onProgress?.(++done, ids.length);
      }
    }

    // Failed parts are never cached, so a second pass only re-fetches what is missing.
    const stillDegraded: number[] = [];
    for (const id of degraded) {
      const bundle = await source.assetBundle(id, { marketPairs: withPairs.has(id) });
      if (bundle) save(id, bundle);
      if (!bundle || bundle.degraded) stillDegraded.push(id);
    }
    degraded = stillDegraded;

    const index: SnapshotIndex = {
      generatedAt: opts.generatedAt ?? new Date().toISOString(),
      searchIndex: searchIndex.filter((e) => written.has(e.rwaId)),
      popular: popular.filter((e) => written.has(e.rwaId)),
    };
    fs.writeFileSync(path.join(tmp, "index.json"), JSON.stringify(index, null, 2));

    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    fs.renameSync(tmp, dir);
    return { assets: written.size, skipped, degraded };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
