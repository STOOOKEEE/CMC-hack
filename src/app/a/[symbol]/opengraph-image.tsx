import { ImageResponse } from "next/og";
import { getAssetView } from "@/lib/data";

export const dynamic = "force-dynamic";
export const alt = "WrapScout — which tokenized version should I buy?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const view = await getAssetView(symbol).catch(() => null);
  const name = view?.header.name ?? symbol.toUpperCase();
  const best = view?.ranked.best;
  const answer = best
    ? `${best.symbol} · ${best.issuerName ?? "unknown issuer"} · ${best.chain ?? "unknown chain"}`
    : view
      ? "No tradable version right now"
      : "Compare every tokenized version";
  const count = view ? `${view.ranked.wrappers.length} versions compared` : "";
  const source = view?.dataMode === "demo" ? "DEMO DATA (synthetic)" : "Data: CoinMarketCap API";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0d1117",
          color: "#e8ecf1",
        }}
      >
        <div style={{ fontSize: 36, display: "flex" }}>
          <span>Wrap</span>
          <span style={{ color: "#7d9bff" }}>Scout</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 56, lineHeight: 1.15, display: "flex" }}>{`Which token should I buy to own ${name}?`}</div>
          <div style={{ fontSize: 44, color: "#3fcf8e", display: "flex" }}>{best ? `Best pick: ${answer}` : answer}</div>
        </div>
        <div style={{ fontSize: 28, color: "#97a1af", display: "flex" }}>
          {`${count ? `${count} · ` : ""}${source} · Not financial advice`}
        </div>
      </div>
    ),
    size,
  );
}
