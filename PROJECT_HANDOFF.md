# Foot Tracker — Document de reprise de session

> Rédigé pour continuer ce projet dans une nouvelle conversation Claude Code
> une fois la limite de contexte de la session précédente atteinte. Lis ce
> fichier en entier avant de reprendre le travail — il contient l'état exact
> du projet, les décisions prises et **surtout ce qui est en attente de
> validation**.

## 1. C'est quoi, ce projet ?

Site web privé (l'utilisateur + ses amis) qui répertorie les matchs des 5
grands championnats européens de foot + Ligue des Champions + NBA + F1, où
chacun peut marquer ce qu'il a "vu" et comparer son total avec ses potes.

- **Repo GitHub** : https://github.com/LeMerg/foot-tracker (public)
- **Site en ligne** : https://foot-tracker.pages.dev (Cloudflare Pages)
- **Backend** : projet Supabase `njbfshxkismqikjzvrbm` (base de données +
  Edge Functions)
- **Dossier local** : `C:\Users\Mergim\Desktop\Portfolio\foot-tracker`

## 2. ⚠️ ÉTAT ACTUEL — À LIRE EN PREMIER

**Mise à jour : le travail décrit ci-dessous a été validé par
l'utilisateur, commité (`cb730d1`), poussé sur GitHub, et déployé sur
Cloudflare Pages. Le site en ligne est à jour.** Cette section garde
l'historique de ce qui a changé, pour mémoire.

### Ce qui est EN LIGNE actuellement (dernier commit poussé : `cb730d1`)

- Foot (5 championnats + Ligue des Champions), NBA, F1 : calendrier,
  "marquer vu", classement, page profil.
- Onboarding pseudo + reconnexion multi-appareils ("J'ai déjà un pseudo").
- Logos NBA corrects, statuts d'événements (annulé/reporté/en direct),
  trigger anti double-comptage, modale "Quoi de neuf".
- Polish visuel : accent de couleur par ligue, animation "marquer vu",
  podium sur le classement, nav avec avatar, états de chargement skeleton.
- Vérifié en production : `https://foot-tracker.pages.dev` sert bien le
  nouveau build (`assets/index-CdXwheEj.js`), site répond 200.

### Ce qui avait été fait en local avant validation (maintenant en ligne)

Deux passes de travail, toutes deux **vérifiées et fonctionnelles en local**
(build OK, testé dans le navigateur contre la vraie base Supabase), mais
`git status` montre tout ça comme non commité :

**Passe 1 — Corrections de données (P0 du brief utilisateur)**
- Logos NBA corrects (avant : aucun logo, ou logos au hasard)
- Système de statut unifié : `scheduled / live / completed / postponed /
  cancelled`, calculé à l'affichage, badges "Reporté"/"Annulé"/"En direct"
- Bouton "Marquer vu" masqué pour un match annulé/reporté
- Trigger SQL anti double-comptage (si un match déjà "vu" devient annulé,
  la ligne `watched_matches` est supprimée automatiquement)
- Modale "Quoi de neuf" affichée une fois à la prochaine connexion de
  chacun (couvre aussi les updates précédentes jamais annoncées : NBA/F1/C1)

**Passe 2 — Polish visuel (P1/P2 du brief)**
- Bordure gauche colorée par ligue sur les cartes
- Composant `TeamLogo` réutilisable avec repli propre (initiales) si un
  logo est absent/cassé — remplace tous les `<img>` ad-hoc
- Bouton "Marquer vu" repensé (icône + animation "pop" à l'activation)
- Carte teintée en vert une fois marquée vue
- Podium doré/argent/bronze sur le classement
- Nav avec avatar (initiale du pseudo)
- États de chargement en "skeleton" (pulse) au lieu de texte brut
- Petites animations/transitions cohérentes (`src/index.css`)

### État exact Git / Supabase (mis à jour après validation utilisateur)

L'utilisateur a validé le travail ci-dessus. Les changements ont été
**commités en local** (`git commit`), mais **PAS poussés sur GitHub** et
**PAS déployés sur Cloudflare** — seul un `commit` a été explicitement
demandé, pas de `push`/`deploy`. Ces deux actions restent à faire dès que
demandé explicitement.

```
git log -1 (poussé sur GitHub) : 76b976a "Refonte multi-sport : ajout NBA et Formule 1"
git log -1 (local, non poussé) : voir `git log -1` — commit de cette passe V2
Site en ligne (JS hash)         : assets/index-Cfn1nawn.js   (ANCIEN, inchangé)
Build local (JS hash)           : assets/index-tXZIwWh0.js   (NOUVEAU, commité mais pas déployé)
Migrations Supabase      : TOUTES appliquées côté base (le backend est à
                            jour), y compris les 2 dernières non commitées :
                            20260113000000_cancel_cleanup_trigger.sql
                            20260113000100_cleanup_test_user_6.sql
Edge Functions déployées : fetch-nba et fetch-races sont déjà en version
                            "V2" (logos + statuts riches) sur Supabase,
                            MÊME SI le frontend correspondant n'est pas
                            encore en ligne.
```

**Fichiers modifiés/créés non commités** (`git status --short`) :
```
 M src/App.jsx
 M src/components/MatchCard.jsx
 M src/components/MonthGrid.jsx
 M src/components/NavBar.jsx
 M src/components/RaceList.jsx
 M src/components/TeamSelect.jsx
 M src/index.css
 M src/pages/CalendarPage.jsx
 M src/pages/LeaderboardPage.jsx
 M src/pages/UserDetailPage.jsx
 M supabase/functions/fetch-nba/index.ts
 M supabase/functions/fetch-races/index.ts
?? src/components/CardSkeleton.jsx
?? src/components/CheckIcon.jsx
?? src/components/TeamLogo.jsx
?? src/components/WhatsNewModal.jsx
?? src/data/changelog.js
?? src/lib/eventStatus.js
?? supabase/functions/_shared/
?? supabase/migrations/20260113000000_cancel_cleanup_trigger.sql
?? supabase/migrations/20260113000100_cleanup_test_user_6.sql
```

### 🎯 Prochaine action probable

Le travail est validé et commité. Il ne reste que :
```bash
cd "C:\Users\Mergim\Desktop\Portfolio\foot-tracker"
git push
npm run deploy:cloudflare
```
(Pas besoin de refaire `supabase db push` ni `supabase functions deploy` :
c'est déjà fait, voir ci-dessus — seul le frontend doit être poussé/déployé.)
**Ne pas le faire tant que l'utilisateur ne le redemande pas explicitement**
— seul un `commit` a été autorisé jusqu'ici, pas de `push` public ni de mise
en ligne.

## 3. Stack technique

- **Frontend** : React 19 + Vite + Tailwind CSS v4, React Router (`HashRouter`
  — obligatoire pour un hébergement 100% statique)
- **Backend** : Supabase (Postgres + RLS + Edge Functions Deno), appelé
  directement depuis le frontend avec la clé publique (`sb_publishable_...`)
- **Hébergement** : Cloudflare Pages (`npm run deploy:cloudflare`) — voir
  section 6 pour pourquoi pas GitHub Pages
- **Sources de données externes** (voir section 5) : football-data.org,
  balldontlie.io, OpenF1

## 4. Modèle de données (Supabase)

| Table | Rôle |
|---|---|
| `users` | pseudo + équipe favorite (foot uniquement). Pas de mot de passe. |
| `matches_cache` | Cache des matchs **foot + NBA** (même forme : équipe A vs équipe B). `sport` (`football`/`basketball`), `external_id` (id de la source) + `id` (clé technique auto-générée, voir section 4.1). |
| `watched_matches` | Quels matchs un utilisateur a marqués "vu". FK vers `matches_cache.id`. |
| `races_cache` | Cache des week-ends de course **F1** (modèle séparé : une course ≠ un match). `sessions` stocké en `jsonb` (essais/qualifs/course avec `is_cancelled`). |
| `watched_races` | Idem `watched_matches` mais pour les courses (suivi au niveau du week-end entier, pas par session). |
| Vue `leaderboard` | Combine `count(watched_matches)` + `count(watched_races)` par utilisateur. |

### 4.1 Pourquoi `matches_cache.id` est une clé technique séparée

Football-data.org et balldontlie.io ont chacun leur propre système d'ID
(6 chiffres pour l'un, 8 pour l'autre) — les mélanger dans la même table
sous une seule clé primaire créait un risque de collision. `id` est donc
`generated by default as identity` (auto-incrémenté par Postgres),
`external_id` garde l'id réel de la source, avec un `unique(sport,
external_id)` utilisé comme cible d'upsert par les Edge Functions.

### 4.2 Sécurité RLS — choix assumé "honor system"

Pas de mot de passe = pas de vraie authentification possible. Décision
prise avec l'utilisateur : `users`, `watched_matches`, `watched_races` ont
des policies RLS **ouvertes** (n'importe qui avec la clé publique peut
modifier ces données) — acceptable pour un site privé entre amis de
confiance. En revanche, `matches_cache`/`races_cache` (le contenu du
calendrier) ne sont modifiables QUE par les Edge Functions (clé
`service_role`, jamais exposée au frontend) — vérifié par un vrai test
d'écriture avec la clé publique pendant un audit sécurité (bloqué comme
prévu, voir historique des commits).

## 5. Sources de données externes

| Sport | Source | Clé | Limites connues |
|---|---|---|---|
| Foot | football-data.org | `FOOTBALL_DATA_API_KEY` (secret Supabase) | 10 req/min, 13 compétitions seulement (pas d'Europa League) |
| NBA | balldontlie.io | `BALLDONTLIE_API_KEY` (secret Supabase) | 5 req/min, pas de logos (voir `_shared/nbaTeams.ts`) |
| F1 | OpenF1 | Aucune (API ouverte) | RAS |

**Explorée et écartée** : API-Football / api-sports.io (clé fournie par
l'utilisateur, non utilisée) — le plan gratuit ne couvre que les saisons
2022-2024, jamais la saison en cours, inutilisable pour un calendrier "à
venir". Vérifié par appel direct à l'API, sur les 4 sports du groupe
(Football/Basketball/F1/MMA).

**UFC/MMA** : pas d'API officielle publique, pas de source gratuite fiable
trouvée. Reporté indéfiniment (pas de piste sérieuse actuellement).

Les 3 Edge Functions (`fetch-matches`, `fetch-nba`, `fetch-races`) suivent
toutes le même pattern : throttle de 6h par source (vérifie `fetched_at`
avant de rappeler l'API externe), appelées en fire-and-forget par le
frontend à chaque ouverture du calendrier.

## 6. Pourquoi Cloudflare Pages et pas GitHub Pages

GitHub Pages était le plan initial (voir `.github/workflows/deploy.yml`,
toujours présent et fonctionnel). Le compte GitHub de l'utilisateur, tout
juste créé, a connu un blocage prolongé (plusieurs heures) d'allocation de
runners Actions — jamais résolu dans la session, contourné en déployant
plutôt sur Cloudflare Pages (`npm run deploy:cloudflare`, script dans
`package.json`, utilise Wrangler). Le workflow GitHub Actions n'a pas été
supprimé : si le compte se débloque un jour, GitHub Pages redeviendrait
utilisable en parallèle (build avec `BASE_PATH=/foot-tracker/` vs `/` pour
Cloudflare, voir `vite.config.js`).

## 7. Historique des fonctionnalités (dans l'ordre)

1. Site de base : 5 championnats, onboarding, calendrier semaine/mois,
   marquer vu, classement, page profil
2. Grille calendrier mensuelle réelle (7 colonnes) au lieu d'une liste
3. Déploiement GitHub Pages (bloqué) → bascule Cloudflare Pages
4. Suppression de comptes de test à la demande de l'utilisateur
5. Ajout Ligue des Champions
6. Connexion multi-appareils ("J'ai déjà un pseudo")
7. Audit sécurité complet (RLS, secrets, bundle frontend) — rien trouvé
8. Refonte multi-sport : NBA + F1 (voir section 4 pour le modèle de données)
9. **[EN ATTENTE DE VALIDATION]** Brief V2 : logos NBA, statuts
   d'événements, anti double-comptage, modale "quoi de neuf"
10. **[EN ATTENTE DE VALIDATION]** Polish visuel (P1/P2 du brief)

## 8. Hors scope (reporté, pas commencé)

D'après le brief `FootTracker_V2_Claude_Implementation_Brief.md` (dans les
Téléchargements de l'utilisateur) :
- Home dashboard dédié (section 10 du brief)
- Page statistiques personnelles détaillée (section 11)
- Filtres de classement (par sport, par période) (section 12)
- Refonte de la page profil (section 13)
- Navigation mobile en bottom bar (section 16)
- Streaks, achievements, résumé annuel (P3, explicitement optionnel)
- UFC/MMA (bloqué, pas de source de données)
- Europa League (bloqué, pas dans le plan gratuit football-data.org)

## 9. Pièges connus / notes utiles

- **Faux positifs de test** : cliquer très vite plusieurs actions
  d'affilée via des scripts de test (JS injecté) peut donner l'impression
  d'un bug (état qui semble "revenir en arrière") alors que c'est juste le
  temps de rendu React (~50ms) pas encore écoulé au moment du test suivant.
  Toujours attendre un peu entre une action et une vérification.
- **`read_console_messages`** (outil de test navigateur) accumule les logs
  de toute la session, pas juste depuis le dernier rechargement — ne pas
  paniquer en voyant de vieilles erreurs après un fix ; vérifier via
  `performance.getEntriesByType('resource')` pour un état réellement à jour.
- **Logos NBA ESPN** : 2 équipes ne suivent pas le pattern
  `abréviation.toLowerCase()` : Pelicans → `no` (pas `nop`), Jazz → `utah`
  (pas `uta`). Voir `supabase/functions/_shared/nbaTeams.ts`.
- **Vite HMR** peut afficher une fausse erreur de "double déclaration"
  après plusieurs éditions rapides d'un même fichier en dev — vérifier le
  fichier réellement servi (`curl` sur l'URL du dev server) avant de
  chercher un bug qui n'existe pas dans le code source.
- **`.env`** contient les vraies clés (jamais commité, voir `.gitignore`).
  `.env.example` documente le format sans les valeurs.
- Comptes de test créés pendant les vérifications de cette session ont
  systématiquement été supprimés via migration SQL (RLS empêche la
  suppression via la clé publique côté `users`) — toujours faire pareil.

## 10. Pour reprendre le travail

1. Lire ce fichier en entier (fait, si tu lis ceci).
2. `cd C:\Users\Mergim\Desktop\Portfolio\foot-tracker && git status` pour
   confirmer que l'état correspond bien à la section 2.
3. Si l'utilisateur valide le travail en attente : commit + push + `npm run
   deploy:cloudflare` (voir section 2, aucune action Supabase nécessaire).
4. Si l'utilisateur veut des changements : les fichiers concernés sont
   listés en section 2, tous non commités donc librement modifiables.
5. Pour la suite (section 8) : redemander à l'utilisateur ses priorités
   plutôt que de tout attaquer d'un coup — c'est l'approche qui a bien
   fonctionné jusqu'ici (voir section 30 du brief : privilégier la
   fiabilité du suivi existant plutôt qu'empiler des fonctionnalités).
