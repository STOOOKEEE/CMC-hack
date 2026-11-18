import fs from "node:fs";
import path from "node:path";
import type { LiveSource, SnapshotIndex } from "./source";

export interface WriteSnapshotOptions {
  generatedAt?: string;
  /** Fetch market pairs only for the N most popular assets (they cost one call per wrapper). */
  marketPairsTop?: number;
  onProgress?: (done: number, total: number) => void;
}

/**
 * Writes every searchable asset to `dir` (index.json + assets/<rwaId>.json).
 * Writes into a temporary sibling directory first and swaps it in at the end,
 * so a failed run never leaves a half-written snapshot in place.
 */
export async function writeSnapshot(
  source: LiveSource,
  dir: string,
  opts: WriteSnapshotOptions = {},
): Promise<{ assets: number; skipped: number[] }> {
  const searchIndex = await source.searchIndex();
  const popular = await source.popular(50);
  const withPairs = new Set(popular.slice(0, opts.marketPairsTop ?? 50).map((p) => p.rwaId));

  const tmp = `${dir}.tmp-${process.pid}-${Date.now()}`;
  fs.mkdirSync(path.join(tmp, "assets"), { recursive: true });

  const ids = searchIndex.map((e) => e.rwaId);
  for (let i = 0; i < ids.length; i += 50) await source.warm(ids.slice(i, i + 50));

  const written = new Set<number>();
  const skipped: number[] = [];
  for (const [i, id] of ids.entries()) {
    const bundle = await source.assetBundle(id, { marketPairs: withPairs.has(id) });
    if (bundle) {
      fs.writeFileSync(path.join(tmp, "assets", `${id}.json`), JSON.stringify(bundle));
      written.add(id);
    } else {
      skipped.push(id);
    }
    opts.onProgress?.(i + 1, ids.length);
  }

  const index: SnapshotIndex = {
    generatedAt: opts.generatedAt ?? new Date().toISOString(),
    searchIndex: searchIndex.filter((e) => written.has(e.rwaId)),
    popular: popular.filter((e) => written.has(e.rwaId)),
  };
  fs.writeFileSync(path.join(tmp, "index.json"), JSON.stringify(index, null, 2));

  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  fs.renameSync(tmp, dir);
  return { assets: written.size, skipped };
}
