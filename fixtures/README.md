# Fixtures

## `cmc/` — SYNTHETIC raw API responses

These files mimic CoinMarketCap API response shapes (`{ status, data }`) for the endpoints WrapScout
uses. **They are synthetic**: shapes are modelled on public write-ups from round-1 hackathon projects,
and every value (prices, volumes, ids, contract addresses, exchanges) is illustrative.

**Exception:** in `crypto-info.json`, the entries for ids `4705` (PAXG), `5176` (XAUt), `36992` (NVDAX) and `38093`
(NVDAon) are **real** `/v2/cryptocurrency/info` responses captured on 2026-11-18 from the keyless public API
(trimmed to the fields we read; marked with `_source`). They revealed multi-chain deployments and explorer-link
mismatches that the synthetic data did not have (see FEEDBACK.md §B).

They power the unit tests and the demo snapshot. Once a CMC API key is available, run:

```bash
npm run explore -- NVDA TSLA XAU SPY MS
```

which records real responses into `fixtures/live/`. Compare them with these files and adjust
`src/lib/normalize.ts` if field names differ.

Notable cases on purpose:
- **NVDA**: 8 wrappers — 6 priced (one with $43 of 24h volume, one whose `tokens[]` volume is null
  but whose crypto quote has volume) and 2 with `price: null`.
- **XAU (gold)**: 5 wrappers priced per troy ounce and 2 priced per gram (unit mismatch).
- **MS**: a single wrapper with no market.

## `demo-snapshot/` — generated

Built from `cmc/` by `npm run demo-snapshot`, served when no API key and no real snapshot exist.
The UI labels it "Demo data".
