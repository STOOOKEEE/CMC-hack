import { describe, expect, it, vi } from "vitest";
import { CmcError, cmcGet } from "@/lib/cmc/client";
import { createEndpoints } from "@/lib/cmc/endpoints";

type Reply = { status: number; body: unknown };
const ok = (data: unknown, credit = 1): Reply => ({
  status: 200,
  body: { status: { error_code: 0, error_message: null, credit_count: credit }, data },
});
const fail = (status: number, message: string): Reply => ({
  status,
  body: { status: { error_code: status, error_message: message, credit_count: 0 } },
});

/** fetch stub replaying replies in order and recording requested URLs + headers. */
function stubFetch(replies: Reply[]) {
  const calls: { url: URL; headers: Record<string, string> }[] = [];
  const impl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: new URL(String(input)), headers: (init?.headers ?? {}) as Record<string, string> });
    const reply = replies.shift();
    if (!reply) throw new Error("no more replies");
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  });
  return { impl: impl as unknown as typeof fetch, calls };
}
const noSleep = async () => {};

describe("cmcGet", () => {
  it("sends the API key header and returns data with the credit count", async () => {
    const { impl, calls } = stubFetch([ok({ a: 1 }, 3)]);
    const res = await cmcGet("/v1/key/info", { x: 1 }, { apiKey: "k", fetchImpl: impl, sleep: noSleep });
    expect(res).toEqual({ data: { a: 1 }, creditCount: 3 });
    expect(calls[0].headers["X-CMC_PRO_API_KEY"]).toBe("k");
    expect(calls[0].url.origin + calls[0].url.pathname).toBe("https://pro-api.coinmarketcap.com/v1/key/info");
    expect(calls[0].url.searchParams.get("x")).toBe("1");
  });

  it.each([
    [400, "bad_request"],
    [401, "auth"],
    [402, "plan"],
    [403, "plan"],
    [404, "not_found"],
    [405, "method"],
  ])("classifies HTTP %i as %s without retrying", async (status, kind) => {
    const { impl, calls } = stubFetch([fail(status, "nope")]);
    const err = await cmcGet("/x", {}, { apiKey: "k", fetchImpl: impl, sleep: noSleep }).catch((e) => e);
    expect(err).toBeInstanceOf(CmcError);
    expect(err.kind).toBe(kind);
    expect(err.status).toBe(status);
    expect(err.message).toBe("nope");
    expect(calls).toHaveLength(1);
  });

  it("retries a 429 with backoff and then succeeds", async () => {
    const { impl, calls } = stubFetch([fail(429, "slow down"), ok([1])]);
    const sleep = vi.fn(async () => {});
    const res = await cmcGet("/x", {}, { apiKey: "k", fetchImpl: impl, sleep });
    expect(res.data).toEqual([1]);
    expect(calls).toHaveLength(2);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it("gives up after the retry budget with a rate_limit error", async () => {
    const { impl } = stubFetch([fail(429, "a"), fail(429, "b"), fail(429, "c"), fail(429, "d")]);
    const err = await cmcGet("/x", {}, { apiKey: "k", fetchImpl: impl, sleep: noSleep }).catch((e) => e);
    expect(err.kind).toBe("rate_limit");
  });

  it("does not retry a 429 caused by an exhausted daily or monthly quota", async () => {
    const quota: Reply = {
      status: 429,
      body: { status: { error_code: 1009, error_message: "daily credit limit reached", credit_count: 0 } },
    };
    const { impl, calls } = stubFetch([quota, ok("never")]);
    const err = await cmcGet("/x", {}, { apiKey: "k", fetchImpl: impl, sleep: noSleep }).catch((e) => e);
    expect(err.kind).toBe("rate_limit");
    expect(err.code).toBe(1009);
    expect(calls).toHaveLength(1);
  });

  it("aborts a request that hangs past requestTimeoutMs", async () => {
    const hanging = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal!.reason))),
    ) as unknown as typeof fetch;
    const started = Date.now();
    const err = await cmcGet("/x", {}, { apiKey: "k", fetchImpl: hanging, sleep: noSleep, retries: 0, requestTimeoutMs: 30 }).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(CmcError);
    expect(err.kind).toBe("network");
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("retries 5xx and classifies a thrown fetch as network", async () => {
    const { impl } = stubFetch([fail(502, "bad gateway"), ok("fine")]);
    expect((await cmcGet("/x", {}, { apiKey: "k", fetchImpl: impl, sleep: noSleep })).data).toBe("fine");
    const throwing = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const err = await cmcGet("/x", {}, { apiKey: "k", fetchImpl: throwing, sleep: noSleep, retries: 1 }).catch((e) => e);
    expect(err.kind).toBe("network");
  });
});

describe("endpoints", () => {
  it("chunks RWA quotes by 50 ids", async () => {
    const { impl, calls } = stubFetch([ok([{ rwa_id: 1 }]), ok([{ rwa_id: 2 }]), ok([{ rwa_id: 3 }])]);
    const api = createEndpoints({ apiKey: "k", fetchImpl: impl, sleep: noSleep });
    const ids = Array.from({ length: 120 }, (_, i) => i + 1);
    const res = await api.rwaQuotes(ids);
    expect(calls).toHaveLength(3);
    expect(calls[0].url.pathname).toBe("/v5/real-world-assets/quotes/latest");
    expect(calls[0].url.searchParams.get("id")!.split(",")).toHaveLength(50);
    expect(calls[2].url.searchParams.get("id")!.split(",")).toHaveLength(20);
    expect(res.map((q) => q.rwa_id)).toEqual([1, 2, 3]);
  });

  it("drops an unknown id rejected by /v2/cryptocurrency/info and retries the batch", async () => {
    const { impl, calls } = stubFetch([
      fail(400, 'Invalid value for "id": "39839"'),
      ok({ "1": { id: 1, name: "A", symbol: "A" }, "2": { id: 2, name: "B", symbol: "B" } }),
    ]);
    const api = createEndpoints({ apiKey: "k", fetchImpl: impl, sleep: noSleep });
    const res = await api.cryptoInfo([1, 39839, 2]);
    expect(calls[1].url.searchParams.get("id")).toBe("1,2");
    expect(Object.keys(res.byId).sort()).toEqual(["1", "2"]);
    expect(res.unresolved).toEqual([39839]);
  });

  it("returns null market pairs when the plan does not allow them", async () => {
    const { impl } = stubFetch([fail(403, "Your plan does not include this endpoint")]);
    const api = createEndpoints({ apiKey: "k", fetchImpl: impl, sleep: noSleep });
    expect(await api.cryptoMarketPairs(36992)).toBeNull();
  });

  it("returns the market_pairs array when allowed", async () => {
    const { impl, calls } = stubFetch([ok({ id: 1, market_pairs: [{ market_pair: "A/USD" }] })]);
    const api = createEndpoints({ apiKey: "k", fetchImpl: impl, sleep: noSleep });
    expect(await api.cryptoMarketPairs(1)).toEqual([{ market_pair: "A/USD" }]);
    expect(calls[0].url.pathname).toBe("/v2/cryptocurrency/market-pairs/latest");
  });

  it("spaces calls by minIntervalMs to respect the per-minute rate limit", async () => {
    const { impl } = stubFetch([ok({}), ok({})]);
    const sleep = vi.fn(async () => {});
    const api = createEndpoints({ apiKey: "k", fetchImpl: impl, sleep, minIntervalMs: 2000 });
    await api.keyInfo();
    await api.keyInfo();
    expect(sleep).toHaveBeenCalledTimes(1);
    expect((sleep.mock.calls[0] as unknown as [number])[0]).toBeGreaterThan(1900);
  });

  it("reads RWA info whether data is keyed by id, an array or a single object", async () => {
    const { impl } = stubFetch([
      ok({ "2": { rwa_id: 2, industry: "Semis" } }),
      ok([{ rwa_id: 2, industry: "Semis" }]),
      ok({ rwa_id: 2, industry: "Semis" }),
    ]);
    const api = createEndpoints({ apiKey: "k", fetchImpl: impl, sleep: noSleep });
    for (let i = 0; i < 3; i++) expect((await api.rwaInfo(2))?.industry).toBe("Semis");
  });
});
