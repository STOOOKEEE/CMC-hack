"use client";

import { useMemo, useState } from "react";
import { formatCompactUsd, formatPct, formatPrice } from "@/lib/format";
import type { ScoredWrapper } from "@/lib/model";
import { LabelBadge } from "./LabelBadge";

const ELIGIBLE = new Set(["best", "only_option", "good", "weak"]);

/** All versions, with the "How do you buy?" chain filter (spec §2 secondary goal). */
export function WrapperTable({ wrappers }: { wrappers: ScoredWrapper[] }) {
  const chains = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of wrappers) if (w.chain) counts.set(w.chain, (counts.get(w.chain) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [wrappers]);
  const [chain, setChain] = useState<string | null>(null);

  const rows = chain ? wrappers.filter((w) => w.chain === chain) : wrappers;
  const bestInFilter = chain ? rows.find((w) => ELIGIBLE.has(w.label)) : undefined;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">How do you buy?</span>
        {[null, ...chains].map((c) => (
          <button
            key={c ?? "any"}
            type="button"
            onClick={() => setChain(c)}
            aria-pressed={chain === c}
            className={`min-h-11 rounded-full border px-3 sm:min-h-8 ${
              chain === c ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface hover:bg-surface-2"
            }`}
          >
            {c ?? "Any"}
          </button>
        ))}
      </div>
      {chain ? (
        <p className="text-sm" data-testid="best-in-filter">
          {bestInFilter ? (
            <>
              Best on {chain}: <strong>{bestInFilter.symbol}</strong> ({bestInFilter.issuerName ?? "unknown issuer"},
              score {bestInFilter.score}/100)
            </>
          ) : (
            <>No recommendable version on {chain}.</>
          )}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Token</th>
              <th className="px-3 py-2 font-medium">Issuer</th>
              <th className="px-3 py-2 font-medium">Chain</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 text-right font-medium">vs consensus</th>
              <th className="px-3 py-2 text-right font-medium">24h volume</th>
              <th className="px-3 py-2 text-right font-medium">Markets</th>
              <th className="px-3 py-2 text-right font-medium">Score</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.cryptoId} className="border-t border-border align-top">
                <td className="px-3 py-2">
                  <div className="font-medium">{w.symbol}</div>
                  <div className="text-xs text-muted">{w.name}</div>
                  {w.warnings.map((warning) => (
                    <div key={warning} className="mt-1 max-w-xs text-xs text-warn">
                      ⚠ {warning}
                    </div>
                  ))}
                </td>
                <td className="px-3 py-2">{w.issuerName ?? "—"}</td>
                <td className="px-3 py-2">{w.chain ?? "Unknown"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{w.price !== null ? formatPrice(w.price) : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {w.deviationFromConsensus !== null ? formatPct(w.deviationFromConsensus) : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {w.volume24h !== null ? formatCompactUsd(w.volume24h) : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{w.numMarketPairs ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{w.score ?? "—"}</td>
                <td className="px-3 py-2">
                  <LabelBadge label={w.label} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
