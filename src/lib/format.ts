/** Compact USD for volumes and market caps: $4.2M, $510k, $43. */
export function formatCompactUsd(value: number): string {
  const abs = Math.abs(value);
  const units: [number, string][] = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "k"],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) {
      const scaled = value / size;
      const digits = Math.abs(scaled) >= 100 ? 0 : 1;
      return `$${trimZero(scaled.toFixed(digits))}${suffix}`;
    }
  }
  return `$${Math.round(value)}`;
}

function trimZero(s: string): string {
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

/** Full USD price: $4,320.50, $229.28, $0.01235. */
export function formatPrice(value: number): string {
  if (Math.abs(value) >= 1) {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${value.toPrecision(4)}`;
}

/** Signed percentage from a ratio: 0.0009 → +0.09%. */
export function formatPct(ratio: number): string {
  const pct = (ratio * 100).toFixed(2);
  if (Number(pct) === 0) return "0.00%";
  return `${ratio > 0 ? "+" : ""}${pct}%`;
}

/** 0x2874A118…77a5 style shortening for contract addresses. */
export function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
