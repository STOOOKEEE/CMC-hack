import { describe, expect, it } from "vitest";
import { normalizeAsset, usdQuoteV5 } from "@/lib/normalize";
import { fixtureBundle } from "./helpers/fixtures";

describe("usdQuoteV5", () => {
  it("picks the USD entry from the v5 quotes array", () => {
    const q = usdQuoteV5([
      { symbol: "EUR", average_tokenized_price: 200 },
      { symbol: "USD", average_tokenized_price: 229.07 },
    ]);
    expect(q?.average_tokenized_price).toBe(229.07);
  });

  it("returns null when there is no USD entry or no array", () => {
    expect(usdQuoteV5([{ symbol: "EUR", average_tokenized_price: 1 }])).toBeNull();
    expect(usdQuoteV5(undefined)).toBeNull();
  });
});

describe("normalizeAsset", () => {
  it("keeps every wrapper, including price: null ones", () => {
    const { wrappers } = normalizeAsset(fixtureBundle("NVDA"));
    expect(wrappers).toHaveLength(8);
    expect(wrappers.filter((w) => w.price === null)).toHaveLength(2);
  });

  it("reads chain, contract and explorer from the crypto info platform", () => {
    const { wrappers } = normalizeAsset(fixtureBundle("NVDA"));
    const nvdax = wrappers.find((w) => w.cryptoId === 36992)!;
    expect(nvdax.chain).toBe("Solana");
    expect(nvdax.contract).toBe("Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh");
    expect(nvdax.explorerUrl).toBe("https://solscan.io/token/Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh");
    expect(nvdax.issuerName).toBe("Backed Assets");
  });

  it("lists every chain a wrapper is deployed on, primary first (real CMC info shape)", () => {
    const { wrappers } = normalizeAsset(fixtureBundle("NVDA"));
    const nvdax = wrappers.find((w) => w.cryptoId === 36992)!;
    expect(nvdax.deployments.map((d) => d.chain)).toEqual([
      "Solana",
      "BNB Smart Chain (BEP20)",
      "Ethereum",
      "Ink",
      "TON",
      "X Layer",
    ]);
    const eth = nvdax.deployments.find((d) => d.chain === "Ethereum")!;
    expect(eth.explorerUrl).toBe("https://etherscan.io/token/0xc845b2894dbddd03858fd2d643b4ef725fe0849d");
    expect(nvdax.deployments.find((d) => d.chain === "TON")!.explorerUrl).toBeNull();
    // Same EVM address on several chains: no bscscan link is listed, so BNB Chain must not borrow arbiscan's.
    expect(nvdax.deployments.find((d) => d.chain === "BNB Smart Chain (BEP20)")!.explorerUrl).toBeNull();
    expect(nvdax.deployments.find((d) => d.chain === "Ink")!.explorerUrl).toBe(
      "https://explorer.inkonchain.com/token/0xc845b2894dbddd03858fd2d643b4ef725fe0849d",
    );
  });

  it("takes the primary chain from the deployment matching platform.token_address", () => {
    const nvdaon = normalizeAsset(fixtureBundle("NVDA")).wrappers.find((w) => w.cryptoId === 38093)!;
    expect(nvdaon.chain).toBe("Robinhood Chain");
    expect(nvdaon.contract).toBe("0xf1b95AE4E7700b962714702EA53784Dc8492a856");
    // urls.explorer[0] is an Etherscan link for another address: never attach it to the Robinhood contract.
    expect(nvdaon.explorerUrl).toBeNull();
    expect(nvdaon.deployments.find((d) => d.chain === "Ethereum")!.explorerUrl).toBe(
      "https://etherscan.io/token/0x2D1F7226Bd1F780AF6B9A49DCC0aE00E8Df4bDEE",
    );
  });

  it("falls back to the platform when contract_address is missing", () => {
    const rh = normalizeAsset(fixtureBundle("NVDA")).wrappers.find((w) => w.cryptoId === 90003)!;
    expect(rh.deployments).toHaveLength(1);
    expect(rh.deployments[0].chain).toBe("Arbitrum");
    expect(rh.explorerUrl).toContain("arbiscan.io");
  });

  it("leaves chain null when crypto info is missing for a wrapper", () => {
    const bundle = fixtureBundle("NVDA");
    delete bundle.tokenMeta["36992"];
    const nvdax = normalizeAsset(bundle).wrappers.find((w) => w.cryptoId === 36992)!;
    expect(nvdax.chain).toBeNull();
    expect(nvdax.contract).toBeNull();
    expect(nvdax.explorerUrl).toBeNull();
  });

  it("falls back to the crypto quote volume when the tokens row volume is null", () => {
    const { wrappers } = normalizeAsset(fixtureBundle("NVDA"));
    expect(wrappers.find((w) => w.cryptoId === 38093)!.volume24h).toBe(510000);
  });

  it("reads num_market_pairs from the crypto quote", () => {
    const { wrappers } = normalizeAsset(fixtureBundle("NVDA"));
    expect(wrappers.find((w) => w.cryptoId === 36992)!.numMarketPairs).toBe(12);
  });

  it("lists unique exchanges by pair volume, at most 5", () => {
    const { wrappers } = normalizeAsset(fixtureBundle("NVDA"));
    expect(wrappers.find((w) => w.cryptoId === 36992)!.exchanges).toEqual([
      "Kraken",
      "Bybit",
      "Raydium",
      "Gate",
      "MEXC",
    ]);
    expect(wrappers.find((w) => w.cryptoId === 90004)!.exchanges).toEqual([]);
  });

  it("says why a wrapper has no exchanges listed", () => {
    const bundle = fixtureBundle("NVDA");
    bundle.marketPairs!["90004"] = [];
    const byId = new Map(normalizeAsset(bundle).wrappers.map((w) => [w.cryptoId, w]));
    expect(byId.get(36992)!.exchangesStatus).toBe("listed");
    expect(byId.get(90004)!.exchangesStatus).toBe("none");
    expect(byId.get(90003)!.exchangesStatus).toBe("not_fetched");
    bundle.marketPairs = null;
    expect(normalizeAsset(bundle).wrappers[0].exchangesStatus).toBe("plan");
  });

  it("returns no exchanges when market pairs are unavailable", () => {
    const bundle = fixtureBundle("NVDA");
    bundle.marketPairs = null;
    expect(normalizeAsset(bundle).wrappers.every((w) => w.exchanges.length === 0)).toBe(true);
  });

  it("builds the header from the quote and the registrant info", () => {
    const { header } = normalizeAsset(fixtureBundle("NVDA"));
    expect(header).toEqual({
      rwaId: 2,
      symbol: "NVDA",
      name: "NVIDIA Corp",
      assetType: "stock",
      consensusPrice: 229.07,
      lastUpdated: "2026-11-18T09:59:00.000Z",
      industry: "Semiconductors",
      secCik: "0001045810",
    });
  });

  it("reads the CIK from `cik` when `sec_cik` is absent, and tolerates a missing info", () => {
    const bundle = fixtureBundle("SPY");
    bundle.info = { cik: 884394, about: { markdown: "x" } };
    expect(normalizeAsset(bundle).header.secCik).toBe("884394");
    bundle.info = null;
    const { header } = normalizeAsset(bundle);
    expect(header.secCik).toBeNull();
    expect(header.industry).toBeNull();
  });

  it("returns a null consensus price for an asset without any market", () => {
    expect(normalizeAsset(fixtureBundle("MS")).header.consensusPrice).toBeNull();
  });
});
