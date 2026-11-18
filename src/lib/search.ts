import type { SearchEntry } from "./model";

const rankOf = (e: SearchEntry) => e.rank ?? Number.POSITIVE_INFINITY;

/** Exact symbol first, then symbol prefix, then name substring; ties broken by CMC rank. */
export function searchAssets(index: SearchEntry[], query: string, limit = 8): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { entry: SearchEntry; group: number }[] = [];
  for (const entry of index) {
    const symbol = entry.symbol.toLowerCase();
    const group = symbol === q ? 0 : symbol.startsWith(q) ? 1 : entry.name.toLowerCase().includes(q) ? 2 : -1;
    if (group >= 0) scored.push({ entry, group });
  }
  return scored
    .sort((a, b) => a.group - b.group || rankOf(a.entry) - rankOf(b.entry))
    .slice(0, limit)
    .map((s) => s.entry);
}

/** Case-insensitive exact symbol lookup; the best-ranked entry wins when a symbol is shared. */
export function resolveSymbol(index: SearchEntry[], symbol: string): SearchEntry | null {
  const s = symbol.trim().toLowerCase();
  const matches = index.filter((e) => e.symbol.toLowerCase() === s);
  if (matches.length === 0) return null;
  return matches.reduce((best, e) => (rankOf(e) < rankOf(best) ? e : best));
}
