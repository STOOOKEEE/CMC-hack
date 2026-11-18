import Link from "next/link";
import { assetTypeLabel, formatCompactUsd } from "@/lib/format";
import type { PopularEntry } from "@/lib/model";

export function PopularGrid({ entries }: { entries: PopularEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">Popular</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {entries.map((e) => (
          <li key={e.rwaId}>
            <Link
              href={`/a/${encodeURIComponent(e.symbol.toLowerCase())}`}
              className="block h-full rounded-xl border border-border bg-surface p-4 hover:border-accent"
            >
              <div className="font-semibold">{e.symbol}</div>
              <div className="truncate text-sm text-muted">{e.name}</div>
              <div className="mt-2 text-xs text-muted">
                <span>{assetTypeLabel(e.assetType)}</span>
                {e.tokenizedMarketCap !== null ? <> · {formatCompactUsd(e.tokenizedMarketCap)} tokenized</> : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
