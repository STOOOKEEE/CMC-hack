# TODO — WrapScout (CMC API Hackathon Round 2, track RWA)

Spec : [`docs/superpowers/specs/2026-11-18-wrapscout-design.md`](docs/superpowers/specs/2026-11-18-wrapscout-design.md)
Plan d'implémentation : [`docs/superpowers/plans/2026-11-18-wrapscout.md`](docs/superpowers/plans/2026-11-18-wrapscout.md)
Deadline : **mer 9 déc 23:59 UTC** · Objectif de soumission : **lun 7 déc** · Feature freeze : **ven 4 déc**

> État au 18 nov : le code du MVP est écrit et testé (73 tests unitaires, 8 tests e2e) sur des **données
> synthétiques**. Ce qui reste demande une vraie clé CMC, un compte d'hébergement ou une action humaine.

## Phase 0 — Setup & vérité terrain API (mer 18 – jeu 19 nov)
- [ ] S'inscrire sur DoraHacks **avec l'email du compte CoinMarketCap** (pour le plan Startup gratuit)
- [ ] Récupérer la clé API, vérifier le plan, le quota et la limite/minute (`GET /v1/key/info`)
- [ ] Vérifier la durée du plan gratuit (doit couvrir le jugement jusqu'au 25 déc.)
- [ ] Lire les règles officielles DoraHacks : top 30 global ou par track ? exigences exactes (feedback API, vidéo, durée)
- [x] Init du repo : Next.js + TypeScript + Tailwind, Vitest, ESLint, `.env.example`, `.gitignore` (`.env*`)
- [x] Script d'exploration `scripts/explore.ts` qui appelle chaque endpoint et sauve la réponse brute
- [ ] **Lancer** `npm run explore -- NVDA TSLA XAU SPY MS` avec la clé → enregistre les vraies réponses dans `fixtures/live/`
- [ ] Comparer `fixtures/live/` aux fixtures synthétiques `fixtures/cmc/` ; corriger `src/lib/normalize.ts` si des noms de champs diffèrent
- [ ] Vérifier les formes de réponse (v5 `quotes` = tableau, `about` = objet, champs de `tokens[]`)
- [ ] Lire le tableau « où acheter » affiché par `explore` (RWA market-pairs → crypto market-pairs → DEX) et **acter la décision** dans la spec §6.4
- [x] Ouvrir `FEEDBACK.md` (section A prête) — [ ] remplir la section B avec nos propres constats

## Phase 1 — Données + score (ven 20 – mar 24 nov)
- [x] `lib/cmc/client.ts` : clé en header serveur, retry/backoff sur 429/5xx, distinction 403/404/405, comptage crédits
- [x] `lib/cache.ts` : LRU + TTL + coalescence des requêtes identiques
- [x] `lib/cmc/endpoints.ts` : rwaMap, rwaAssetsList, rwaQuotes, rwaInfo, cryptoInfo, cryptoQuotes, cryptoMarketPairs, keyInfo
- [x] Gestion du batch `/v2/cryptocurrency/info` qui échoue sur un id inconnu (retirer, relancer, mémoriser)
- [x] Normalisation : prix USD v5, `price: null`, chaîne + contrat par wrapper
- [x] `lib/score/` : éligibilité (null, plancher volume, unité > 25 %), score L/F/B, labels, raisons
- [x] Cas limites : 0 éligible, 1 éligible, égalités
- [x] Tests Vitest sur fixtures synthétiques (or avec unités mélangées, actif sans marché, wrapper à 43 $ de volume…)
- [ ] Rejouer les tests avec les vraies réponses une fois la Phase 0 faite
- [x] CI GitHub Actions : lint + typecheck + tests + build + e2e

## Phase 2 — UI MVP + 1er déploiement (mer 25 – lun 30 nov)
- [x] Route `/api/search-index` + autocomplétion côté client
- [x] Accueil : recherche, grille « Popular »
- [x] Page actif `/a/[symbol]` : en-tête, carte Best pick + raisons, tableau comparatif, avertissements
- [x] Page `/method` : formule, seuils, labels, endpoints
- [x] Footer : « Not financial advice », source CMC ; fraîcheur des données sur la page actif
- [ ] **Choisir l'hébergeur** (Vercel gratuit ou Railway) et **déployer au plus tard ven 27 nov** avec `CMC_API_KEY` et `SITE_URL`
- [ ] Faire tester le parcours par quelqu'un qui n'a pas codé le projet

## Phase 3 — Où acheter + robustesse + finitions (mar 1 – ven 4 déc)
- [x] Section « Where to buy » : exchanges (si le plan le permet) + chaîne + contrat + explorer + note émetteur
- [x] `npm run snapshot` écrit tout l'univers cherchable ; servi si CMC échoue, avec bandeau daté
- [ ] **Générer le vrai snapshot** (`npm run snapshot`, ~30 min) et le commiter avant le déploiement, puis avant la soumission
- [x] `data/issuers.json` : note d'accès par émetteur (US, KYC) + lien, affichée sur la carte (spec §6.6)
- [ ] Relire `data/issuers.json` contre les conditions actuelles de chaque émetteur
- [x] Timeout serveur 8 s → snapshot ; squelettes de chargement ; ticker inconnu → suggestions
- [x] Responsive mobile (inputs 16 px, cibles tactiles 44 px, pas de scroll horizontal de page)
- [x] Filtre « How do you buy? » (par chaîne)
- [x] Images OpenGraph par actif
- [x] Tests Playwright de fumée (8 scénarios)
- [x] Endpoint JSON public `/api/asset/[symbol]`
- [ ] (Bonus) serveur MCP `best_wrapper` — seulement si tout le reste est propre
- [ ] **Feature freeze ven 4 déc au soir**

## Phase 4 — Soumission (sam 5 – lun 7 déc)
- [x] README (lien live et vidéo à compléter)
- [x] JUDGE.md (lien live à compléter)
- [ ] FEEDBACK.md finalisé (section B)
- [ ] Remplacer les captures `docs/screenshots/` (données démo) par des captures en données réelles
- [ ] Vidéo démo 2–3 min (NVDA → or/unités → actif sans marché → méthode)
- [x] Licence MIT
- [ ] Repo public
- [ ] Formulaire DoraHacks, track **Real World Assets**
- [ ] Post X : lien DoraHacks + vidéo + `#BuildwithCMC` + liste des endpoints
- [ ] **Soumis lun 7 déc**

## Après la deadline (10 – 30 déc)
- [ ] Vérifier chaque jour que le site répond et que le quota tient ; régénérer le snapshot si besoin
