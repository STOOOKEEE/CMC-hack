import { formatCompactUsd, formatPct } from "../format";
import type { Label, Wrapper } from "../model";
import { SCORE_CONFIG } from "./config";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export interface ReasonContext {
  /** Volumes of all eligible wrappers, highest first. */
  eligibleVolumesDesc: number[];
  /** The single wrapper called "most liquid" (first by volume after ranking). */
  topVolumeId: number | null;
}

/** Positive reasons shown for an eligible wrapper (the Best pick card shows them all). */
export function reasonsFor(
  wrapper: Wrapper,
  deviation: number | null,
  ctx: ReasonContext,
): string[] {
  const reasons: string[] = [];
  const volume = wrapper.volume24h ?? 0;
  const [top, next] = ctx.eligibleVolumesDesc;
  if (wrapper.cryptoId === ctx.topVolumeId && volume === top && ctx.eligibleVolumesDesc.length > 1) {
    const ratio = next > 0 ? volume / next : Infinity;
    reasons.push(
      ratio >= 1.5 && Number.isFinite(ratio)
        ? `Most liquid version: ${formatCompactUsd(volume)} traded in 24h (${Math.round(ratio)}× the next one)`
        : `Most liquid version: ${formatCompactUsd(volume)} traded in 24h`,
    );
  } else {
    reasons.push(`${formatCompactUsd(volume)} traded in 24h`);
  }
  if (deviation !== null && Math.abs(deviation) <= SCORE_CONFIG.inLineTolerance) {
    reasons.push(`Price in line with the other versions (${formatPct(deviation)})`);
  }
  const pairs = wrapper.numMarketPairs ?? 0;
  if (pairs > 0) reasons.push(`Listed on ${pairs} ${plural(pairs, "market", "markets")}`);
  return reasons;
}

/** Warnings for a single wrapper, by label. */
export function warningsFor(
  wrapper: Wrapper,
  label: Label,
  deviation: number | null,
  assetType = "unknown",
): string[] {
  switch (label) {
    case "derivative":
      return ["Derivatives price feed (futures markets), not a token you can hold"];
    case "no_market":
      return ["No tracked market — listed, but not trading on any venue CMC tracks"];
    case "different_unit": {
      const gap = deviation === null ? "far" : formatPct(deviation);
      return [
        assetType === "commodity"
          ? `Price is ${gap} away from the reference — probably quoted in a different unit (e.g. per gram instead of per ounce)`
          : `Price is ${gap} away from the reference — probably a different share ratio, or a stale price`,
      ];
    }
    case "too_thin":
      return wrapper.volume24h
        ? [`Only ${formatCompactUsd(wrapper.volume24h)} traded in 24h — price may be stale`]
        : ["No volume reported in 24h — price may be stale"];
    default:
      if (deviation !== null && Math.abs(deviation) > SCORE_CONFIG.inLineTolerance) {
        return [`Trades ${formatPct(deviation)} vs the reference price`];
      }
      return [];
  }
}

/** Asset-level warnings summarising the whole list. */
export function summaryWarnings(counts: Record<Label, number>, eligibleCount: number): string[] {
  const out: string[] = [];
  if (eligibleCount === 0) out.push("No tradable version right now");
  if (eligibleCount === 1) out.push("Only one tradable version");
  const noMarket = counts.no_market;
  if (noMarket > 0) out.push(`${noMarket} ${plural(noMarket, "version has", "versions have")} no market`);
  const thin = counts.too_thin;
  if (thin > 0)
    out.push(
      `${thin} ${plural(thin, "version trades", "versions trade")} under ${formatCompactUsd(SCORE_CONFIG.volumeFloorUsd)}/day`,
    );
  const derivatives = counts.derivative;
  if (derivatives > 0)
    out.push(
      `${derivatives} ${plural(derivatives, "version is a derivatives price feed", "versions are derivatives price feeds")}, not a token`,
    );
  const unit = counts.different_unit;
  if (unit > 0)
    out.push(`${unit} ${plural(unit, "version is", "versions are")} quoted in a different unit`);
  return out;
}
