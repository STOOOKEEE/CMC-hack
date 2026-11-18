import { formatCompactUsd, formatPct, formatPrice } from "@/lib/format";
import type { RankedAsset } from "@/lib/model";
import { LabelBadge } from "./LabelBadge";
import { WhereToBuy } from "./WhereToBuy";

export function BestPickCard({ ranked }: { ranked: RankedAsset }) {
  const best = ranked.best;
  if (!best) {
    return (
      <section className="rounded-xl border border-border bg-surface p-5" data-testid="no-best-pick">
        <h2 className="text-lg font-semibold">No tradable version right now</h2>
        <p className="mt-2 text-sm text-muted">
          This asset is tokenized, but none of its versions has a market CoinMarketCap tracks with enough volume
          and a consistent price. The list below shows each version and what is wrong with it.
        </p>
      </section>
    );
  }
  return (
    <section className="rounded-xl border-2 border-good/50 bg-surface p-5" data-testid="best-pick">
      <div className="flex flex-wrap items-center gap-2">
        <LabelBadge label={best.label} />
        <h2 className="text-xl font-semibold">{best.symbol}</h2>
        <span className="text-sm text-muted">
          {best.issuerName ?? "Unknown issuer"} · {best.chain ?? "Unknown chain"}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">{best.name}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted">Price</dt>
          <dd className="font-medium">{best.price !== null ? formatPrice(best.price) : "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">vs consensus</dt>
          <dd className="font-medium">
            {best.deviationFromConsensus !== null ? formatPct(best.deviationFromConsensus) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">24h volume</dt>
          <dd className="font-medium">{best.volume24h !== null ? formatCompactUsd(best.volume24h) : "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Score</dt>
          <dd className="font-medium">{best.score}/100</dd>
        </div>
      </dl>
      <ul className="mt-4 space-y-1 text-sm">
        {best.reasons.map((r) => (
          <li key={r} className="flex gap-2">
            <span className="text-good" aria-hidden>
              ✓
            </span>
            {r}
          </li>
        ))}
        {best.warnings.map((w) => (
          <li key={w} className="flex gap-2">
            <span className="text-warn" aria-hidden>
              ⚠
            </span>
            {w}
          </li>
        ))}
      </ul>
      <div className="mt-5 border-t border-border pt-4">
        <WhereToBuy wrapper={best} />
      </div>
    </section>
  );
}
