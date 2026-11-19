# Brief pour l'agent de soumission — WrapScout

Tu vas soumettre le projet **WrapScout** au hackathon **Build with CMC: API Hackathon — Round 2** (DoraHacks).
Le produit est **terminé et en ligne**. Ton travail : publier la vidéo, rendre le dépôt public, remplir la
soumission DoraHacks et publier le post X. **Tu ne modifies pas le code.**

> Tu agis au nom de l'utilisateur sur des comptes publics. **Demande-lui confirmation avant chaque action
> publique** (passage du repo en public, upload de la vidéo, envoi de la soumission, publication sur X), en lui
> montrant ce que tu vas publier.

---

## 1. Infos de référence

| | |
|---|---|
| Hackathon | Build with CMC: API Hackathon — Round 2 · https://dorahacks.io/hackathon/coinmarketcap-api-202611 |
| Deadline | **mercredi 9 décembre 2026, 23:59 UTC** (jeudi 10 déc. 00:59 heure de Paris). Viser **lundi 7 décembre**. |
| Track | **Real World Assets** |
| Inscription | Déjà faite par l'utilisateur, avec l'email de son compte CoinMarketCap |
| Nom du projet | **WrapScout** |
| Site en ligne | **https://wrapscout-ten.vercel.app** |
| Code | **https://github.com/STOOOKEEE/CMC-hack** (branche `claude/dazzling-faraday-berku0`) |
| Vidéo démo | `docs/media/wrapscout-demo.mp4` dans le dépôt (1 min 04, sous-titrée, données réelles). L'utilisateur l'a aussi reçue en fichier. |
| Logo (carré 512×512) | `docs/brand/logo.png` |
| Couverture (1200×630) | `docs/brand/cover.png` |
| Guide pour les juges | `JUDGE.md` · Retours sur l'API : `FEEDBACK.md` |

Une fois le dépôt public, les fichiers sont téléchargeables via
`https://github.com/STOOOKEEE/CMC-hack/raw/claude/dazzling-faraday-berku0/<chemin>`
(ex. `.../docs/brand/logo.png`). Avant, demande-les à l'utilisateur.

## 2. Ce que le règlement exige (connu)

- Un projet fonctionnel qui utilise l'API CoinMarketCap, **une seule track** choisie à la soumission.
- **Une démo vidéo.**
- **Un post X/Twitter** avec : le lien vers la soumission DoraHacks, la vidéo, le hashtag **#BuildwithCMC**, et
  **la liste des endpoints CMC utilisés**.
- Barème : ça marche 30 · utile à une vraie personne 25 · usage intéressant de l'API 20 · code & doc 15 · présentation 10.

Si le formulaire DoraHacks demande autre chose, voir §8. **N'invente rien** : demande à l'utilisateur.

---

## 3. Vérifications avant de commencer (5 min)

Ouvre et vérifie :

1. https://wrapscout-ten.vercel.app — page d'accueil avec une barre de recherche et une grille « Popular ».
2. https://wrapscout-ten.vercel.app/a/nvda — une carte **« Best pick »** verte. **Aucun bandeau jaune** « Demo data » ou
   « Live data unavailable » en haut de page.
3. https://wrapscout-ten.vercel.app/a/gold — des jetons marqués **« Different unit »** (cotés au gramme).
4. https://wrapscout-ten.vercel.app/method et https://wrapscout-ten.vercel.app/terms s'affichent.
5. https://wrapscout-ten.vercel.app/api/asset/nvda renvoie du JSON avec `"dataMode":"live"`.

Si un point échoue : **arrête-toi** et préviens l'utilisateur (il relancera la session de développement).
Un bandeau « Live data unavailable » seul n'est pas bloquant (le site sert alors une copie datée), mais signale-le.

---

## 4. Étape 1 — Rendre le dépôt GitHub public

1. GitHub → `STOOOKEEE/CMC-hack` → **Settings** → **General** → *Danger Zone* → **Change visibility** → **Public**.
2. **Settings** → **Branches** : vérifie que la branche par défaut est `claude/dazzling-faraday-berku0` (c'est la
   seule branche). La page d'accueil du dépôt doit afficher le README avec la capture de Nvidia.
3. Ne pousse aucun code, ne renomme pas la branche.

Le dépôt ne contient aucun secret (la clé CMC n'a jamais été commitée ; elle est dans les variables Vercel).

## 5. Étape 2 — Publier la vidéo

Upload `docs/media/wrapscout-demo.mp4` sur **YouTube en « Non répertoriée »** (Unlisted), avec :

- **Titre :** `WrapScout — Which token should I buy to own Nvidia? (CMC API Hackathon, RWA track)`
- **Description :**

```text
WrapScout ranks every tokenized version of a stock, ETF or commodity using CoinMarketCap data: the best pick, why, where to buy it, and what is wrong with the others (no market, derivatives price feeds, gold per gram vs per ounce).

Live: https://wrapscout-ten.vercel.app
Code: https://github.com/STOOOKEEE/CMC-hack
Built for the Build with CMC: API Hackathon — Real World Assets track. #BuildwithCMC
Not financial advice.
```

Note l'URL de la vidéo → `<VIDEO_URL>`. La même vidéo sera **aussi jointe directement au post X** (étape 4).

## 6. Étape 3 — Créer la soumission (BUIDL) sur DoraHacks

Depuis la page du hackathon, bouton **« Submit BUIDL »** (ou créer un BUIDL puis le soumettre au hackathon).
Remplis avec les valeurs ci-dessous (en anglais, à copier-coller) :

**BUIDL name :** `WrapScout`

**Logo :** `docs/brand/logo.png` · **Cover / banner :** `docs/brand/cover.png`

**Tagline / one-liner :**

```text
Which token should I buy to own Nvidia? Every tokenized version of an asset, ranked — best pick, why, and where to buy.
```

**Track :** `Real World Assets`

**Tags :** `RWA`, `Tokenized Stocks`, `CoinMarketCap API`, `Next.js`, `MCP`

**Description (Markdown) :**

```markdown
## The problem
Stocks, ETFs and commodities now exist as several tokens: Nvidia alone has 9 tokenized versions on CoinMarketCap (xStocks, Ondo, Robinhood, bStocks, Coinbase, Reality, Dinari…), spread across Solana, Ethereum, BNB Chain, Arbitrum, Base and more. Some have no market at all, some are derivatives price feeds rather than tokens, and some are quoted in a different unit (gold per gram vs per ounce). A buyer has no simple way to know which one to pick.

## What WrapScout does
Type an asset and WrapScout ranks every tokenized version of it with a transparent, deterministic score built on CoinMarketCap data:

- **Best pick** with plain-language reasons (e.g. "Most liquid version: $198M traded in 24h, 2× the next one").
- **Where to buy it**: chain, contract, explorer link, the other chains it is deployed on, the issuer's eligibility note, and the stock venue CMC lists (e.g. Binance Stocks).
- **Every other version and what is wrong with it**: *No market*, *Too thin*, *Different unit*, *Derivative* (a futures price feed, not a token), or a weaker score.
- **"How do you buy?" filter**: the best version on your chain.

Score (0–100), after filtering out unusable versions: liquidity 50% (log of 24h volume), price fidelity 30% (distance from the volume-weighted median), market reach 20%. The formula and thresholds are public on /method.

## Built to work during judging
Live CoinMarketCap data with a 2-minute cache, a circuit breaker, and a committed snapshot of all 905 tokenized assets that the site serves (with a dated banner) if the API is unreachable. 119 unit tests and 14 end-to-end tests run in CI.

## Also for AI agents
The same answer is exposed as a JSON API (`/api/asset/nvda`) and as an **MCP server** (`search_tokenized_assets`, `best_tokenized_version`, `compare_tokenized_versions`), so an assistant can answer "which tokenized Tesla should I buy?" with a reproducible ranking instead of guessing.

## Links
- Live: https://wrapscout-ten.vercel.app (try /a/nvda, /a/gold, /a/tsla)
- Code: https://github.com/STOOOKEEE/CMC-hack
- 60-second judge guide: JUDGE.md in the repo

Not financial advice.
```

**How we use the CoinMarketCap API** (si un champ dédié existe ; sinon, ajoute-le à la fin de la description) :

```markdown
The core is a join only CMC makes possible: one `/v5/real-world-assets/quotes/latest` call (batched by `rwa_id`) returns every wrapper of an asset with its issuer, price and volume; each wrapper's `crypto_id` then resolves through the cryptocurrency API to its chains, contracts and market data.

- `GET /v5/real-world-assets/map` — search index (7,811 assets, 905 with tokens; paginated)
- `GET /v5/real-world-assets/assets/list` — popular assets by tokenized market cap
- `GET /v5/real-world-assets/quotes/latest` — consensus price, every wrapper (`tokens[]`), `tradfi_markets`
- `GET /v5/real-world-assets/info` — registrant metadata (industry, SEC CIK)
- `GET /v2/cryptocurrency/info` — every chain and contract a wrapper is deployed on
- `GET /v2/cryptocurrency/quotes/latest` — 24h volume and market count per wrapper
- `GET /v2/cryptocurrency/market-pairs/latest` — exchanges per wrapper when the plan allows it (refused on ours: handled gracefully)

Real API responses are committed in `fixtures/live/`; the client is `src/lib/cmc/`.
```

**API feedback** (si un champ dédié existe) :

```text
12 concrete findings with requests and error codes are in FEEDBACK.md (https://github.com/STOOOKEEE/CMC-hack/blob/HEAD/FEEDBACK.md). Highlights: the RWA family takes `rwa_id` (not `id`) and the 4002 error does not say so; v5 lists are wrapped in `rwa_assets` and the map is paginated with an undocumented max of 200; `error_code` is sometimes a number, sometimes a string; `tokens[]` mixes holdable tokens with derivatives price feeds ("NA (Derivatives)") with no field to tell them apart; and `urls.explorer` does not line up with `platform` for multi-chain tokens.
```

**Links :**
- Website / Demo : `https://wrapscout-ten.vercel.app`
- GitHub : `https://github.com/STOOOKEEE/CMC-hack`
- Video : `<VIDEO_URL>`
- X / Twitter : le lien du post de l'étape 4 (à ajouter après l'avoir publié)

**Team / contact :** demande à l'utilisateur (nom affiché, email = celui du compte CMC utilisé à l'inscription,
autres membres éventuels). Ne mets pas d'autre donnée personnelle.

Enregistre la soumission et **note son URL** → `<DORAHACKS_URL>` (format `https://dorahacks.io/buidl/<id>`).
Si DoraHacks propose un brouillon puis un envoi définitif, garde l'envoi définitif pour après l'étape 4.

## 7. Étape 4 — Publier sur X

Compte X de l'utilisateur. **Post principal** (261 caractères, sous la limite de 280), avec la **vidéo MP4 jointe** :

```text
Which token should I buy to own $NVDA? 🔎

WrapScout ranks every tokenized version of a stock, ETF or commodity: best pick, why, where to buy, and the traps to avoid.

Built on the @CoinMarketCap API #BuildwithCMC
<DORAHACKS_URL>
https://wrapscout-ten.vercel.app
```

**Réponse au post** (même fil, juste après) — la liste des endpoints exigée par le règlement :

```text
CMC API endpoints used:
/v5/real-world-assets/map
/v5/real-world-assets/assets/list
/v5/real-world-assets/quotes/latest
/v5/real-world-assets/info
/v2/cryptocurrency/info
/v2/cryptocurrency/quotes/latest
/v2/cryptocurrency/market-pairs/latest

Code: https://github.com/STOOOKEEE/CMC-hack
```

Si le règlement (relis la page DoraHacks) exige les endpoints **dans le post principal** : ajoute en image jointe
une capture de https://wrapscout-ten.vercel.app/method (section « CoinMarketCap endpoints used »).

Ensuite : copie l'URL du post X dans la soumission DoraHacks (champ X/Twitter ou fin de description), puis
**envoie la soumission définitivement**.

## 8. Si le formulaire demande autre chose

Réponses prêtes (en anglais) :

- **What makes it different?** — It is a decision tool, not a dashboard: one question, one answer, plus the traps a
  beginner would fall into. It handles the hard parts of real CMC data: multi-chain tokens, gold priced per gram vs per
  ounce, derivatives feeds listed next to tokens, and wrappers with no market.
- **Challenges?** — Matching the real v5 response shapes (see FEEDBACK.md) and keeping the site reliable during judging
  (cache, circuit breaker, committed snapshot of all 905 assets).
- **What's next?** — Exchange lists per wrapper with a higher CMC plan, price alerts when the best version changes,
  and a public MCP endpoint.
- **Proof of real API usage** — raw responses in `fixtures/live/`, client in `src/lib/cmc/`, live JSON at `/api/asset/nvda`.
- **Is it open source?** — Yes, MIT license.
- **Anything else** (budget, KYC, wallet address, deck, autre lien…) : **demande à l'utilisateur**, n'invente pas.

## 9. Après la soumission

Envoie à l'utilisateur les 3 URL : **soumission DoraHacks**, **vidéo YouTube**, **post X**. Il les transmettra à la
session de développement, qui remplira « Video: coming soon » dans le README et `JUDGE.md`.

## 10. À ne jamais faire

- Ne partage, n'affiche ni ne colle **aucune clé ou token** (clé CMC, token Vercel…). Tu n'en as pas besoin.
- Ne modifie ni le code, ni les réglages Vercel, ni la branche Git.
- Ne publie rien d'autre que ce qui est écrit ici, et pas sans l'accord de l'utilisateur.
- N'écris jamais que WrapScout « recommande d'acheter » : c'est un comparateur, pas un conseil financier.

## 11. Checklist finale

- [ ] Vérifications du §3 OK
- [ ] Dépôt GitHub public, README visible
- [ ] Vidéo sur YouTube (non répertoriée) → URL notée
- [ ] Soumission DoraHacks remplie (track Real World Assets, liens, description, endpoints) → URL notée
- [ ] Post X publié avec vidéo + lien DoraHacks + #BuildwithCMC, et réponse avec les endpoints
- [ ] URL du post X ajoutée à la soumission DoraHacks, soumission envoyée
- [ ] Les 3 URL transmises à l'utilisateur
