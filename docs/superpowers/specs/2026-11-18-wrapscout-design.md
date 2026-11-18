# WrapScout — Spec de design

> Nom de travail (notre choix, renommable). Pitch : **« Which token should I buy to own Nvidia? »**
> Hackathon : *Build with CMC: API Hackathon — Round 2* (DoraHacks), track **Real World Assets**.
> Rédigé le 18 novembre 2026. Deadline de soumission : **mercredi 9 décembre 2026, 23:59 UTC**.

---

## 1. Intention et pourquoi

### Le pourquoi de l'équipe
Objectif explicite : **finir dans le top 30** (récompense : clavier CMC). On ne vise pas la 1re place.
Ça dicte tout le reste : un produit **petit, qui marche parfaitement, utile à une vraie personne**,
avec une démo et une doc impeccables. Pas d'over-engineering.

Barème (sur 100) et ce qu'on en tire :

| Critère | Points | Ce que ça implique pour nous |
|---|---|---|
| Ça marche | 30 | Site live, zéro écran cassé, résiste aux quotas/erreurs CMC pendant tout le jugement (10–25 déc.) |
| Utile à une vraie personne | 25 | Une seule question, une réponse claire : « quel jeton acheter, pourquoi, et où » |
| Usage intéressant de l'API | 20 | Joindre plusieurs familles d'endpoints (RWA v5 + cryptocurrency + DEX si dispo) pour produire une décision |
| Code & doc | 15 | README clair, tests sur la logique de score, CI verte |
| Présentation | 10 | Vidéo démo courte, post X propre, page « méthode » transparente |

### Le problème utilisateur
Une action comme Nvidia existe en **plusieurs versions tokenisées** (« wrappers ») : xStocks/Backed
(`NVDAX`), Ondo (`NVDAon`), Robinhood, bStocks, Dinari… sur des chaînes différentes, avec des
liquidités très différentes. Le round 1 a montré que :
- beaucoup de wrappers **n'ont aucun marché** (prix `null`) ;
- certains ont un volume ridicule (quelques dizaines de $) et un prix qui dérive ;
- certains ne cotent **pas la même unité** (ex. or : 1 once vs 1 gramme) ;
- les versions vivent sur des chaînes différentes : ce n'est pas la même chose pour l'acheteur.

Une personne normale qui veut « acheter du Nvidia en crypto » n'a aucun moyen simple de savoir
**laquelle choisir**. Les projets RWA du round 1 (Shelfware, MirrorGap, Signal Desk) ciblaient des
analystes (recensement, écarts de prix, émetteurs). **Aucun n'aide l'acheteur à décider.** C'est notre angle.

### La personne cible
Un particulier déjà un peu crypto (a un compte sur un exchange ou un wallet) qui veut une exposition
à une action / un ETF / une matière première via un jeton, et qui veut éviter de se faire avoir.

### Ce que « réussi » veut dire
- Un juge tape `NVDA` → en < 3 s il voit **une recommandation**, **pourquoi**, **où l'acheter**, et
  la liste des autres versions avec ce qui cloche chez elles.
- Le site est en ligne et fonctionnel du dépôt jusqu'à la fin du jugement (30 déc.).
- Soumission complète (repo, vidéo, post X #BuildwithCMC avec endpoints) envoyée **avant le 7 déc.**

---

## 2. Objectifs, non-objectifs, anti-objectifs

### Objectifs (MVP)
1. **Recherche** d'un actif tokenisé (action, ETF, matière première, fonds) par ticker ou nom, avec autocomplétion.
2. **Page actif** : toutes les versions tokenisées, classées par un score transparent, avec :
   - une carte **« Best pick »** + 2–4 raisons en langage simple ;
   - un tableau comparatif (émetteur, chaîne, prix, écart vs consensus, volume 24h, nb de marchés, statut) ;
   - des **avertissements** explicites (pas de marché, trop peu liquide, unité différente, prix décroché) ;
   - **où l'acheter** (exchanges et/ou DEX, voir §6.4 — à confirmer en Phase 0).
3. **Page d'accueil** avec les actifs tokenisés les plus populaires (par market cap tokenisée).
4. **Page « Méthode »** : comment le score est calculé + endpoints CMC utilisés.
5. **Résilience** : cache serveur + snapshot de secours, le site ne casse jamais devant un juge.

### Objectifs secondaires (si le MVP est fini — voir roadmap)
- Filtre **« Comment j'achète »** : par chaîne (Solana, Ethereum, Base, X Layer…) ou « via un exchange ».
- Image OpenGraph par actif (partage X joli, utile pour le post de soumission).
- Endpoint JSON public `/api/asset/[symbol]` documenté.
- Petit serveur MCP (`best_wrapper`) — bonus « usage intéressant de l'API ». Seulement si tout le reste est propre.

### Non-objectifs (on ne le fait pas)
- Trading / exécution / connexion de wallet.
- Comptes utilisateurs, portefeuilles, alertes, watchlists.
- Graphiques historiques.
- Chat IA / LLM.
- Comparaison avec le « vrai » prix boursier (l'API CMC ne fournit pas de prix cash indépendant — round 1, MirrorGap).
- Signatures cryptographiques, reçus SHA-256, etc. (sur-ingénierie vue au round 1).

### Anti-objectifs (si ça arrive, c'est un échec même si « ça marche »)
- Recommander comme « Best pick » un jeton **sans marché, quasi mort, ou dans une autre unité**.
- Afficher un prix faux à cause d'un mauvais parsing (v5 renvoie `quotes` en **tableau**, pas en objet).
- Site down, page blanche ou spinner infini pendant le jugement (quota épuisé, clé expirée, 429).
- Ton « conseil financier » (« buy this »). On compare et on explique ; disclaimer visible.
- Ressembler à un clone de Signal Desk / Shelfware (tableau d'analyste sans décision).

---

## 3. Contraintes

- **Délai** : 21 jours. Soumission visée **lundi 7 déc.**, buffer jusqu'au 9 déc. 23:59 UTC.
- **API CMC** : plan Startup gratuit via l'inscription DoraHacks (s'inscrire avec l'email du compte CMC).
  Quota mensuel et limite/minute à vérifier via `GET /v1/key/info` (ordre de grandeur attendu :
  quelques centaines de milliers de crédits/mois, ~30 req/min — **à confirmer**).
- **CORS** : l'API Pro bloque les appels navigateur → **tous les appels CMC passent par notre serveur**.
- **Clé API** : uniquement côté serveur, jamais dans le bundle client, jamais commitée.
- **Jugement du 10 au 25 déc.** : le site et la clé doivent tenir jusque-là (vérifier la durée du plan gratuit).
- **Soumission** : repo public, démo vidéo, post X avec lien DoraHacks + vidéo + `#BuildwithCMC`
  + liste des endpoints CMC utilisés. Retour sur l'API (feedback) attendu.
- **Langue du produit** : anglais (juges internationaux). Docs internes en français OK.

---

## 4. Approches envisagées

| | Approche | Pour | Contre |
|---|---|---|---|
| **A** ✅ | **App web Next.js (TypeScript)** : routes serveur = proxy CMC avec cache, pages rendues côté serveur, déployée sur Railway | Lien live cliquable pour les juges ; une seule codebase ; pages partageables par actif (`/a/nvda`) avec OG image ; cache maîtrisé | Un serveur à garder en vie pendant le jugement |
| B | Site statique + cron (GitHub Actions écrit un JSON toutes les N min, hébergé sur Pages) | Quasi impossible à faire tomber ; zéro risque de quota pendant le jugement | Données vieilles de N min ; recherche limitée aux actifs pré-calculés ; « où acheter » par actif coûteux à pré-calculer pour tout l'univers |
| C | CLI ou bot Telegram | Très rapide à coder | Démo peu visuelle ; « utile à une vraie personne » plus faible ; juges doivent installer/rejoindre |

**Choix : A (notre décision, l'équipe nous a laissé le « comment »)**, avec l'avantage de B intégré :
un **snapshot JSON de secours** généré par script et servi si CMC répond en erreur. On garde la
fraîcheur de A et la robustesse de B.

---

## 5. Stack et architecture (nos choix)

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4** (version stable au 18 nov. 2026).
- **Hébergement : à choisir par l'équipe** — Vercel (gratuit) ou Railway ; le code est un Next.js standard, rien n'est spécifique à l'un ou l'autre.
- **Tests** : Vitest (logique pure, sur fixtures enregistrées) + 1–2 tests Playwright de fumée.
- **CI** : GitHub Actions (lint + typecheck + tests) sur chaque push.
- **Pas de base de données.** Cache mémoire (LRU avec TTL) + fichiers JSON (snapshot, caches longs).

```
Navigateur ──► Next.js (pages SSR + /api/*)
                  │
                  ├─ lib/cmc/client.ts     appels HTTP, clé, retry/backoff 429, classification 403/404/405, comptage crédits
                  ├─ lib/cmc/endpoints.ts  une fonction typée par endpoint (+ normalisation des formes de réponse)
                  ├─ lib/cache.ts          LRU + TTL + coalescence des requêtes identiques en vol
                  ├─ lib/score/            éligibilité, score, labels, raisons (100 % pur, 100 % testé)
                  ├─ lib/snapshot.ts       lecture du snapshot de secours si CMC échoue
                  └─ data/snapshot/*.json  généré par `npm run snapshot`, commité
```

---

## 6. Données : endpoints CMC et pièges connus

### 6.1 Endpoints prévus

| Endpoint | Sert à | TTL cache | Notes (issues du round 1) |
|---|---|---|---|
| `GET /v5/real-world-assets/map` | Index de recherche (symbol, nom, type, `rwa_id`, `has_tokens`, `rwa_rank`) | 24 h | 0 crédit. Ne garder que `has_tokens: true` (~800 actifs) |
| `GET /v5/real-world-assets/assets/list` | « Populaires » (tri par market cap tokenisée) | 15 min | |
| `GET /v5/real-world-assets/quotes/latest` | Cœur : `average_tokenized_price` + `tokens[]` | 2 min | `quotes` est un **tableau** d'objets `{symbol, ...}`. `tokens[]` = `crypto_id, symbol, name, issuer_id, issuer_name, price, market_cap, volume_24h` — **pas de chaîne**. `price: null` ⇔ pas de marché suivi. Jusqu'à 50 ids par appel |
| `GET /v5/real-world-assets/info` | Fiche de l'émetteur de l'actif (secteur, CIK SEC) | 24 h | `about` est un **objet** (markdown), pas une string |
| `GET /v2/cryptocurrency/info?id=` | Chaîne + adresse de contrat + lien explorer de chaque wrapper | 7 j | **Un seul id inconnu fait échouer tout le batch** : parser l'erreur, retirer l'id, relancer, le mémoriser comme non résolu |
| `GET /v2/cryptocurrency/quotes/latest?id=` | `num_market_pairs`, variation 24h par wrapper | 2 min | Ici `quote` est un **objet** clé = devise (forme différente de v5) |
| `GET /v1/key/info` | Suivi du quota dans le footer / logs | 5 min | |
| À valider en Phase 0 → §6.4 | Où acheter | 10 min | |

### 6.2 Règles de normalisation (obligatoires)
- Lire le prix USD de v5 via `quotes.find(q => q.symbol === 'USD')`, jamais `quote.USD`.
- Un wrapper avec `price === null` n'est **jamais** éligible ; il est listé en « No market ».
- **Unité** : comparer chaque prix au `average_tokenized_price` de l'actif. Écart > 25 % → statut
  « Different unit » (probable gramme/fraction), exclu du classement, affiché avec explication.
- **Volume plancher** : `volume_24h < 10 000 $` → « Too thin », exclu du classement (seuil configurable).
- Ambiguïté de symbole : toujours travailler par `rwa_id` / `crypto_id`, jamais par ticker seul.

### 6.3 Score (transparent, déterministe — notre proposition, seuils réglables dans `lib/score/config.ts`)
Pour les wrappers **éligibles** d'un actif :

- **Liquidité L** (poids 50 %) : `log10(vol / 10k) / log10(volMax / 10k)` (1 si un seul éligible).
- **Fidélité de prix F** (poids 30 %) : écart `d = |prix / médiane_pondérée_volume − 1|` ;
  `F = max(0, 1 − d / 2 %)`.
- **Ampleur de marché B** (poids 20 %) : `min(1, num_market_pairs / 5)`.
- **Score = round(100 × (0,5 L + 0,3 F + 0,2 B))**. Égalité → plus gros volume.

Labels :

| Label | Condition |
|---|---|
| **Best pick** | 1er éligible |
| Good alternative | éligible, score ≥ 60 |
| Weak | éligible, score < 60 |
| Too thin | prix ok mais volume < plancher |
| Different unit | écart > 25 % vs consensus |
| No market | `price === null` |

Raisons générées (exemples de textes, en anglais dans l'UI) :
« Most liquid version: $4.2M traded in 24h (8× the next one) », « Trades within 0.1 % of the consensus price »,
« Listed on 12 markets », « ⚠ Only $43 traded in 24h — price may be stale », « ⚠ Quoted per gram, not per ounce ».

Cas limites :
- 0 éligible → « No tradable version right now » + liste des wrappers et leur statut.
- 1 éligible → « Only one tradable version » (pas de « Best » trompeur, label « Only option »).

### 6.4 « Où l'acheter » — à confirmer en Phase 0 (risque n°1 du projet)
Au round 1, `/v5/real-world-assets/market-pairs/list` a renvoyé **403 même sur Startup**. Ordre d'essai :
1. `/v5/real-world-assets/market-pairs/list` avec notre clé Startup (peut-être corrigé depuis).
2. `/v2/cryptocurrency/market-pairs/latest?id=<crypto_id>` par wrapper → noms d'exchanges + paires + volume.
3. API DEX de CMC par adresse de contrat → pools on-chain et liquidité (attention : certains endpoints DEX sont en **POST**, un 405 sur GET ne veut pas dire « indisponible »).
4. **Repli** : chaîne + adresse de contrat + lien explorer (toujours dispo via `/v2/cryptocurrency/info`)
   + table **curée à la main** émetteur → accès officiel (ex. xStocks/Backed, Ondo, Robinhood…),
   clairement étiquetée « issuer link, not CMC data ».

Le MVP est livrable même avec le repli seul. Décision à acter à la fin de la Phase 0.

**Implémenté (18 nov.)** : l'app essaie (2) pour les 4 wrappers les plus liquides et, si le plan refuse, affiche (4)
— chaîne, contrat, lien explorer et note émetteur. `npm run explore` sonde aussi (1) et (3) pour décider.

### 6.5 Budget de crédits (estimation, à recaler avec `/v1/key/info`)
Une page actif non cachée ≈ 1 (RWA quotes) + 1 (crypto quotes) + 0–N (où acheter) crédits.
Avec TTL 2 min et la coalescence, le coût dépend du temps, pas du nombre de visiteurs.

**Snapshot de secours = tout l'univers cherchable (~800 actifs `has_tokens`)**, pas seulement les
populaires (notre choix) : `quotes/latest` RWA accepte 50 ids par appel (~16 appels), crypto quotes
100 ids par appel, crypto info cachée 7 jours → quelques dizaines de crédits par snapshot complet.
Régénéré au moins une fois avant la soumission et pendant le jugement si possible. Ainsi, même si la
clé expire ou le quota est épuisé, **chaque recherche fonctionne** (données datées, bandeau visible).

### 6.6 Restrictions d'achat par émetteur (notre choix)
Beaucoup de wrappers sont interdits aux résidents US ou exigent un KYC, selon l'émetteur. CMC ne
fournit pas cette donnée. Décision : une **petite table curée à la main** (`data/issuers.json`, les
~6 émetteurs principaux : Backed/xStocks, Ondo, Robinhood, bStocks, Dinari, Paxos/Tether pour l'or)
avec une note d'accès courte (« Not available to US persons », « KYC via issuer app »…) et un lien
source. Affichée sur la carte Best pick et dans le tableau, **elle n'entre pas dans le score** et ne
filtre rien. Étiquetée « issuer info, not CMC data, may be outdated ». Fusionnée avec la table de
repli « où acheter » (§6.4).

---

## 7. Écrans

### 7.1 Accueil `/`
```
┌──────────────────────────────────────────────────────────┐
│ WrapScout                                     Method  ·  │
│                                                          │
│   Which token should I buy to own  [ Nvidia        🔍 ]  │
│   Stocks · ETFs · Commodities · Funds                    │
│                                                          │
│   Popular                                                │
│   [NVDA 8 versions] [TSLA 7] [AAPL 6] [Gold 7] [SPY 4]…  │
│                                                          │
│   Not financial advice · Data: CoinMarketCap · updated 1m│
└──────────────────────────────────────────────────────────┘
```

### 7.2 Page actif `/a/[symbol]` (ex. `/a/nvda`)
```
┌──────────────────────────────────────────────────────────┐
│ NVIDIA Corp (NVDA) · Stock · Semiconductors · SEC CIK ↗  │
│ Consensus tokenized price $229.07 · 7 of 8 versions trade│
│                                                          │
│ ★ BEST PICK  NVDAX  · Backed (xStocks) · Solana          │
│   $229.28 (+0.09 % vs consensus) · $4.2M vol 24h         │
│   ✓ Most liquid version (8× the next one)                │
│   ✓ Price in line with the others                        │
│   ✓ Listed on 12 markets                                 │
│   Where to buy: Kraken · Bybit · Jupiter (Solana)  ↗     │
│                                                          │
│ How do you buy?  [Any] [Exchange] [Solana] [Ethereum]…   │
│                                                          │
│ All versions                                             │
│ Token   Issuer     Chain    Price   Δ     Vol 24h  Status│
│ NVDAX   Backed     Solana   229.28 +0.1%  $4.2M    Best  │
│ NVDAon  Ondo       Ethereum 229.00 -0.0%  $510k    Good  │
│ …       Dinari     Arbitrum   —      —      —   No market│
│                                                          │
│ ⚠ 2 versions have no market. 1 trades under $10k/day.    │
│ Not financial advice. Data refreshed 1 min ago.          │
└──────────────────────────────────────────────────────────┘
```
(Exemple illustratif ; valeurs inventées.)

### 7.3 Méthode `/method`
Formule du score, seuils, définitions des labels, liste des endpoints CMC, limites connues.

### 7.4 États d'erreur (obligatoires)
- Ticker inconnu → suggestions proches.
- Actif sans wrapper éligible → message clair (§6.3).
- CMC en erreur / quota → données du snapshot + bandeau « Live data unavailable, showing data from <date> ».
- Chargement → squelettes (pas de spinner infini), timeout serveur 8 s → snapshot.

---

## 8. Livrables de soumission
- Repo public avec **README** : problème, GIF/screens, lien live, endpoints utilisés (tableau), lancer en local, archi, méthode du score, limites.
- **JUDGE.md** : « 60 secondes pour juger » (3 liens à cliquer, ce qu'il faut regarder).
- **FEEDBACK.md** : retours concrets sur l'API CMC, alimenté au fil de l'eau.
- **Vidéo démo** 2–3 min : problème (30 s) → recherche NVDA → best pick + pièges → or (unités) → actif sans marché → méthode.
- **Post X** : lien DoraHacks + vidéo + `#BuildwithCMC` + liste des endpoints.
- Formulaire DoraHacks rempli, track **Real World Assets**.

---

## 9. Ce qui est laissé au builder
- Choix des libs secondaires (fuzzy search, LRU, composants UI).
- Design visuel (palette, typo), tant que : mobile OK, lisible, couleurs vert/rouge réservées aux signaux.
- Ajustement fin des seuils du score après lecture des vraies données (documenter tout changement dans `/method`).
- Structure exacte des fichiers au-delà de §5.

---

## 10. Roadmap

| Phase | Dates | Objectif | Sortie attendue |
|---|---|---|---|
| **0. Setup & vérité terrain API** | mer 18 – jeu 19 nov | Comptes, clé, savoir exactement ce que l'API renvoie | Inscription DoraHacks faite ; clé Startup active ; script d'exploration ; fixtures brutes enregistrées (NVDA, TSLA, AAPL, or, un ETF, un actif sans marché) ; **décision « où acheter »** |
| **1. Données + score** | ven 20 – mar 24 nov | Couche CMC fiable + logique de score testée | Client CMC (cache, retry, erreurs) ; normalisation ; score + labels + raisons ; tests Vitest verts sur fixtures |
| **2. UI MVP + 1er déploiement** | mer 25 – lun 30 nov | Le parcours complet marche en ligne | Accueil + recherche + page actif + méthode ; **déployé sur Railway au plus tard ven 27 nov** |
| **3. Où acheter + robustesse + finitions** | mar 1 – ven 4 déc | Prêt à être jugé | Section « où acheter » ; snapshot de secours ; états d'erreur ; mobile ; filtre « comment j'achète » ; OG images |
| **4. Soumission** | sam 5 – lun 7 déc | Tout envoyé | README, JUDGE.md, FEEDBACK.md, vidéo, post X, formulaire DoraHacks — **soumis lun 7 déc** |
| Buffer | mar 8 – mer 9 déc | Imprévus | — |
| Maintien | 10 – 30 déc | Site en ligne pendant le jugement | Vérif quotidienne que le site répond |

Feature freeze : **vendredi 4 déc au soir**. Après, uniquement des corrections et la soumission.

La todo détaillée et cochable est dans [`/TODO.md`](../../../TODO.md).
