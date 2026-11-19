# TODO — WrapScout (CMC API Hackathon Round 2, track RWA)

Spec : [`docs/superpowers/specs/2026-11-18-wrapscout-design.md`](docs/superpowers/specs/2026-11-18-wrapscout-design.md)
Plan d'implémentation : [`docs/superpowers/plans/2026-11-18-wrapscout.md`](docs/superpowers/plans/2026-11-18-wrapscout.md)
Deadline : **mer 9 déc 23:59 UTC** · Objectif de soumission : **lun 7 déc** · Feature freeze : **ven 4 déc**

> État au 18 nov : MVP + bonus MCP écrits et testés (104 tests unitaires, 11 tests e2e, CI GitHub verte) sur des
> **données synthétiques**. Kit de soumission prêt (`SUBMISSION.md`, `npm run record-demo`). Ce qui reste demande
> une vraie clé CMC, un hébergement ou une action humaine — les lignes **[VOUS]** ci-dessous.

## Phase 0 — Setup & vérité terrain API (mer 18 – jeu 19 nov)
- [x] **[VOUS]** S'inscrire sur DoraHacks **avec l'email du compte CoinMarketCap** (pour le plan Startup gratuit)
- [x] Récupérer la clé API, vérifier le plan, le quota et la limite/minute (`GET /v1/key/info`) — 15 000 crédits/mois, 50 appels/min (plan Startup pas encore visible sur la clé)
- [ ] Vérifier la durée du plan gratuit (doit couvrir le jugement jusqu'au 25 déc.)
- [ ] Lire les règles officielles DoraHacks : top 30 global ou par track ? exigences exactes (feedback API, vidéo, durée)
- [x] Init du repo : Next.js + TypeScript + Tailwind, Vitest, ESLint, `.env.example`, `.gitignore` (`.env*`)
- [x] Script d'exploration `scripts/explore.ts` qui appelle chaque endpoint et sauve la réponse brute
- [x] **Lancer** `npm run explore -- NVDA TSLA XAU SPY MS` avec la clé → enregistre les vraies réponses dans `fixtures/live/`
- [x] Comparer `fixtures/live/` aux fixtures synthétiques `fixtures/cmc/` ; corriger `src/lib/normalize.ts` si des noms de champs diffèrent
- [x] Vérifier les formes de réponse (v5 `quotes` = tableau, `about` = objet, champs de `tokens[]`, enveloppe `rwa_assets`, param `rwa_id`)
- [x] Lire le tableau « où acheter » affiché par `explore` (RWA market-pairs → crypto market-pairs → DEX) et **acter la décision** dans la spec §6.4
- [x] Ouvrir `FEEDBACK.md` — sections A (revérifiée) et B (12 constats réels) remplies

## Phase 1 — Données + score (ven 20 – mar 24 nov)
- [x] `lib/cmc/client.ts` : clé en header serveur, retry/backoff sur 429/5xx, distinction 403/404/405, comptage crédits
- [x] `lib/cache.ts` : LRU + TTL + coalescence des requêtes identiques
- [x] `lib/cmc/endpoints.ts` : rwaMap, rwaAssetsList, rwaQuotes, rwaInfo, cryptoInfo, cryptoQuotes, cryptoMarketPairs, keyInfo
- [x] Gestion du batch `/v2/cryptocurrency/info` qui échoue sur un id inconnu (retirer, relancer, mémoriser)
- [x] Normalisation : prix USD v5, `price: null`, chaîne + contrat par wrapper
- [x] `lib/score/` : éligibilité (null, plancher volume, unité > 25 %), score L/F/B, labels, raisons
- [x] Cas limites : 0 éligible, 1 éligible, égalités
- [x] Tests Vitest sur fixtures synthétiques (or avec unités mélangées, actif sans marché, wrapper à 43 $ de volume…)
- [x] Rejouer les tests avec les vraies réponses une fois la Phase 0 faite
- [x] CI GitHub Actions : lint + typecheck + tests + build + e2e

## Phase 2 — UI MVP + 1er déploiement (mer 25 – lun 30 nov)
- [x] Route `/api/search-index` + autocomplétion côté client
- [x] Accueil : recherche, grille « Popular »
- [x] Page actif `/a/[symbol]` : en-tête, carte Best pick + raisons, tableau comparatif, avertissements
- [x] Page `/method` : formule, seuils, labels, endpoints
- [x] Footer : « Not financial advice », source CMC ; fraîcheur des données sur la page actif
- [ ] **[VOUS] Déployer sur Vercel (gratuit) au plus tard ven 27 nov** avec `CMC_API_KEY` et `SITE_URL` — étapes dans `SUBMISSION.md`.
  Railway testé le 18/11 : essai du compte expiré, il faudrait un plan payant.
- [ ] Faire tester le parcours par quelqu'un qui n'a pas codé le projet

## Phase 3 — Où acheter + robustesse + finitions (mar 1 – ven 4 déc)
- [x] Section « Where to buy » : exchanges (si le plan le permet) + chaîne + contrat + explorer + note émetteur
- [x] `npm run snapshot` écrit tout l'univers cherchable ; servi si CMC échoue, avec bandeau daté
- [x] **Générer le vrai snapshot** (`npm run snapshot`, ≈ 35 min, ≈ 1 000 crédits) et le commiter avant le déploiement, puis avant la soumission ; vérifier la ligne « degraded » en fin de script
- [x] Phase 0 : vérifier si `/v5/real-world-assets/info` accepte plusieurs ids (diviserait le coût du snapshot par ~6) et ce que vaut le consensus de l'or (XAU)
- [x] `data/issuers.json` : note d'accès par émetteur (US, KYC) + lien, affichée sur la carte (spec §6.6)
- [ ] Relire `data/issuers.json` contre les conditions actuelles de chaque émetteur
- [x] Timeout serveur 8 s → snapshot ; squelettes de chargement ; ticker inconnu → suggestions
- [x] Responsive mobile (inputs 16 px, cibles tactiles 44 px, pas de scroll horizontal de page)
- [x] Filtre « How do you buy? » (par chaîne)
- [x] Images OpenGraph par actif
- [x] Tests Playwright de fumée (8 scénarios)
- [x] Endpoint JSON public `/api/asset/[symbol]`
- [x] (Bonus) serveur MCP : `search_tokenized_assets`, `best_tokenized_version`, `compare_tokenized_versions`
- [ ] **Feature freeze ven 4 déc au soir**

## Phase 4 — Soumission (sam 5 – lun 7 déc)
- [x] README (lien live et vidéo à compléter)
- [x] JUDGE.md (lien live à compléter)
- [x] FEEDBACK.md finalisé (section B)
- [x] Remplacer les captures `docs/screenshots/` (données démo) par des captures en données réelles
- [x] Script d'enregistrement de la vidéo sous-titrée (`npm run record-demo`, WebM + MP4)
- [ ] Enregistrer la vidéo **sur le site en ligne** : `BASE_URL=<url> npm run record-demo`, puis l'uploader
- [x] Licence MIT
- [ ] Repo public
- [ ] Formulaire DoraHacks, track **Real World Assets**
- [ ] Post X : lien DoraHacks + vidéo + `#BuildwithCMC` + liste des endpoints
- [ ] **Soumis lun 7 déc**

## Après la deadline (10 – 30 déc)
- [ ] Vérifier chaque jour que le site répond et que le quota tient ; régénérer le snapshot si besoin
