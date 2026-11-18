"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchBox } from "@/components/SearchBox";
import type { SearchEntry } from "@/lib/model";
import { searchAssets } from "@/lib/search";

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export default function AssetNotFound() {
  const pathname = usePathname();
  const query = safeDecode(pathname.split("/").pop() ?? "");
  const [suggestions, setSuggestions] = useState<SearchEntry[]>([]);

  useEffect(() => {
    fetch("/api/search-index")
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then(({ entries }: { entries: SearchEntry[] }) => {
        const close = searchAssets(entries, query.slice(0, 2), 5);
        const fallback = [...entries].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9)).slice(0, 5);
        setSuggestions(close.length > 0 ? close : fallback);
      })
      .catch(() => setSuggestions([]));
  }, [query]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-6">
      <h1 className="text-2xl font-semibold">No tokenized asset found for “{query.toUpperCase()}”</h1>
      <p className="text-muted">
        WrapScout only knows assets that CoinMarketCap lists with at least one tokenized version.
      </p>
      <SearchBox initialQuery="" />
      {suggestions.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted">Try</h2>
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <li key={s.rwaId}>
                <Link
                  href={`/a/${encodeURIComponent(s.symbol.toLowerCase())}`}
                  className="inline-block min-h-11 content-center rounded-full border border-border bg-surface px-3 hover:border-accent"
                >
                  {s.symbol} <span className="text-muted">{s.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
