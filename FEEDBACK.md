# CoinMarketCap API feedback

Feedback for the CMC API team, collected while building WrapScout.

## A. Friction we designed around before having a key

These were reported publicly by round-1 builders. We built defences for each one and will **re-verify them with
our own key** (`npm run explore`), keeping only those that still reproduce.

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

Observed on 2026-11-18 against `pro-api.coinmarketcap.com` (keyless `/public-api` surface; keyed findings to follow).

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
