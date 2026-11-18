interface Entry {
  value: unknown;
  expiresAt: number;
}

/**
 * Small in-memory LRU cache with per-entry TTL and in-flight request coalescing.
 * Lives at module scope on the server, so CMC credit usage scales with time, not visitors.
 */
export class TtlCache {
  private entries = new Map<string, Entry>();
  private inFlight = new Map<string, Promise<unknown>>();

  constructor(private readonly maxEntries = 500) {}

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    // Re-insert to mark as most recently used.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value as T;
  }

  async getOrLoad<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    const pending = this.inFlight.get(key);
    if (pending) return pending as Promise<T>;

    const promise = load()
      .then((value) => {
        this.set(key, value, ttlMs);
        return value;
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }

  clear(): void {
    this.entries.clear();
    this.inFlight.clear();
  }

  private set(key: string, value: unknown, ttlMs: number): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as string;
      this.entries.delete(oldest);
    }
  }
}
