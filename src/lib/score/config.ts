/** Scoring thresholds — spec §6.3. Any change must also be reflected on the /method page. */
export const SCORE_CONFIG = {
  /** 24h USD volume under which a wrapper is "too thin" to recommend. */
  volumeFloorUsd: 10_000,
  /** Relative distance from the consensus price beyond which a wrapper is assumed to quote another unit. */
  unitTolerance: 0.25,
  /** Distance from the volume-weighted median at which the price-fidelity component reaches 0. */
  fidelityFullScale: 0.02,
  /** Number of markets at which the breadth component reaches 1. */
  breadthFullScale: 5,
  weights: { liquidity: 0.5, fidelity: 0.3, breadth: 0.2 },
  /** Minimum score for "Good alternative". */
  goodThreshold: 60,
  /** Distance from consensus under which the price is described as "in line". */
  inLineTolerance: 0.005,
} as const;
