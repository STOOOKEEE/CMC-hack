import type { AssetHeader, Label, RankedAsset, ScoredWrapper, Wrapper } from "../model";
import { SCORE_CONFIG as C } from "./config";
import { reasonsFor, summaryWarnings, warningsFor } from "./reasons";

/** Value at which the cumulative weight (sorted by value) reaches half of the total. */
export function weightedMedian(points: { value: number; weight: number }[]): number {
  const sorted = [...points].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((s, p) => s + p.weight, 0);
  let cumulative = 0;
  for (const p of sorted) {
    cumulative += p.weight;
    if (cumulative >= total / 2) return p.value;
  }
  return sorted[sorted.length - 1].value;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const INELIGIBLE_ORDER: Label[] = ["different_unit", "too_thin", "derivative", "no_market"];

/** CMC lists perpetual-futures price feeds next to real tokens (issuer "NA (Derivatives)"). */
const isDerivativeFeed = (w: Wrapper) => /\bderivatives?\b/i.test(`${w.issuerName ?? ""} ${w.name}`);

function classify(w: Wrapper, ref: number | null): Label | "eligible" {
  if (isDerivativeFeed(w)) return "derivative";
  if (w.price === null) return "no_market";
  if (ref !== null && Math.abs(w.price / ref - 1) > C.unitTolerance) return "different_unit";
  if ((w.volume24h ?? 0) < C.volumeFloorUsd) return "too_thin";
  return "eligible";
}

/**
 * Price that defines "the" unit of the asset. A volume-weighted median of priced wrappers (plain median
 * if no volume is reported); CMC's consensus is preferred only when it agrees with it within the unit
 * tolerance — its exact definition is unverified and a plain average across units would be meaningless.
 */
function referencePrice(consensus: number | null, wrappers: Wrapper[]): number | null {
  const priced = wrappers.filter((w) => w.price !== null);
  const totalVolume = priced.reduce((s, w) => s + (w.volume24h ?? 0), 0);
  const market =
    priced.length === 0
      ? null
      : totalVolume > 0
        ? weightedMedian(priced.map((w) => ({ value: w.price as number, weight: w.volume24h ?? 0 })))
        : median(priced.map((w) => w.price as number));
  if (market === null) return consensus;
  if (consensus !== null && Math.abs(consensus / market - 1) <= C.unitTolerance) return consensus;
  return market;
}

export function rankAsset(header: AssetHeader, wrappers: Wrapper[]): RankedAsset {
  const ref = referencePrice(header.consensusPrice, wrappers);
  const deviationOf = (w: Wrapper) => (w.price !== null && ref ? w.price / ref - 1 : null);

  const classified = wrappers.map((w) => ({ w, cls: classify(w, ref) }));
  const eligible = classified.filter((c) => c.cls === "eligible").map((c) => c.w);

  const volumes = eligible.map((w) => w.volume24h ?? 0);
  const volMax = Math.max(0, ...volumes);
  const vwm =
    eligible.length > 0
      ? weightedMedian(eligible.map((w) => ({ value: w.price as number, weight: w.volume24h ?? 0 })))
      : null;
  const eligibleVolumesDesc = [...volumes].sort((a, b) => b - a);

  const scoreOf = (w: Wrapper): number => {
    const v = w.volume24h ?? 0;
    const L =
      eligible.length === 1 || volMax <= C.volumeFloorUsd
        ? 1
        : Math.log10(v / C.volumeFloorUsd) / Math.log10(volMax / C.volumeFloorUsd);
    const d = vwm ? Math.abs((w.price as number) / vwm - 1) : 0;
    const F = Math.max(0, 1 - d / C.fidelityFullScale);
    const B = Math.min(1, (w.numMarketPairs ?? 0) / C.breadthFullScale);
    const { liquidity, fidelity, breadth } = C.weights;
    return Math.round(100 * (liquidity * L + fidelity * F + breadth * B));
  };

  const ordered = eligible
    .map((w) => ({ w, score: scoreOf(w) }))
    .sort((a, b) => b.score - a.score || (b.w.volume24h ?? 0) - (a.w.volume24h ?? 0));
  // Exactly one "most liquid" version: the highest volume, ties going to the better-ranked one.
  let topVolumeId: number | null = null;
  let topVolume = -1;
  for (const { w } of ordered) {
    if ((w.volume24h ?? 0) > topVolume) {
      topVolume = w.volume24h ?? 0;
      topVolumeId = w.cryptoId;
    }
  }
  const assetType = header.assetType;

  const scored: ScoredWrapper[] = ordered.map(({ w, score }, i) => {
    const label: Label =
      i === 0 ? (eligible.length === 1 ? "only_option" : "best") : score >= C.goodThreshold ? "good" : "weak";
    const deviation = deviationOf(w);
    return {
      ...w,
      label,
      score,
      deviationFromConsensus: deviation,
      reasons: reasonsFor(w, deviation, { eligibleVolumesDesc, topVolumeId }),
      warnings: warningsFor(w, label, deviation, assetType),
    };
  });

  const ineligible: ScoredWrapper[] = INELIGIBLE_ORDER.flatMap((label) =>
    classified
      .filter((c) => c.cls === label)
      .map(({ w }) => {
        const deviation = deviationOf(w);
        return {
          ...w,
          label,
          score: null,
          deviationFromConsensus: deviation,
          reasons: [],
          warnings: warningsFor(w, label, deviation, assetType),
        };
      }),
  );

  const counts = Object.fromEntries(
    (["best", "only_option", "good", "weak", ...INELIGIBLE_ORDER] as Label[]).map((l) => [l, 0]),
  ) as Record<Label, number>;
  for (const w of [...scored, ...ineligible]) counts[w.label] += 1;

  return {
    wrappers: [...scored, ...ineligible],
    best: scored[0] ?? null,
    referencePrice: ref,
    eligibleCount: eligible.length,
    summaryWarnings: summaryWarnings(counts, eligible.length),
  };
}
