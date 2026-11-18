/**
 * Phase 0 "API reality check": calls every endpoint WrapScout relies on (plus the
 * candidate "where to buy" sources from spec §6.4), saves the raw responses to
 * fixtures/live/ and prints HTTP status + credits per call.
 *
 *   npm run explore -- NVDA TSLA XAU SPY MS
 */
import fs from "node:fs";
import path from "node:path";
import { CMC_BASE_URL } from "../src/lib/cmc/client";
import { requireApiKey } from "./env";

const key = requireApiKey("explore");
const symbols = process.argv.slice(2).length ? process.argv.slice(2) : ["NVDA", "TSLA", "XAU", "SPY", "MS"];
const outDir = path.join("fixtures", "live");
fs.mkdirSync(outDir, { recursive: true });

interface Row {
  name: string;
  path: string;
  http: number | string;
  credits: number | string;
  note: string;
}
const rows: Row[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call(name: string, p: string, params: Record<string, string | number> = {}) {
  const url = new URL(p, CMC_BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  await sleep(2100); // stay under ~30 calls/minute
  try {
    const res = await fetch(url, { headers: { "X-CMC_PRO_API_KEY": key, Accept: "application/json" } });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {}
    fs.writeFileSync(
      path.join(outDir, `${name}.json`),
      JSON.stringify({ request: `${p}?${url.searchParams}`, httpStatus: res.status, body }, null, 2),
    );
    const status = (body as { status?: { credit_count?: number; error_message?: string } })?.status;
    rows.push({ name, path: p, http: res.status, credits: status?.credit_count ?? "?", note: status?.error_message ?? "" });
    return res.ok ? (body as { data?: unknown }).data : undefined;
  } catch (e) {
    rows.push({ name, path: p, http: "ERR", credits: "-", note: (e as Error).message });
    return undefined;
  }
}

type MapEntry = { rwa_id?: number; id?: number; symbol: string; has_tokens?: boolean };
type Token = { crypto_id: number; price: number | null; volume_24h?: number | null };

async function main() {
  await call("key-info", "/v1/key/info");
  const map = ((await call("rwa-map", "/v5/real-world-assets/map")) ?? []) as MapEntry[];
  await call("rwa-assets-list", "/v5/real-world-assets/assets/list", { limit: 20 });
  await call("rwa-issuers-list", "/v5/real-world-assets/issuers/list");

  for (const symbol of symbols) {
    const entry = map.find((e) => e.symbol.toUpperCase() === symbol.toUpperCase());
    const rwaId = entry?.rwa_id ?? entry?.id;
    if (rwaId === undefined) {
      rows.push({ name: `rwa-quotes-${symbol}`, path: "-", http: "-", credits: "-", note: "symbol not in RWA map" });
      continue;
    }
    const quotes = (await call(`rwa-quotes-${symbol}`, "/v5/real-world-assets/quotes/latest", {
      id: rwaId,
      convert: "USD",
    })) as { tokens?: Token[] }[] | undefined;
    await call(`rwa-info-${symbol}`, "/v5/real-world-assets/info", { id: rwaId });
    await call(`rwa-market-pairs-${symbol}`, "/v5/real-world-assets/market-pairs/list", { id: rwaId });

    const tokens = (Array.isArray(quotes) ? quotes[0]?.tokens : undefined) ?? [];
    const ids = tokens.map((t) => t.crypto_id);
    if (ids.length === 0) continue;
    const info = (await call(`crypto-info-${symbol}`, "/v2/cryptocurrency/info", { id: ids.join(",") })) as
      | Record<string, { platform?: { slug?: string; token_address?: string } }>
      | undefined;
    await call(`crypto-quotes-${symbol}`, "/v2/cryptocurrency/quotes/latest", { id: ids.join(","), convert: "USD" });

    const top = [...tokens].filter((t) => t.price !== null).sort((a, b) => (b.volume_24h ?? 0) - (a.volume_24h ?? 0))[0];
    if (!top) continue;
    await call(`crypto-market-pairs-${symbol}`, "/v2/cryptocurrency/market-pairs/latest", { id: top.crypto_id, limit: 20 });
    const platform = info?.[String(top.crypto_id)]?.platform;
    if (platform?.slug && platform.token_address) {
      await call(`dex-spot-pairs-${symbol}`, "/v4/dex/spot-pairs/latest", {
        network_slug: platform.slug,
        contract_address: platform.token_address,
      });
    }
  }

  console.table(rows);
  console.log(`Raw responses saved to ${outDir}/ — compare them with fixtures/cmc/ (see fixtures/README.md).`);
}

main();
