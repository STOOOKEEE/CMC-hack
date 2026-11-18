import type { DataMode } from "@/lib/model";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

/** Tells the reader where the numbers come from whenever they are not live. */
export function DataBanner({ dataMode, asOf }: { dataMode: DataMode; asOf: string | null }) {
  if (dataMode === "live") return null;
  const demo = dataMode === "demo";
  return (
    <div
      role="status"
      className="mb-6 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-fg"
      data-testid="data-banner"
    >
      {demo ? (
        <>
          <strong>Demo data.</strong> No CoinMarketCap API key is configured, so this page shows synthetic
          example values — not real prices.
        </>
      ) : (
        <>
          <strong>Live data unavailable.</strong> Showing the saved snapshot
          {asOf ? <> from {formatDate(asOf)}</> : null}.
        </>
      )}
    </div>
  );
}

/** When the numbers were fetched (live) or produced (snapshot / demo). */
export function Freshness({ dataMode, asOf }: { dataMode: DataMode; asOf: string }) {
  return <span>{dataMode === "live" ? "Live data fetched" : "Data as of"} {formatDate(asOf)}</span>;
}
