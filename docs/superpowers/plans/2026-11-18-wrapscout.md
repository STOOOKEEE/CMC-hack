# WrapScout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Next.js web app where someone types a tokenized asset (e.g. `NVDA`) and gets the best tokenized version to buy, why, where, and what is wrong with the others — built on the CoinMarketCap RWA API.

**Architecture:** Next.js App Router. All CMC calls go through server code (`src/lib/cmc/*`) with a TTL cache. A `DataSource` abstraction has three implementations sharing one on-disk format: `live` (CMC API), `snapshot` (`data/snapshot/`, generated with a key) and `demo` (`fixtures/demo-snapshot/`, synthetic, used when no key). Pure modules (`normalize`, `score`, `search`) turn raw bundles into an `AssetView` rendered by server components.

**Tech Stack:** Next.js 16 (App Router, TypeScript, Tailwind 4), Vitest, Playwright (smoke), tsx (scripts), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-18-wrapscout-design.md`

## Global Constraints

- CMC key is read only from `process.env.CMC_API_KEY` on the server; never imported by a client component; `.env*` ignored (except `.env.example`).
- Base URL `https://pro-api.coinmarketcap.com`, header `X-CMC_PRO_API_KEY`.
- RWA endpoints live under `/v5/real-world-assets/` ; v5 `quotes` is an **array** of `{symbol, ...}`; v2 `quote` is an **object** keyed by currency.
- Thresholds (spec §6.3): volume floor `10_000` USD; unit tolerance `0.25`; fidelity full-scale `0.02`; breadth full-scale `5` markets; weights `0.5 / 0.3 / 0.2`; "Good" ≥ `60`.
- Cache TTLs (spec §6.1): map 24 h, assets/list 15 min, RWA quotes 2 min, RWA info 24 h, crypto info 7 d, crypto quotes 2 min, market pairs 10 min.
- Server-side live fetch timeout `8_000` ms → fall back to snapshot.
- Product copy in English. "Not financial advice" visible on every page. Issuer notes labelled "Issuer info, not CMC data — may be outdated".
- Green/red reserved for signals.
- Demo mode (no key, no snapshot) must show a visible "Demo data" banner; synthetic data never presented as live.

## Review Focus

1. **Unknown / lowercase / mixed-case ticker** in URL or search (`/a/nvda`, `/a/NVDA`, `/a/zzzz`) → case-insensitive resolution; unknown → 404 page with suggestions, never a 500. *Test in Task 6 (`resolveSymbol`) and Task 8 smoke.*
2. **Asset whose wrappers are all `price: null`** → page renders "No tradable version right now", no Best pick card. *Test in Task 3 (`rankAsset` zero eligible) and Task 8 smoke (`/a/ms` demo asset).*
3. **Gold-style mixed units** (5 tokens ≈ $4,320, 2 tokens ≈ $138) → the gram tokens are "Different unit", never Best. *Test in Task 3.*
4. **CMC down / 429 / 403 / timeout while a judge browses** → snapshot served with dated banner; with no snapshot, a clear error state, not a hang. *Test in Task 6 (`getAssetView` fallback + timeout).*
5. **`/v2/cryptocurrency/info` batch rejected because of one unknown id** → drop the id, retry, wrapper shows "Unknown chain" instead of the whole page failing. *Test in Task 5.*

---

## File Structure

```
src/lib/model.ts              domain types (Wrapper, ScoredWrapper, AssetView, SearchEntry, PopularEntry, AssetBundle, raw CMC types)
src/lib/normalize.ts          AssetBundle → Wrapper[] + asset header (pure)
src/lib/score/config.ts       thresholds (Global Constraints values)
src/lib/score/rank.ts         eligibility, weighted median, score, labels (pure)
src/lib/score/reasons.ts      reason + warning strings (pure)
src/lib/search.ts             searchAssets / resolveSymbol (pure)
src/lib/issuers.ts            issuer access notes lookup (data/issuers.json)
src/lib/cache.ts              TtlCache with in-flight coalescing
src/lib/cmc/client.ts         cmcGet + CmcError classification + 429 backoff
src/lib/cmc/endpoints.ts      one typed function per endpoint
src/lib/data/source.ts        DataSource interface + LiveSource + SnapshotSource
src/lib/data/index.ts         getDataSource(), getAssetView(), getSearchIndex(), getPopular() with fallback/timeout
src/lib/format.ts             formatUsd, formatPct, shortAddress
src/app/...                   pages, API routes, OG image
src/components/...            UI pieces
fixtures/cmc/*.json           synthetic raw API responses (labelled) for unit tests
fixtures/demo-snapshot/       synthetic snapshot used in demo mode
data/issuers.json             hand-curated issuer notes
scripts/explore.ts            records real raw responses (needs key)
scripts/snapshot.ts           writes data/snapshot/ (needs key)
tests/*.test.ts, tests/e2e/smoke.spec.ts
```

---

### Task 1: Scaffold

**Files:** Create: Next.js app (`create-next-app`, TS, Tailwind, ESLint, App Router, `src/`, alias `@/*`), `vitest.config.ts`, `.env.example`, `.github/workflows/ci.yml`, `tests/sanity.test.ts`.

- [ ] Generate app in a scratch dir and move it in (repo already has `docs/`, `TODO.md`).
- [ ] Add devDeps `vitest`, `tsx`, `@playwright/test`; scripts: `test` (`vitest run`), `typecheck` (`tsc --noEmit`), `explore`, `snapshot`, `e2e`.
- [ ] `.env.example` with `CMC_API_KEY=`; ensure `.gitignore` ignores `.env*` but not `.env.example`.
- [ ] CI: `npm ci && npm run lint && npm run typecheck && npm test && npm run build`.
- [ ] Verify: `npm test`, `npm run typecheck`, `npm run build` all pass. Commit.

### Task 2: Domain types, synthetic fixtures, normalization

**Files:** Create `src/lib/model.ts`, `src/lib/normalize.ts`, `fixtures/cmc/rwa-quotes.json`, `fixtures/cmc/crypto-info.json`, `fixtures/cmc/crypto-quotes.json`, `fixtures/cmc/rwa-map.json`, `fixtures/cmc/rwa-info.json`, `fixtures/cmc/rwa-assets-list.json`, `fixtures/README.md`; Test `tests/normalize.test.ts`.

**Interfaces — Produces:**
- `interface AssetBundle { fetchedAt: string; quote: RawRwaQuote; info: RawRwaInfo | null; tokenMeta: Record<string, RawCryptoInfo>; tokenQuotes: Record<string, RawCryptoQuote>; marketPairs: Record<string, RawMarketPair[]> | null }`
- `interface Wrapper { cryptoId: number; symbol: string; name: string; issuerName: string | null; price: number | null; volume24h: number | null; marketCap: number | null; numMarketPairs: number | null; chain: string | null; contract: string | null; explorerUrl: string | null; exchanges: string[] }`
- `interface AssetHeader { rwaId: number; symbol: string; name: string; assetType: string; consensusPrice: number | null; lastUpdated: string | null; industry: string | null; secCik: string | null }`
- `normalizeAsset(bundle: AssetBundle): { header: AssetHeader; wrappers: Wrapper[] }`
- `usdQuoteV5(quotes: RawV5Quote[] | undefined): RawV5Quote | null`

Fixture assets (synthetic, shapes from round-1 docs): NVDA (8 tokens: 6 trading with varied volume incl. one at $43, 2 `price: null`), XAU gold (7 tokens: 5 ≈ 4,320, 2 ≈ 138), MS (1 token, `price: null`), SPY (2 tokens), TSLA (3 tokens).

- [ ] Tests: `usdQuoteV5` picks `symbol === 'USD'` from the array (returns null when absent); `normalizeAsset` on NVDA → 8 wrappers, null-price wrappers keep `price: null`; chain/contract/explorer come from `tokenMeta[id].platform` / `urls.explorer[0]`; missing `tokenMeta` → `chain: null`; `volume24h` falls back to `tokenQuotes[id].quote.USD.volume_24h` when token row volume is null; `numMarketPairs` from `tokenQuotes`; `exchanges` = unique exchange names from `marketPairs[id]` sorted by pair volume desc, max 5; header `consensusPrice` = USD `average_tokenized_price`; info: `about` object ignored, `industry`, `secCik` read defensively (`sec_cik ?? cik`).
- [ ] Run → FAIL. Implement. Run → PASS. Commit.

### Task 3: Score engine

**Files:** Create `src/lib/score/config.ts`, `src/lib/score/rank.ts`, `src/lib/score/reasons.ts`; Test `tests/score.test.ts`.

**Interfaces — Consumes:** `Wrapper`, `AssetHeader`. **Produces:**
- `type Label = 'best' | 'only_option' | 'good' | 'weak' | 'too_thin' | 'different_unit' | 'no_market'`
- `interface ScoredWrapper extends Wrapper { label: Label; score: number | null; deviationFromConsensus: number | null; reasons: string[]; warnings: string[] }`
- `interface RankedAsset { wrappers: ScoredWrapper[]; best: ScoredWrapper | null; eligibleCount: number; summaryWarnings: string[] }`
- `rankAsset(header: AssetHeader, wrappers: Wrapper[]): RankedAsset`
- `weightedMedian(points: { value: number; weight: number }[]): number`

Rules exactly as spec §6.3: check order `no_market` → `different_unit` (|p/ref−1| > 0.25, ref = consensus or median of non-null prices) → `too_thin` (vol < 10k, null vol = 0) → eligible. `L = eligible===1 || volMax<=floor ? 1 : log10(v/floor)/log10(volMax/floor)`; `F = max(0, 1 − |p/vwm−1|/0.02)`; `B = min(1, (pairs??0)/5)`; `score = round(100(0.5L+0.3F+0.2B))`. Sort eligible by score desc, tie volume desc; then `different_unit`, `too_thin`, `no_market`.

- [ ] Tests: NVDA → best is the highest-volume in-line wrapper, $43 wrapper is `too_thin` with warning containing `$43`; gold → the two ≈138 tokens are `different_unit`, best is one of the ounce tokens; MS → `best === null`, `eligibleCount === 0`, summary contains `"No tradable version right now"`; single eligible → label `only_option`; equal scores → higher volume first; `weightedMedian([{1,1},{2,1},{10,5}]) === 10`; best reasons include `"Most liquid version"` and `"markets"`; summary for NVDA contains `"2 versions have no market"`.
- [ ] Run → FAIL. Implement. Run → PASS. Commit.

### Task 4: TTL cache

**Files:** Create `src/lib/cache.ts`; Test `tests/cache.test.ts`.

**Produces:** `class TtlCache { constructor(maxEntries = 500); get<T>(key: string): T | undefined; getOrLoad<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T>; clear(): void }` — concurrent `getOrLoad` on the same key shares one in-flight promise; rejected loads are not cached; LRU eviction past `maxEntries`.

- [ ] Tests: second call within TTL does not call loader; after TTL (fake timers) loader called again; two concurrent calls → loader called once; rejection not cached; eviction of oldest beyond max.
- [ ] Run → FAIL. Implement. Run → PASS. Commit.

### Task 5: CMC client and endpoints

**Files:** Create `src/lib/cmc/client.ts`, `src/lib/cmc/endpoints.ts`; Test `tests/cmc.test.ts` (mock `fetch`).

**Produces:**
- `class CmcError extends Error { kind: 'plan' | 'not_found' | 'method' | 'rate_limit' | 'auth' | 'bad_request' | 'server' | 'network'; status: number }`
- `cmcGet<T>(path: string, params: Record<string, string | number>, opts?: { apiKey?: string; fetchImpl?: typeof fetch; retries?: number }): Promise<{ data: T; creditCount: number }>` — 403→plan, 404→not_found, 405→method, 429→rate_limit (retry with backoff 1s,2s,4s up to `retries`=3), 401→auth, 400→bad_request, 5xx→server (retried), fetch throw→network.
- `endpoints`: `rwaMap()`, `rwaAssetsList(limit)`, `rwaQuotes(ids: number[])` (chunks of 50), `rwaInfo(id)`, `cryptoInfo(ids: number[])` (chunks of 100; on bad_request whose message names an id, drop it and retry; returns `{ byId, unresolved: number[] }`), `cryptoQuotes(ids)` (chunks of 100), `cryptoMarketPairs(id)` (returns `null` on `plan`), `keyInfo()`.

- [ ] Tests: header `X-CMC_PRO_API_KEY` sent; status→kind mapping; 429 then 200 → resolves after retry; `cryptoInfo([1, 39839, 2])` where first response is 400 `Invalid value for "id": "39839"` → second request without 39839, result `unresolved: [39839]`; `rwaQuotes` with 120 ids → 3 requests; `cryptoMarketPairs` 403 → `null`.
- [ ] Run → FAIL. Implement. Run → PASS. Commit.

### Task 6: Data sources, issuers, search, view assembly

**Files:** Create `src/lib/data/source.ts`, `src/lib/data/index.ts`, `src/lib/search.ts`, `src/lib/issuers.ts`, `data/issuers.json`, `fixtures/demo-snapshot/index.json`, `fixtures/demo-snapshot/assets/<rwaId>.json`; Test `tests/data.test.ts`, `tests/search.test.ts`.

**Produces:**
- `interface SearchEntry { rwaId: number; symbol: string; name: string; assetType: string; rank: number | null }`
- `interface PopularEntry extends SearchEntry { tokenizedMarketCap: number | null }`
- `interface DataSource { mode: 'live' | 'snapshot' | 'demo'; asOf(): string | null; searchIndex(): Promise<SearchEntry[]>; popular(limit: number): Promise<PopularEntry[]>; assetBundle(rwaId: number): Promise<AssetBundle | null> }`
- `class LiveSource implements DataSource` (endpoints + TtlCache TTLs from Global Constraints; market pairs only for up to 4 wrappers with non-null price)
- `class SnapshotSource implements DataSource` (`constructor(dir: string, mode: 'snapshot' | 'demo')`; reads `index.json` = `{ generatedAt, searchIndex, popular }` and `assets/<rwaId>.json` = `AssetBundle`)
- `searchAssets(index: SearchEntry[], query: string, limit = 8): SearchEntry[]` — exact symbol, then symbol prefix, then name substring; case-insensitive; tie → lower rank.
- `resolveSymbol(index: SearchEntry[], symbol: string): SearchEntry | null` — case-insensitive exact symbol, lowest rank wins.
- `issuerNote(issuerName: string | null): { label: string; note: string | null; url: string | null } | null`
- `interface AssetView { header: AssetHeader; ranked: RankedAsset; dataMode: 'live' | 'snapshot' | 'demo'; asOf: string }`
- `getAssetView(symbol: string): Promise<AssetView | null>`, `getSearchIndex()`, `getPopular(limit)`, `getDataMode()` — key present → live with fallback to `data/snapshot` on any error or after 8 s; no key → `data/snapshot` if present else demo.

- [ ] Tests: search ranking (`"nv"` → NVDA first; `"gold"` matches by name; `"NVDA"` exact beats `"NVDAX"`-like); `resolveSymbol('nvda')` → NVDA; unknown → null; `getAssetView` with a LiveSource stub that throws `CmcError('rate_limit')` → returns snapshot view with `dataMode: 'snapshot'`; stub that never resolves → snapshot after timeout (fake timers / injected timeout); no key + no snapshot → `dataMode: 'demo'`; `issuerNote('Backed Assets')` matches case-insensitively.
- [ ] Run → FAIL. Implement. Run → PASS. Commit.

### Task 7: Scripts

**Files:** Create `scripts/explore.ts`, `scripts/snapshot.ts`.

- [ ] `npm run explore -- NVDA TSLA XAU` → writes raw responses to `fixtures/live/<endpoint>-<arg>.json` and prints status/credits per endpoint (including market-pairs attempts per spec §6.4) — exits with a clear message if `CMC_API_KEY` missing.
- [ ] `npm run snapshot` → writes `data/snapshot/index.json` + `assets/<rwaId>.json` for every `has_tokens` asset via `LiveSource`; prints credit total.
- [ ] Verify: both exit 1 with the missing-key message when no key. `npm run typecheck` passes. Commit.

### Task 8: UI, API routes, OG image, smoke test

**Files:** Create `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/a/[symbol]/page.tsx`, `src/app/a/[symbol]/not-found.tsx`, `src/app/a/[symbol]/opengraph-image.tsx`, `src/app/method/page.tsx`, `src/app/api/search-index/route.ts`, `src/app/api/asset/[symbol]/route.ts`, `src/components/{SearchBox,PopularGrid,BestPickCard,WrapperTable,DataBanner,SiteFooter}.tsx`, `src/lib/format.ts`, `playwright.config.ts`, `tests/e2e/smoke.spec.ts`, `tests/format.test.ts`.

Screens per spec §7 (home, asset, method, error states). `WrapperTable` is a client component holding the "How do you buy?" chain filter (Any + chains present) and shows "Best on <chain>" for the top eligible row in the filter. `DataBanner` shows demo/snapshot banners with date. Footer: "Not financial advice · Data: CoinMarketCap · updated <relative time>". Asset pages and API are dynamic (`force-dynamic`).

- [ ] `tests/format.test.ts`: `formatUsd(4200000) === '$4.2M'`, `formatUsd(43) === '$43'`, `formatUsd(229.2787) === '$229.28'`, `formatPct(0.0009) === '+0.09%'`, `shortAddress('0x2874A11805783324C54562eDB1A641C5d1d077a5') === '0x2874…77a5'`.
- [ ] Implement format, then components and pages.
- [ ] Smoke (`tests/e2e/smoke.spec.ts`, demo mode, `next start`): home shows search; typing `nvda` + Enter lands on `/a/nvda` with "Best pick"; `/a/xau` shows "Different unit"; `/a/ms` shows "No tradable version right now"; `/a/zzzz` shows not-found text; `/api/asset/nvda` returns JSON with `ranked.best.symbol`.
- [ ] Verify: `npm run build` passes; `npm run e2e` passes. Commit.

### Task 9: Submission docs

**Files:** Create `README.md`, `JUDGE.md`, `FEEDBACK.md`; Modify `TODO.md`, spec §5 (Next 16).

- [ ] README: problem, how it works, endpoints table (exact paths used), run locally (demo mode without key, live with key), snapshot, architecture, score method summary, limits, placeholders for live URL + video.
- [ ] JUDGE.md: 60-second path (`/a/nvda`, `/a/xau`, `/a/ms`, `/method`).
- [ ] FEEDBACK.md: friction we designed around (from round-1 public write-ups, marked "to re-verify with our key") + section for our own findings.
- [ ] Tick completed items in TODO.md. Commit and push.
