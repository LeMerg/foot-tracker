# FanLog — Document de reprise de session

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

**Tout est validé, commité (`946855c`), poussé sur GitHub, et déployé sur
Cloudflare Pages. Le site en ligne est à jour, migrations et Edge Functions
comprises.** Aucune action en attente.

### Ce qui est EN LIGNE actuellement

- Foot (5 championnats + Ligue des Champions), NBA, F1 : calendrier,
  "marquer vu", classement filtrable par sport, page profil complète.
- Onboarding pseudo + reconnexion multi-appareils.
- Cliquer sur son pseudo (nav) ouvre son profil (`/user/:pseudo`), plus
  `/parametres` (accessible via le menu) pour changer d'équipe favorite.
- Ajout de matchs de foot manquants (équipes en texte libre, `custom_matches`).
- **Détail au clic** sur un match/course déjà joué :
  - Foot : score mi-temps, arbitre(s), stage/matchday — récupéré une fois
    via Edge Function `fetch-match-detail`, caché en base de façon permanente
    (`matches_cache.details`).
  - NBA : score quart-temps par quart-temps — déjà présent dans la réponse
    balldontlie qu'on récupère de toute façon, aucun appel API en plus.
  - F1 : classement complet de la session (podium, DNF/DNS/DSQ, écurie,
    écart) via Edge Function `fetch-session-result`, qui cache aussi de
    façon permanente une fois la session terminée — évite le rate-limit
    OpenF1 (429 constaté quand l'appel se faisait direct depuis le
    navigateur, corrigé en passant par le serveur).
- Couleurs par sport (NBA orange `#f97316`, F1 rouge `#e10600`, foot/nav
  restent émeraude).
- Renommage **Foot Tracker → FanLog** (titre, logo nav, README) — l'URL
  (`foot-tracker.pages.dev`), le repo GitHub et le projet Cloudflare
  gardent leur nom technique, volontairement inchangé.
- Modale "Quoi de neuf" à jour (`CHANGELOG_VERSION = '2026-08-v4'`),
  vérifiée en production.

### Limites connues (API gratuites, vérifiées en live, pas de contournement)

- **Foot** : pas de compositions ni d'événements (buts/cartons minute par
  minute) sur le plan gratuit football-data.org — confirmé en inspectant la
  vraie réponse de `/v4/matches/{id}` (champ `odds` explicitement bloqué
  "Activate Odds-Package...", aucun champ `goals`/`bookings`).
- **NBA** : pas de stats par joueur (`box_scores` renvoie 401 sur le plan
  gratuit balldontlie, confirmé par appel direct). Seul le score
  quart-temps par équipe est disponible.
- Passer sur un plan payant pour l'une des deux API débloquerait ça, mais
  n'a pas été fait (coût, décision à laisser à l'utilisateur).

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
| `races_cache` | Cache des week-ends de course **F1** (modèle séparé : une course ≠ un match). `sessions` stocké en `jsonb` (essais/qualifs/course avec `is_cancelled`, `session_key` OpenF1 pour le classement). |
| `watched_races` | Idem `watched_matches` mais pour les courses (suivi au niveau du week-end entier, pas par session). |
| `custom_matches` | Matchs de foot ajoutés manuellement (équipes en texte libre, absents du cache API). Créer une ligne = l'avoir vu. |
| `session_results_cache` | Classement d'une session F1 (`session_key` → `results` jsonb), rempli à la demande par `fetch-session-result`, cache permanent une fois la session terminée. |
| Vue `leaderboard` | `total_watched` + détail par sport (`football_watched`, `basketball_watched`, `f1_watched`) — foot inclut `custom_matches`. |
| `matches_cache.details` | jsonb, nullable — détail au clic. Foot : `{halfTime,referees,stage,group,venue}` (rempli à la demande par `fetch-match-detail`, permanent). NBA : `{periods:{home,away}}` (rempli directement par `fetch-nba`, déjà dans la réponse balldontlie). |

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

Les 3 Edge Functions de calendrier (`fetch-matches`, `fetch-nba`,
`fetch-races`) suivent le même pattern : throttle de 6h par source
(vérifie `fetched_at` avant de rappeler l'API externe), appelées en
fire-and-forget par le frontend à chaque ouverture du calendrier.

Deux autres Edge Functions, à la demande (pas de throttle 6h, cache
**permanent** une fois rempli — un résultat déjà joué ne change plus) :
- `fetch-match-detail` (foot uniquement) : score mi-temps/arbitre/stage.
- `fetch-session-result` (F1) : classement complet d'une session. Route
  aussi les appels OpenF1 côté serveur plutôt que direct navigateur — évite
  le rate-limit (429 constaté en pratique) et le CORS côté client.

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
9. V2 : logos NBA, statuts d'événements, anti double-comptage, modale
   "quoi de neuf", polish visuel (bordures colorées, podium, skeleton)
10. V3 : classement filtrable par sport, pseudo (nav) → profil complet,
    renommage FanLog, ajout de matchs de foot manquants
11. V4 : détail au clic (mi-temps/arbitre foot, quart-temps NBA, classement
    F1), couleurs d'onglet par sport
12. Fix : classement F1 routé via Edge Function (`fetch-session-result`)
    pour corriger un vrai rate-limit OpenF1 rencontré en test

## 8. Hors scope (reporté, pas commencé)

- Home dashboard dédié
- Page statistiques personnelles détaillée
- Refonte de la page profil au-delà de ce qui existe déjà
- Navigation mobile en bottom bar
- Rendre cliquables les lignes de matchs vus sur `UserDetailPage.jsx`
  (même logique de détail que le calendrier, pas encore câblée là)
- Streaks, achievements, résumé annuel
- UFC/MMA (bloqué, pas de source de données gratuite)
- Europa League (bloqué, pas dans le plan gratuit football-data.org)
- Compositions/événements de match foot, stats joueur NBA — bloqués sur
  le plan gratuit des API respectives (voir section 2), débloquable
  seulement avec un plan payant

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
2. `cd C:\Users\Mergim\Desktop\Portfolio\foot-tracker && git status` — tout
   devrait être propre (rien en attente, voir section 2).
3. Pour toute nouvelle demande de taille significative (plusieurs
   fichiers, décision d'architecture) : passer par Plan Mode, comme pour
   toutes les passes de cette session — l'utilisateur veut systématiquement
   voir les changements avant qu'ils soient commités/déployés.
4. Redemander à l'utilisateur ses priorités plutôt que de tout attaquer
   d'un coup (section 8 pour ce qui reste hors scope).
