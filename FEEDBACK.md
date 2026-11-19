# CoinMarketCap API feedback

Feedback for the CMC API team, collected while building WrapScout.

## A. Friction reported by round-1 builders — re-verified with our key (2026-11-18)

We built defences for each one before having a key, then re-checked them with `npm run explore`
(raw responses in `fixtures/live/`). **All seven still reproduce.**

1. **RWA endpoints live under `/v5/`, while sibling families are v1–v3.** Guessing `/v1/real-world-assets/*`
   returns 404. → We hard-code the `/v5/real-world-assets/` prefix.
2. **v5 `quotes` is an array of `{ symbol, … }`, whereas v1/v2 `quote` is an object keyed by currency.**
   Reading `quote.USD` on v5 silently yields `undefined`. → `usdQuoteV5()` in `src/lib/normalize.ts`.
3. **`about` in `/v5/real-world-assets/info` is an object, not a string.** → We never treat it as a string.
4. **`tokens[]` has no chain and no listing state.** You need `/v2/cryptocurrency/info` to learn a wrapper's
   network. → We join on `crypto_id`.
5. **Wrappers of one asset can quote different units** (gold: 1 oz vs 1 g), and no field says so.
   → Anything more than 25% from the consensus price is labelled *Different unit*. A per-token `unit` field
   would remove the guesswork.
6. **One unknown id fails a whole `/v2/cryptocurrency/info` batch.** → We parse the id from the error, drop it
   and retry. Per-id errors next to the records that did resolve would be better.
7. **`/v5/real-world-assets/market-pairs/list` was refused on the Startup plan.** → "Where to buy" tries
   `/v2/cryptocurrency/market-pairs/latest` and falls back to chain + contract + issuer link.

## B. Our own findings

Observed on 2026-11-18 against `pro-api.coinmarketcap.com`, first on the keyless `/public-api` surface (1–5), then
with our key (6–12). Raw responses are committed in `fixtures/live/`.

1. **`status.error_code` changes type between endpoints.** `/public-api/v2/cryptocurrency/quotes/latest` without a
   key answered `"error_code": 1005` (number); `/public-api/v5/real-world-assets/map` answered `"error_code": "1005"`
   (string); `/v5/real-world-assets/map` without a key `"1002"`; `/public-api/v3/cryptocurrency/quotes/latest`
   `"1022"`. A client comparing numbers silently misses quota errors. → `src/lib/cmc/client.ts` parses both.
2. **One chain, two names.** For NVDAon (`id=38093`), `platform.name` is `"Robinhood"` (slug
   `robinhood-placeholder`) while the `contract_address[]` entry for the same address says `"Robinhood Chain"`.
   → We take the chain name from the `contract_address[]` entry that matches `platform.token_address`.
3. **`urls.explorer` does not line up with `platform`.** For NVDAon, `urls.explorer[0]` is an Etherscan link for the
   Ethereum contract (`0x2D1F…`), not for the primary Robinhood Chain contract (`0xf1b9…`). And because EVM tokens reuse
   one address on several chains (NVDAX: Ethereum, BNB Chain, Ink and X Layer share `0xc845…`), matching explorer links
   by address alone picks the wrong chain. → We only attach an explorer link whose host belongs to that chain.
   **Suggestion:** put an `explorer_url` on each `contract_address[]` entry.
4. **Tokenized stocks are multi-chain, and that matters to buyers.** NVDAX lists 6 deployments (Solana, BNB Chain,
   Ethereum, Ink, TON, X Layer). The RWA `tokens[]` row has no chain at all, so this is only visible after a second
   call per wrapper. A `chains` field on `tokens[]` would let RWA apps answer "can I buy it on my chain?" in one call.
5. **Missing key: 401 on the Pro path, 403 on `/public-api`.** Same condition, two status codes (`1002` vs `1005`).
   Minor, but worth documenting next to the error-code table.
6. **The RWA family takes `rwa_id`, not `id`.** `/v5/real-world-assets/quotes/latest?id=2` answers `4002 Missing required
   parameter.` without naming the parameter it wants. `rwa_id=2` works, and so does a comma list (`rwa_id=2,1,14,86,35`:
   5 assets, 1 credit) — which is what made a full snapshot of all 905 tokenized assets cost only **140 credits**.
7. **v5 lists are wrapped and paginated.** `map`, `assets/list`, `quotes/latest` and `info` answer
   `{ rwa_assets: [...], total_size, has_more }`. The map holds 7,811 assets (905 with tokens), 100 per page by default;
   `limit=200` works but `limit=500` / `1000` / `5000` answer `4001 Invalid parameter.` without stating the maximum.
8. **Success envelopes differ too:** v5 returns `"error_code": "0", "error_message": ""`; v2 returns `0` / `null`.
9. **An id from `tokens[]` is rejected by `/v2/cryptocurrency/info`** (`Invalid value for 'id': '39318'`, single-quoted —
   older write-ups quoted it with double quotes), failing the whole batch. We drop the id and retry.
10. **`tokens[]` mixes holdable tokens with derivatives price feeds.** Rows with `issuer_name: "NA (Derivatives)"`
    (e.g. "NVIDIA (Derivatives)", `crypto_id` 38153) have a price, 0 volume and no contract. A `token_type` field
    would stop RWA apps from recommending something nobody can hold. → labelled *Derivative* and never ranked.
11. **`num_market_pairs` is ~100+ for every NVDA wrapper, derivatives feed included (112 with $0 volume).** It does not
    seem to count the wrapper's own markets, which makes it a weak signal. → it only weighs 20% of our score.
12. **Market pairs are refused on our plan** (`1006` on both `/v2/cryptocurrency/market-pairs/latest` and
    `/v5/real-world-assets/market-pairs/list`). → "where to buy" relies on chains, contracts, `tradfi_markets` and
    issuer links. `tradfi_markets` (e.g. Binance Stocks for NVDA) is a great field — more venues there would help.
