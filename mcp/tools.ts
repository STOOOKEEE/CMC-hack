import { getAssetView, getSearchIndex, type ViewOptions } from "../src/lib/data";
import { formatCompactUsd, formatPct, formatPrice } from "../src/lib/format";
import { issuerNote } from "../src/lib/issuers";
import type { AssetView, DataMode, Label, SearchEntry, ScoredWrapper } from "../src/lib/model";
import { searchAssets } from "../src/lib/search";

export interface ToolResult<T> {
  text: string;
  data: T;
}

const LABELS: Record<Label, string> = {
  best: "Best pick",
  only_option: "Only option",
  good: "Good alternative",
  weak: "Weak",
  too_thin: "Too thin",
  different_unit: "Different unit",
  no_market: "No market",
};

function sourceLine(mode: DataMode, asOf: string): string {
  const when = `${asOf.slice(0, 10)} ${asOf.slice(11, 16)} UTC`;
  if (mode === "live") return `Source: live CoinMarketCap data, fetched ${when}.`;
  if (mode === "snapshot") return `Source: CoinMarketCap snapshot from ${when}.`;
  return "Source: Demo data (synthetic values — no CoinMarketCap API key configured).";
}

function priceLine(w: ScoredWrapper): string {
  const parts = [
    w.price !== null ? formatPrice(w.price) : "no price",
    w.deviationFromConsensus !== null ? `${formatPct(w.deviationFromConsensus)} vs reference` : null,
    w.volume24h !== null ? `${formatCompactUsd(w.volume24h)} 24h volume` : null,
    w.numMarketPairs !== null ? `${w.numMarketPairs} markets` : null,
  ];
  return parts.filter(Boolean).join(", ");
}

function whereLine(w: ScoredWrapper): string {
  const venues = w.exchanges.length > 0 ? `Exchanges: ${w.exchanges.join(", ")}. ` : "";
  const chain = `Chain: ${w.chain ?? "unknown"}${w.contract ? `, contract ${w.contract}` : ""}`;
  const explorer = w.explorerUrl ? ` (${w.explorerUrl})` : "";
  return `${venues}${chain}${explorer}.`;
}

export async function searchTool(query: string, opts: ViewOptions = {}): Promise<ToolResult<SearchEntry[]>> {
  const { entries } = await getSearchIndex(opts);
  const hits = searchAssets(entries, query, 10);
  const text =
    hits.length === 0
      ? `No tokenized asset matches "${query}".`
      : hits.map((h) => `${h.symbol} — ${h.name} (${h.assetType})`).join("\n");
  return { text, data: hits };
}

export async function bestVersionTool(symbol: string, opts: ViewOptions = {}): Promise<ToolResult<AssetView["ranked"] | null>> {
  const view = await getAssetView(symbol, opts);
  if (!view) return { text: `No tokenized asset found for "${symbol}". Try search_tokenized_assets first.`, data: null };

  const { header, ranked } = view;
  const priced = ranked.wrappers.filter((w) => w.price !== null).length;
  const lines = [
    `${header.name} (${header.symbol}) — ${ranked.wrappers.length} tokenized versions, ${priced} with a price.`,
  ];
  const best = ranked.best;
  if (!best) {
    lines.push("No tradable version right now: no version has a tracked market with enough volume and a consistent price.");
  } else {
    lines.push(
      `${LABELS[best.label]}: ${best.symbol} (${best.issuerName ?? "unknown issuer"}, ${best.chain ?? "unknown chain"}) — score ${best.score}/100, ${priceLine(best)}.`,
    );
    lines.push("Why:", ...best.reasons.map((r) => `- ${r}`));
    lines.push(`Where to buy: ${whereLine(best)}`);
    const issuer = issuerNote(best.issuerName);
    if (issuer?.note) lines.push(`Issuer note (hand-curated, may be outdated): ${issuer.note}`);
  }
  if (ranked.summaryWarnings.length > 0) lines.push("Watch out:", ...ranked.summaryWarnings.map((w) => `- ${w}`));
  lines.push(sourceLine(view.dataMode, view.asOf), "Not financial advice.");
  return { text: lines.join("\n"), data: ranked };
}

export async function compareTool(symbol: string, opts: ViewOptions = {}): Promise<ToolResult<AssetView["ranked"] | null>> {
  const view = await getAssetView(symbol, opts);
  if (!view) return { text: `No tokenized asset found for "${symbol}".`, data: null };
  const rows = view.ranked.wrappers.map(
    (w) =>
      `- ${w.symbol} | ${w.issuerName ?? "?"} | ${w.chain ?? "?"} | ${LABELS[w.label]}${w.score !== null ? ` ${w.score}/100` : ""} | ${priceLine(w)}${w.warnings.length ? ` | ⚠ ${w.warnings.join("; ")}` : ""}`,
  );
  const text = [
    `${view.header.name} (${view.header.symbol}) — all tokenized versions, best first:`,
    ...rows,
    sourceLine(view.dataMode, view.asOf),
    "Not financial advice.",
  ].join("\n");
  return { text, data: view.ranked };
}
