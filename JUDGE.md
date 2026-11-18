# Judging WrapScout in 60 seconds

**The question:** "I want to own Nvidia through a token. Which of its 8 tokenized versions should I buy?"

Open the live site (_link coming soon_) and click through:

1. **`/a/nvda`** — the Best pick card answers *which one, why, where*. Below it, every other version with what is
   wrong with it (no market, $43 of daily volume…). Try the **"How do you buy?"** chain filter.
2. **`/a/xau`** (gold) — per-gram tokens are flagged **Different unit** instead of being compared with per-ounce ones.
   A naive price sort would call this a 3,000% spread.
3. **An asset with no market** (for example `/a/ms` in demo mode) — no fake "best": the page says
   *No tradable version right now* and shows why.
4. **`/method`** — the full, deterministic formula and every CoinMarketCap endpoint used.
5. **`/api/asset/nvda`** — the same answer as JSON.

What to look at:

- **Useful to a real person:** one question, one answer, plus the traps a beginner would fall into.
- **Interesting API use:** RWA v5 quotes (`tokens[]`) joined with cryptocurrency info, quotes and market pairs
  through `crypto_id` to turn a list of wrappers into a decision.
- **It works:** live data with a 2-minute cache, and a dated snapshot fallback if CMC is unreachable.
  Tests: `npm test` and `npm run e2e`.
