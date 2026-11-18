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

_To be filled in during Phase 0 with dates, requests and HTTP status codes from `fixtures/live/`._
