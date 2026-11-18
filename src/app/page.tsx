import { DataBanner } from "@/components/DataBanner";
import { PopularGrid } from "@/components/PopularGrid";
import { SearchBox } from "@/components/SearchBox";
import { getPopular, type Listing } from "@/lib/data";
import type { PopularEntry } from "@/lib/model";

export const dynamic = "force-dynamic";

export default async function Home() {
  let popular: Listing<PopularEntry> | null = null;
  try {
    popular = await getPopular(12);
  } catch (e) {
    console.error("[wrapscout] popular assets unavailable:", (e as Error).message);
  }

  return (
    <div className="space-y-10">
      {popular ? <DataBanner dataMode={popular.dataMode} asOf={popular.asOf} /> : null}
      <section className="mx-auto max-w-2xl pt-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Which token should I buy to own…</h1>
        <p className="mt-3 text-muted">
          Stocks, ETFs and commodities exist in several tokenized versions. WrapScout ranks them by liquidity, price
          fidelity and market reach, and tells you what is wrong with the others.
        </p>
        <div className="mt-6 text-left">
          <SearchBox autoFocus />
        </div>
      </section>
      {popular ? (
        <PopularGrid entries={popular.entries} />
      ) : (
        <p className="text-center text-sm text-muted">Popular assets are temporarily unavailable — search still works.</p>
      )}
    </div>
  );
}
