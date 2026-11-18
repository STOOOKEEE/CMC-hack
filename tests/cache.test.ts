import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TtlCache } from "@/lib/cache";

describe("TtlCache", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("serves a cached value within its TTL without reloading", async () => {
    const cache = new TtlCache();
    const load = vi.fn(async () => 1);
    await cache.getOrLoad("k", 1000, load);
    expect(await cache.getOrLoad("k", 1000, load)).toBe(1);
    expect(load).toHaveBeenCalledTimes(1);
    expect(cache.get("k")).toBe(1);
  });

  it("reloads once the TTL has expired", async () => {
    const cache = new TtlCache();
    let n = 0;
    const load = vi.fn(async () => ++n);
    await cache.getOrLoad("k", 1000, load);
    vi.advanceTimersByTime(1001);
    expect(cache.get("k")).toBeUndefined();
    expect(await cache.getOrLoad("k", 1000, load)).toBe(2);
  });

  it("shares one in-flight load between concurrent callers", async () => {
    const cache = new TtlCache();
    let resolve!: (v: string) => void;
    const load = vi.fn(() => new Promise<string>((r) => (resolve = r)));
    const a = cache.getOrLoad("k", 1000, load);
    const b = cache.getOrLoad("k", 1000, load);
    resolve("v");
    expect(await a).toBe("v");
    expect(await b).toBe("v");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed load", async () => {
    const cache = new TtlCache();
    const load = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok");
    await expect(cache.getOrLoad("k", 1000, load)).rejects.toThrow("boom");
    expect(await cache.getOrLoad("k", 1000, load)).toBe("ok");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("evicts the least recently used entry beyond maxEntries", async () => {
    const cache = new TtlCache(2);
    await cache.getOrLoad("a", 1000, async () => "A");
    await cache.getOrLoad("b", 1000, async () => "B");
    cache.get("a"); // touch a so b is the LRU
    await cache.getOrLoad("c", 1000, async () => "C");
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe("A");
    expect(cache.get("c")).toBe("C");
  });

  it("clears everything", async () => {
    const cache = new TtlCache();
    await cache.getOrLoad("a", 1000, async () => "A");
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
  });
});
