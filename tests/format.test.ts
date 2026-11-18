import { describe, expect, it } from "vitest";
import { assetTypeLabel, formatCompactUsd, formatPct, formatPrice, shortAddress } from "@/lib/format";

describe("formatCompactUsd", () => {
  it("compacts volumes", () => {
    expect(formatCompactUsd(4200000)).toBe("$4.2M");
    expect(formatCompactUsd(1500000000)).toBe("$1.5B");
    expect(formatCompactUsd(510000)).toBe("$510k");
    expect(formatCompactUsd(12500)).toBe("$12.5k");
    expect(formatCompactUsd(43)).toBe("$43");
  });
});

describe("formatPrice", () => {
  it("shows two decimals with thousands separators", () => {
    expect(formatPrice(229.2787)).toBe("$229.28");
    expect(formatPrice(4320.5)).toBe("$4,320.50");
  });
  it("keeps significant digits for sub-dollar prices", () => {
    expect(formatPrice(0.012345)).toBe("$0.01235");
  });
});

describe("formatPct", () => {
  it("formats a signed ratio as a percentage", () => {
    expect(formatPct(0.0009)).toBe("+0.09%");
    expect(formatPct(-0.0312)).toBe("-3.12%");
    expect(formatPct(0)).toBe("0.00%");
  });
});

describe("shortAddress", () => {
  it("shortens long addresses", () => {
    expect(shortAddress("0x2874A11805783324C54562eDB1A641C5d1d077a5")).toBe("0x2874…77a5");
    expect(shortAddress("short")).toBe("short");
  });
});

describe("assetTypeLabel", () => {
  it("renders CMC asset types for humans", () => {
    expect(assetTypeLabel("etf")).toBe("ETF");
    expect(assetTypeLabel("stock")).toBe("Stock");
    expect(assetTypeLabel("commodity")).toBe("Commodity");
    expect(assetTypeLabel("private_credit")).toBe("Private credit");
  });
});
