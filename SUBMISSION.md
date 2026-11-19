# Kit de soumission — WrapScout

Tout ce qu'il faut coller dans DoraHacks et sur X. Les textes à copier sont en anglais (juges internationaux).
Il reste à remplacer `<VIDEO_URL>` et `<DORAHACKS_URL>` avant de publier.

## Redéployer (déjà en ligne)

Le projet Vercel `wrapscout` existe (compte stoookeee) et `CMC_API_KEY` y est configurée en variable « sensitive ».
L'app GitHub de Vercel n'a pas accès au dépôt, donc pas de déploiement automatique au push : redéployer avec

```bash
VERCEL_ORG_ID=team_syyUoceNOPZEDWq6gXE25vgv VERCEL_PROJECT_ID=prj_TxBvsTRtI17PWw9YF0ijoNsNQMdo npx vercel deploy --prod --yes
```

(ou connecter le dépôt dans Vercel → Project → Settings → Git pour déployer à chaque push).

## Déployer (Vercel, gratuit — ~5 min) — pour mémoire

Railway n'est pas utilisable : l'essai du compte a expiré et il faudrait un plan payant. Vercel gratuit suffit :

1. vercel.com → *Add New… → Project* → importer `STOOOKEEE/CMC-hack` (autoriser l'app GitHub de Vercel si demandé).
2. *Framework* : Next.js (détecté). Branche de production : celle qui contient le code
   (`claude/dazzling-faraday-berku0`, ou `main` après fusion).
3. *Environment Variables* : `CMC_API_KEY` = la clé CMC ; `SITE_URL` = l'URL Vercel du projet (ex. `https://wrapscout.vercel.app`).
4. *Deploy*. Ouvrir `/a/nvda` : il ne doit **pas** y avoir de bandeau « Demo data ».
5. Après chaque `npm run snapshot` commité, Vercel redéploie tout seul.

Sans clé, le site se déploie quand même, en mode démo (bandeau visible).

## Checklist avant de soumettre

- [x] Site en ligne avec la vraie clé CMC : https://wrapscout-ten.vercel.app (Vercel, données live vérifiées le 19/11)
- [x] `data/snapshot/` généré avec la vraie clé et commité (905 actifs, 18/11) — à régénérer juste avant de soumettre
- [ ] `npm test` et `npm run e2e` verts sur la branche soumise
- [x] Vidéo enregistrée en données réelles (`demo/wrapscout-demo.mp4`, 19/11). Pour la refaire : `BASE_URL=https://wrapscout-ten.vercel.app npm run record-demo` (ou un serveur local avec la clé)
- [ ] Vidéo uploadée (YouTube non répertorié ou directement sur X)
- [x] Captures `docs/screenshots/` refaites en données réelles
- [x] README / JUDGE.md : lien live rempli — [ ] lien vidéo
- [x] FEEDBACK.md section B remplie (12 constats réels)
- [ ] Repo public
- [ ] Formulaire DoraHacks rempli (ci-dessous), track **Real World Assets**
- [ ] Post X publié (ci-dessous) avec `#BuildwithCMC`, lien DoraHacks, vidéo, endpoints

---

## DoraHacks — champs du formulaire

**Project name:** WrapScout

**Tagline (short):** Which token should I buy to own Nvidia? Every tokenized version of an asset, ranked — with the
best pick, why, and where to buy.

**Track:** Real World Assets

**Description:**

> Stocks, ETFs and commodities now exist in several tokenized versions — xStocks, Ondo, Robinhood, bStocks, Dinari,
> Paxos, Tether… on different chains, with very different liquidity. Many have no market at all, some trade a few
> dollars a day with a drifting price, and some are quoted in a different unit (gold per gram vs per ounce). A normal
> buyer has no easy way to know which one to pick.
>
> WrapScout takes one asset and ranks every tokenized version of it with a transparent, deterministic score built on
> CoinMarketCap data: liquidity (50%), price fidelity (30%) and market reach (20%), after filtering out versions with
> no market, under $10k of daily volume, or quoted in another unit. It returns:
>
> - the **best pick**, with plain-language reasons;
> - **where to buy** it: exchanges, chain, contract, explorer, and a short note on who the issuer serves;
> - **every other version** and what is wrong with it, plus a "How do you buy?" filter by chain.
>
> The same answer is available as a **JSON API** (`/api/asset/nvda`) and as an **MCP server**, so an AI assistant
> can answer "which tokenized Tesla should I buy?" with a reproducible ranking instead of guessing. The site keeps
> working if CMC is unreachable by serving a dated snapshot.

**How we use the CoinMarketCap API:**

> The core is a join only CMC makes possible: one `/v5/real-world-assets/quotes/latest` call returns every wrapper of
> an asset with its issuer, price and volume; each wrapper's `crypto_id` then resolves through the cryptocurrency API
> to its chain, contract, markets and exchanges.
>
> - `GET /v5/real-world-assets/map` — search index (underlyings with `has_tokens`)
> - `GET /v5/real-world-assets/assets/list` — popular assets by tokenized market cap
> - `GET /v5/real-world-assets/quotes/latest` — consensus price + every wrapper (`tokens[]`)
> - `GET /v5/real-world-assets/info` — registrant metadata (industry, SEC CIK)
> - `GET /v2/cryptocurrency/info` — chain, contract, explorer per wrapper
> - `GET /v2/cryptocurrency/quotes/latest` — `num_market_pairs` and 24h volume per wrapper
> - `GET /v2/cryptocurrency/market-pairs/latest` — exchanges for the top wrappers

**Links:** Live `https://wrapscout-ten.vercel.app` · Video `<VIDEO_URL>` · Code `https://github.com/STOOOKEEE/CMC-hack` · Judge guide `https://github.com/STOOOKEEE/CMC-hack/blob/HEAD/JUDGE.md`

**API feedback:** see `FEEDBACK.md` in the repo.

---

## Post X (principal)

> Which token should I buy to own $NVDA? 🔎
>
> WrapScout ranks every tokenized version of a stock, ETF or commodity: best pick, why, where to buy — and the traps
> (no market, derivatives feeds posing as tokens, gold per gram vs per ounce).
>
> Built on the CoinMarketCap API #BuildwithCMC
> <DORAHACKS_URL>
> 🎥 <VIDEO_URL>

## Réponse au post (les endpoints, exigés par le règlement)

> CMC API endpoints used:
> /v5/real-world-assets/map
> /v5/real-world-assets/assets/list
> /v5/real-world-assets/quotes/latest
> /v5/real-world-assets/info
> /v2/cryptocurrency/info
> /v2/cryptocurrency/quotes/latest
> /v2/cryptocurrency/market-pairs/latest
>
> Live: https://wrapscout-ten.vercel.app · Code: https://github.com/STOOOKEEE/CMC-hack

(Si le règlement exige les endpoints **dans** le post principal, mettre la liste dans une image jointe — par exemple une
capture de la page `/method`, section « CoinMarketCap endpoints used ».)

---

## Script de la vidéo (≈ 1 min 30, sous-titrée automatiquement par `npm run record-demo`)

1. Accueil — « Nvidia, Tesla, gold… now exist as several tokens on different chains. Which one should you buy? »
2. Recherche « Nvidia » → page NVDA — « Every tokenized version, joined from the RWA and cryptocurrency APIs. »
3. Carte Best pick — raisons (liquidité, prix aligné, nombre de marchés).
4. Where to buy — exchanges, chaîne, contrat, note émetteur.
5. Tableau — les pièges : sans marché, 43 $/jour.
6. Filtre Ethereum — « Best on Ethereum ».
7. Or (`/a/gold`) — unités différentes (gramme vs once).
8. `/method` — score déterministe, 7 endpoints, API JSON, serveur MCP.
9. Carte de fin — « #BuildwithCMC ».

Pour une voix off : lire ces phrases par-dessus la vidéo, ou laisser les sous-titres seuls.
