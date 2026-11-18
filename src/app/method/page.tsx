import type { Metadata } from "next";
import { LabelBadge } from "@/components/LabelBadge";
import { formatCompactUsd } from "@/lib/format";
import { SCORE_CONFIG as C } from "@/lib/score/config";

export const metadata: Metadata = {
  title: "Method — WrapScout",
  description: "How WrapScout ranks tokenized versions of a real-world asset, and which CoinMarketCap endpoints it uses.",
};

const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;

const ENDPOINTS: [string, string][] = [
  ["/v5/real-world-assets/map", "Search index: every underlying asset, its type and whether it has tokens"],
  ["/v5/real-world-assets/assets/list", "Popular assets, by tokenized market cap"],
  ["/v5/real-world-assets/quotes/latest", "Consensus tokenized price and every wrapper (issuer, price, volume)"],
  ["/v5/real-world-assets/info", "Registrant metadata: industry, SEC CIK"],
  ["/v2/cryptocurrency/info", "Each wrapper's chain, contract address and block explorer"],
  ["/v2/cryptocurrency/quotes/latest", "Each wrapper's number of markets and 24h volume"],
  ["/v2/cryptocurrency/market-pairs/latest", "Exchanges listing the top wrappers, when the plan allows it"],
];

export default function MethodPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 leading-relaxed">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">How the score works</h1>
        <p className="mt-2 text-muted">
          The ranking is deterministic and uses only CoinMarketCap data. No AI, no paid placement, no opinion about
          the underlying asset.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Filter out what you should not buy</h2>
        <ul className="space-y-2">
          <li className="flex flex-wrap items-center gap-2">
            <LabelBadge label="no_market" /> CoinMarketCap tracks no market for it (price is empty).
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <LabelBadge label="different_unit" /> Its price is more than {pct(C.unitTolerance)} away from the
            reference price — it almost certainly quotes another unit (e.g. one gram instead of one ounce), so
            comparing it would be meaningless. The reference is CoinMarketCap&apos;s consensus tokenized price when
            it agrees with the market, otherwise the volume-weighted median price of the versions.
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <LabelBadge label="too_thin" /> Less than {formatCompactUsd(C.volumeFloorUsd)} traded in 24 hours. A price
            nobody trades drifts and stays drifted.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Score the rest (0–100)</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Liquidity — {pct(C.weights.liquidity)}.</strong> 24h volume on a log scale between{" "}
            {formatCompactUsd(C.volumeFloorUsd)} and the most liquid version of the same asset.
          </li>
          <li>
            <strong>Price fidelity — {pct(C.weights.fidelity)}.</strong> Distance from the volume-weighted median
            price of the tradable versions; reaches zero at {pct(C.fidelityFullScale)}.
          </li>
          <li>
            <strong>Market reach — {pct(C.weights.breadth)}.</strong> Number of markets CoinMarketCap tracks for the
            version, full marks from {C.breadthFullScale}.
          </li>
        </ul>
        <pre className="overflow-x-auto rounded-lg bg-surface-2 p-3 text-sm">
          score = 100 × ({C.weights.liquidity} × liquidity + {C.weights.fidelity} × fidelity + {C.weights.breadth} ×
          reach)
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Label</h2>
        <ul className="space-y-2">
          <li className="flex flex-wrap items-center gap-2">
            <LabelBadge label="best" /> highest score (<LabelBadge label="only_option" /> when it is the only tradable
            version).
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <LabelBadge label="good" /> score of {C.goodThreshold} or more.
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <LabelBadge label="weak" /> tradable, but below {C.goodThreshold}.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">CoinMarketCap endpoints used</h2>
        <ul className="space-y-2 text-sm">
          {ENDPOINTS.map(([path, what]) => (
            <li key={path}>
              <code className="rounded bg-surface-2 px-1.5 py-0.5">{path}</code> — {what}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Limits</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>
            The consensus price is CoinMarketCap&apos;s average of the tokenized versions, not the stock-market price.
            WrapScout does not compare tokens with the underlying exchange.
          </li>
          <li>
            Availability by country (US persons, KYC) comes from a short hand-written issuer list, not from
            CoinMarketCap, and may be outdated. It never changes the score.
          </li>
          <li>
            Live data is cached for about two minutes. If CoinMarketCap is unreachable, a dated snapshot is shown with
            a banner.
          </li>
          <li>Not financial advice.</li>
        </ul>
      </section>
    </article>
  );
}
