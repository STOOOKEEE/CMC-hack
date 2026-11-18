import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BestPickCard } from "@/components/BestPickCard";
import { DataBanner, Freshness } from "@/components/DataBanner";
import { WrapperTable } from "@/components/WrapperTable";
import { getAssetView } from "@/lib/data";
import { assetTypeLabel, formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/a/[symbol]">): Promise<Metadata> {
  const { symbol } = await props.params;
  const ticker = decodeURIComponent(symbol).toUpperCase();
  return {
    title: `${ticker}: which tokenized version should I buy? — WrapScout`,
    description: `Every tokenized version of ${ticker}, ranked by liquidity, price fidelity and market reach.`,
  };
}

export default async function AssetPage(props: PageProps<"/a/[symbol]">) {
  const { symbol } = await props.params;
  const view = await getAssetView(decodeURIComponent(symbol));
  if (!view) notFound();

  const { header, ranked } = view;
  const total = ranked.wrappers.length;
  const tradable = ranked.wrappers.filter((w) => w.price !== null).length;

  return (
    <div className="space-y-6">
      <DataBanner dataMode={view.dataMode} asOf={view.asOf} />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {header.name} <span className="text-muted">({header.symbol})</span>
        </h1>
        <p className="mt-1 flex flex-wrap gap-x-2 text-sm text-muted">
          <span>{assetTypeLabel(header.assetType)}</span>
          {header.industry ? <span>· {header.industry}</span> : null}
          {header.secCik ? (
            <span>
              ·{" "}
              <a
                className="text-accent hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(header.secCik)}`}
              >
                SEC CIK {header.secCik} ↗
              </a>
            </span>
          ) : null}
        </p>
        <p className="mt-2 text-sm">
          {header.consensusPrice !== null ? (
            <>
              Consensus tokenized price <strong>{formatPrice(header.consensusPrice)}</strong> ·{" "}
            </>
          ) : null}
          <strong>
            {tradable} of {total}
          </strong>{" "}
          versions have a price
        </p>
      </header>

      <BestPickCard ranked={ranked} />

      {ranked.summaryWarnings.length > 0 ? (
        <ul className="space-y-1 text-sm" data-testid="summary-warnings">
          {ranked.summaryWarnings.map((w) => (
            <li key={w} className="flex gap-2">
              <span className="text-warn" aria-hidden>
                ⚠
              </span>
              {w}
            </li>
          ))}
        </ul>
      ) : null}

      <div>
        <h2 className="mb-3 text-lg font-semibold">All versions</h2>
        <WrapperTable wrappers={ranked.wrappers} />
      </div>

      <p className="text-xs text-muted">
        <Freshness dataMode={view.dataMode} asOf={view.asOf} /> · Not financial advice ·{" "}
        <Link href="/method" className="text-accent hover:underline">
          How the score works
        </Link>
      </p>
    </div>
  );
}
