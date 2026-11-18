export const CMC_BASE_URL = "https://pro-api.coinmarketcap.com";

export type CmcErrorKind =
  | "plan"
  | "not_found"
  | "method"
  | "rate_limit"
  | "auth"
  | "bad_request"
  | "server"
  | "network";

export class CmcError extends Error {
  constructor(
    readonly kind: CmcErrorKind,
    readonly status: number,
    message: string,
    /** CMC `status.error_code` when the body had one (e.g. 1009 / 1010 = daily / monthly quota exhausted). */
    readonly code?: number,
  ) {
    super(message);
    this.name = "CmcError";
  }
}

export interface CmcGetOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  /** Number of retries for 429 / 5xx / network errors. */
  retries?: number;
  /** Abort a single HTTP request after this long (default 15 s). */
  requestTimeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  baseUrl?: string;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function kindForStatus(status: number): CmcErrorKind {
  if (status === 400) return "bad_request";
  if (status === 401) return "auth";
  if (status === 402 || status === 403) return "plan";
  if (status === 404) return "not_found";
  if (status === 405) return "method";
  if (status === 429) return "rate_limit";
  return "server";
}

const RETRYABLE: CmcErrorKind[] = ["rate_limit", "server", "network"];
/** Daily / monthly credit quota or anonymous limit exhausted: retrying cannot help until the period resets. */
const QUOTA_CODES = new Set([1009, 1010, 1022]);

function isRetryable(e: unknown): boolean {
  if (!(e instanceof CmcError) || !RETRYABLE.includes(e.kind)) return false;
  return !(e.kind === "rate_limit" && e.code !== undefined && QUOTA_CODES.has(e.code));
}

interface Envelope<T> {
  status?: { error_code?: number | string; error_message?: string | null; credit_count?: number };
  data?: T;
}

async function once<T>(
  url: URL,
  apiKey: string | undefined,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<{ data: T; creditCount: number }> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      headers: { Accept: "application/json", ...(apiKey ? { "X-CMC_PRO_API_KEY": apiKey } : {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new CmcError("network", 0, timedOut ? `Request timed out after ${timeoutMs} ms` : String((e as Error)?.message ?? e));
  }
  let body: Envelope<T> = {};
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    // Non-JSON body (proxy error page, etc.) — fall through with an empty envelope.
  }
  if (!res.ok) {
    // CMC sends error_code as a number or as a numeric string ("1005") depending on the endpoint.
    const rawCode = Number(body.status?.error_code);
    const code = Number.isFinite(rawCode) && rawCode !== 0 ? rawCode : undefined;
    throw new CmcError(kindForStatus(res.status), res.status, body.status?.error_message ?? `HTTP ${res.status}`, code);
  }
  return { data: body.data as T, creditCount: body.status?.credit_count ?? 0 };
}

/** One GET against the CMC Pro API with error classification and retry/backoff (1s, 2s, 4s…). */
export async function cmcGet<T>(
  path: string,
  params: Record<string, string | number>,
  opts: CmcGetOptions = {},
): Promise<{ data: T; creditCount: number }> {
  const {
    apiKey,
    fetchImpl = fetch,
    retries = 3,
    sleep = defaultSleep,
    baseUrl = CMC_BASE_URL,
    requestTimeoutMs = 15_000,
  } = opts;
  const url = new URL(path, baseUrl);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  for (let attempt = 0; ; attempt++) {
    try {
      return await once<T>(url, apiKey, fetchImpl, requestTimeoutMs);
    } catch (e) {
      if (!isRetryable(e) || attempt >= retries) throw e;
      await sleep(1000 * 2 ** attempt);
    }
  }
}
