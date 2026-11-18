# TODO — WrapScout (CMC API Hackathon Round 2, track RWA)

Spec : [`docs/superpowers/specs/2026-11-18-wrapscout-design.md`](docs/superpowers/specs/2026-11-18-wrapscout-design.md)
Deadline : **mer 9 déc 23:59 UTC** · Objectif de soumission : **lun 7 déc** · Feature freeze : **ven 4 déc**

## Phase 0 — Setup & vérité terrain API (mer 18 – jeu 19 nov)
- [ ] S'inscrire sur DoraHacks **avec l'email du compte CoinMarketCap** (pour le plan Startup gratuit)
- [ ] Récupérer la clé API, vérifier le plan, le quota et la limite/minute (`GET /v1/key/info`)
- [ ] Vérifier la durée du plan gratuit (doit couvrir le jugement jusqu'au 25 déc.)
- [ ] Lire les règles officielles DoraHacks : top 30 global ou par track ? exigences exactes (feedback API, vidéo, durée)
- [ ] Init du repo : Next.js + TypeScript + Tailwind, Vitest, ESLint, `.env.example`, `.gitignore` (`.env*`)
- [ ] Script d'exploration `scripts/explore.ts` qui appelle chaque endpoint et sauve la réponse brute
- [ ] Enregistrer les fixtures : NVDA, TSLA, AAPL, or, un ETF (ex. SPY/SGOV), un actif sans marché (ex. MS)
- [ ] Vérifier les formes de réponse (v5 `quotes` = tableau, `about` = objet, champs de `tokens[]`)
- [ ] Tester « où acheter » dans l'ordre : RWA market-pairs → crypto market-pairs → API DEX → repli
- [ ] **Acter la décision « où acheter »** et la noter dans la spec §6.4
- [ ] Ouvrir `FEEDBACK.md` et y noter chaque friction rencontrée

## Phase 1 — Données + score (ven 20 – mar 24 nov)
- [ ] `lib/cmc/client.ts` : clé en header serveur, retry/backoff sur 429/5xx, distinction 403/404/405, comptage crédits
- [ ] `lib/cache.ts` : LRU + TTL + coalescence des requêtes identiques
- [ ] `lib/cmc/endpoints.ts` : rwaMap, rwaAssetsList, rwaQuotes, rwaInfo, cryptoInfo, cryptoQuotes, keyInfo
- [ ] Gestion du batch `/v2/cryptocurrency/info` qui échoue sur un id inconnu (retirer, relancer, mémoriser)
- [ ] Normalisation : prix USD v5, `price: null`, chaîne + contrat par wrapper
- [ ] `lib/score/` : éligibilité (null, plancher volume, unité > 25 %), score L/F/B, labels, raisons
- [ ] Cas limites : 0 éligible, 1 éligible, égalités
- [ ] Tests Vitest sur fixtures (or avec unités mélangées, actif sans marché, wrapper à 43 $ de volume…)
- [ ] CI GitHub Actions : lint + typecheck + tests

## Phase 2 — UI MVP + 1er déploiement (mer 25 – lun 30 nov)
- [ ] Route `/api/search-index` (map filtré `has_tokens`, cache 24 h) + autocomplétion côté client
- [ ] Accueil : recherche, onglets par type, grille « Popular » (assets/list)
- [ ] Page actif `/a/[symbol]` : en-tête, carte Best pick + raisons, tableau comparatif, avertissements
- [ ] Page `/method` : formule, seuils, labels, endpoints
- [ ] Footer : « Not financial advice », source CMC, fraîcheur des données
- [ ] **Déployer sur Railway (au plus tard ven 27 nov)** avec `CMC_API_KEY` en variable d'env
- [ ] Faire tester le parcours par quelqu'un qui n'a pas codé le projet

## Phase 3 — Où acheter + robustesse + finitions (mar 1 – ven 4 déc)
- [ ] Section « Where to buy » selon la décision de Phase 0 (ou repli : chaîne + contrat + explorer + liens émetteurs étiquetés)
- [ ] `npm run snapshot` : JSON des ~50 actifs populaires, commité ; servi si CMC échoue, avec bandeau daté
- [ ] Timeout serveur 8 s → snapshot ; squelettes de chargement ; ticker inconnu → suggestions
- [ ] Responsive mobile (inputs 16 px, cibles tactiles 44 px)
- [ ] Filtre « How do you buy? » (Any / Exchange / par chaîne)
- [ ] Images OpenGraph par actif
- [ ] Test Playwright de fumée : accueil → « nvda » → Best pick visible
- [ ] (Bonus seulement si tout est propre) endpoint JSON public `/api/asset/[symbol]` documenté
- [ ] (Bonus) serveur MCP `best_wrapper`
- [ ] **Feature freeze ven 4 déc au soir**

## Phase 4 — Soumission (sam 5 – lun 7 déc)
- [ ] README : problème, captures/GIF, lien live, tableau des endpoints, lancer en local, archi, méthode, limites
- [ ] JUDGE.md : « 60 secondes pour juger »
- [ ] FEEDBACK.md finalisé
- [ ] Vidéo démo 2–3 min (NVDA → or/unités → actif sans marché → méthode)
- [ ] Repo public, licence MIT
- [ ] Formulaire DoraHacks, track **Real World Assets**
- [ ] Post X : lien DoraHacks + vidéo + `#BuildwithCMC` + liste des endpoints
- [ ] **Soumis lun 7 déc**

## Après la deadline (10 – 30 déc)
- [ ] Vérifier chaque jour que le site répond et que le quota tient
