"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SearchEntry } from "@/lib/model";
import { assetTypeLabel } from "@/lib/format";
import { searchAssets } from "@/lib/search";

export const assetHref = (symbol: string) => `/a/${encodeURIComponent(symbol.toLowerCase())}`;

let indexPromise: Promise<SearchEntry[]> | null = null;
function loadIndex(): Promise<SearchEntry[]> {
  indexPromise ??= fetch("/api/search-index")
    .then((r) => (r.ok ? r.json() : { entries: [] }))
    .then((d: { entries: SearchEntry[] }) => d.entries)
    .catch(() => {
      indexPromise = null;
      return [];
    });
  return indexPromise;
}

export function SearchBox({ autoFocus = false, initialQuery = "" }: { autoFocus?: boolean; initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadIndex().then(setIndex);
  }, []);

  const results = index ? searchAssets(index, query, 8) : [];
  const go = (symbol: string) => router.push(assetHref(symbol));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pick = results[active] ?? results[0];
    if (pick) go(pick.symbol);
    else if (query.trim()) go(query.trim());
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    }
  }

  return (
    <form onSubmit={onSubmit} role="search" className="relative w-full">
      <label htmlFor="asset-search" className="sr-only">
        Search a stock, ETF or commodity
      </label>
      <input
        id="asset-search"
        ref={inputRef}
        autoFocus={autoFocus}
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        placeholder="Nvidia, TSLA, gold…"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls="asset-search-results"
        className="h-12 w-full rounded-xl border border-border bg-surface px-4 shadow-sm outline-none focus:border-accent"
      />
      {results.length > 0 ? (
        <ul
          id="asset-search-results"
          role="listbox"
          className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        >
          {results.map((r, i) => (
            <li key={r.rwaId} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r.symbol)}
                className={`flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left ${
                  i === active ? "bg-surface-2" : ""
                }`}
              >
                <span>
                  <span className="font-medium">{r.symbol}</span> <span className="text-muted">{r.name}</span>
                </span>
                <span className="text-xs text-muted">{assetTypeLabel(r.assetType)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
