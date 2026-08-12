# ⚽ Foot Tracker

Site privé (toi + tes amis) qui regroupe le calendrier des 5 grands championnats
européens (Premier League, La Liga, Bundesliga, Ligue 1, Serie A), de la
Ligue des Champions, de la **NBA** et de la **Formule 1** — avec pseudo,
suivi de ce que tu as vu, et classement.

> L'Europa League et l'UFC/MMA ne sont pas (encore) inclus : pas de source de
> données gratuite fiable trouvée pour l'instant (voir section 5 "Limites
> connues").

**Stack** : React (Vite) + Tailwind CSS + Supabase (base de données/API +
Edge Functions) + données [football-data.org](https://www.football-data.org/)
(foot), [balldontlie.io](https://balldontlie.io) (NBA) et
[OpenF1](https://openf1.org) (F1). Site 100% statique, hébergeable
gratuitement sur GitHub Pages (ou Cloudflare Pages, voir section 3.4).

---

## 1. Configuration Supabase

### 1.1 Récupérer les clés dans le dashboard

Le projet Supabase existe déjà. Dans **Dashboard > Settings > API** tu trouveras :

- **Project URL** → c'est ta `VITE_SUPABASE_URL` (ex: `https://njbfshxkismqikjzvrbm.supabase.co`).
  ⚠️ Ne prends PAS l'URL qui finit par `/rest/v1/`, juste la base.
- **Project API keys > anon / publishable** → c'est ta `VITE_SUPABASE_ANON_KEY`
  (commence par `sb_publishable_...`). C'est une clé **publique**, prévue
  pour être exposée côté navigateur.

Copie `.env.example` en `.env` à la racine du projet et remplis ces deux
valeurs (le fichier `.env` réel est déjà pré-rempli dans ce projet, à
vérifier/mettre à jour si tu changes de projet Supabase).

```bash
cp .env.example .env
```

### 1.2 Exécuter le script SQL (tables + sécurité)

1. Va dans **Dashboard > SQL Editor > New query**.
2. Colle tout le contenu de [`supabase/schema.sql`](supabase/schema.sql).
3. Clique **Run**.

Ça crée les tables (`users`, `watched_matches`, `matches_cache`,
`watched_races`, `races_cache`), une vue (`leaderboard`, qui combine les
matchs foot/NBA et les courses F1 dans un seul total) et les policies de
sécurité (Row Level Security). Voir les commentaires dans le fichier pour le
détail des choix de sécurité : en résumé, `users`, `watched_matches` et
`watched_races` sont en "honor system" (pas de mot de passe = pas de vraie
authentification, donc n'importe qui avec la clé publique pourrait modifier
ces données — acceptable pour un site privé entre amis de confiance), alors
que `matches_cache`/`races_cache` (les calendriers) ne sont modifiables que
par les Edge Functions, jamais par le frontend.

### 1.3 Déployer les Edge Functions (récupération des matchs/courses)

Les clés des API externes ne doivent **jamais** être dans le code frontend
(sinon n'importe qui peut les lire et les utiliser à ta place). Elles vivent
donc uniquement dans des Edge Functions Supabase, appelées par le frontend,
qui interrogent elles-mêmes les API et remplissent `matches_cache`/`races_cache`.

Installe la [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)
puis, depuis la racine du projet :

```bash
# 1. Connecte-toi à ton compte Supabase (ouvre une page web)
supabase login

# 2. Lie ce dossier à ton projet Supabase distant
#    (le "project ref" est dans Dashboard > Settings > General > Reference ID,
#    ou dans ton Project URL: https://<ref>.supabase.co)
supabase link --project-ref njbfshxkismqikjzvrbm

# 3. Enregistre tes clés comme secrets (jamais dans le code)
supabase secrets set FOOTBALL_DATA_API_KEY=ta_cle_football-data
supabase secrets set BALLDONTLIE_API_KEY=ta_cle_balldontlie
# (pas de clé nécessaire pour OpenF1, l'API F1 est ouverte)

# 4. Déploie les 3 fonctions
supabase functions deploy fetch-matches
supabase functions deploy fetch-nba
supabase functions deploy fetch-races
```

Le fichier [`supabase/config.toml`](supabase/config.toml) désactive déjà la
vérification JWT pour ces 3 fonctions (elles ne font rien de sensible :
elles ne font que déclencher un rafraîchissement des caches publics).

**Rafraîchissement automatique (optionnel)** : par défaut, chaque fonction se
déclenche à chaque ouverture du calendrier par un utilisateur (et se
throttle elle-même à 1 vrai appel externe toutes les 6h). Si tu veux
qu'elles tournent aussi toutes seules même quand personne n'ouvre le site,
va dans **Dashboard > Edge Functions > (nom de la fonction) > Cron** et programme-la
(ex: toutes les 6h).

---

## 2. Lancer le site en local

```bash
npm install
npm run dev
```

Ouvre <http://localhost:5173> (ou le port affiché dans le terminal).

---

## 3. Déployer sur GitHub Pages

### 3.1 Créer le repo GitHub

1. Crée un nouveau repo GitHub **public** nommé exactement `foot-tracker`
   (le nom doit correspondre au `base` dans [`vite.config.js`](vite.config.js) —
   si tu choisis un autre nom, mets aussi à jour cette ligne).
2. Pousse ce dossier dedans :

```bash
git remote add origin https://github.com/<ton-user>/foot-tracker.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 3.2 Ajouter les secrets pour le build

Le fichier `.env` n'est jamais poussé sur GitHub (`.gitignore`), donc le
build automatique a besoin des mêmes valeurs sous forme de **secrets GitHub
Actions** :

Dans le repo GitHub : **Settings > Secrets and variables > Actions > New
repository secret**, ajoute :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

(mêmes valeurs que ton fichier `.env` local — voir section 1.1)

### 3.3 Activer GitHub Pages

Dans **Settings > Pages**, sous "Build and deployment > Source", choisis
**GitHub Actions**.

Le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
build et déploie automatiquement le site à chaque push sur `main`. Le site
sera disponible à `https://<ton-user>.github.io/foot-tracker/`.

> **Note** : sur un compte GitHub tout juste créé, le tout premier run
> Actions/Pages peut rester bloqué en `queued` un moment (mesure anti-abus
> de GitHub sur les runners gratuits). Si ça traîne, la section suivante
> propose une alternative qui ne dépend pas des runners GitHub.

### 3.4 Alternative : déployer sur Cloudflare Pages

Cloudflare Pages est gratuit, ne dépend pas des runners GitHub Actions, et
déploie en quelques secondes depuis ta machine. Utile si GitHub Pages est
lent à se débloquer, ou si tu préfères cet hébergeur.

```bash
npx wrangler login          # une seule fois, ouvre ton navigateur
npm run deploy:cloudflare   # build + déploiement, à chaque fois que tu veux publier
```

Le site sera disponible à `https://foot-tracker.pages.dev`. Contrairement à
GitHub Pages, Cloudflare sert le site depuis la racine du domaine (pas de
sous-dossier `/foot-tracker/`) — c'est pour ça que `build:cloudflare`
surcharge le `base` de Vite via la variable `BASE_PATH` (voir
[`vite.config.js`](vite.config.js)).

---

## 4. Structure du projet

```
foot-tracker/
├── src/
│   ├── components/     # Composants réutilisables (calendrier, RaceList, sélecteur d'équipe, badges…)
│   ├── pages/           # Une page = une route (calendrier, classement, détails, paramètres)
│   ├── context/          # UserContext : qui est connecté (pseudo courant)
│   ├── hooks/            # useWatchedMatches (foot+NBA), useWatchedRaces (F1)
│   ├── lib/               # Clients/fonctions partagées (Supabase, fetch des matchs/courses)
│   └── data/              # sports.js (onglets), leagues.js (ligues), teams.json (généré, foot only)
├── supabase/
│   ├── schema.sql        # Script SQL de référence (état initial, voir aussi migrations/)
│   ├── migrations/        # Historique des changements de schéma appliqués
│   ├── config.toml       # Config des Edge Functions
│   └── functions/
│       ├── fetch-matches/ # Va chercher les matchs foot sur football-data.org
│       ├── fetch-nba/      # Va chercher les matchs NBA sur balldontlie.io
│       └── fetch-races/    # Va chercher le calendrier F1 sur OpenF1
└── .github/workflows/deploy.yml # Déploiement automatique sur GitHub Pages
```

`src/data/teams.json` a été généré une fois via l'API football-data.org
(liste des équipes + logos des 5 championnats) pour éviter d'appeler l'API
depuis le navigateur juste pour afficher un menu déroulant. Si de nouvelles
équipes montent/descendent d'une saison à l'autre, régénère ce fichier à la
main (même logique que dans `supabase/functions/fetch-matches`, mais pour
l'endpoint `/teams`).

---

## 5. Limites connues

- Le plan gratuit football-data.org est limité à 10 requêtes/minute — le
  cache (`matches_cache`, rafraîchi au plus une fois toutes les 6h par ligue)
  est là pour ne jamais s'en approcher, même avec plusieurs amis connectés
  en même temps.
- Pas de mot de passe = pas de vraie sécurité par utilisateur : n'importe
  qui connaissant l'URL du site peut créer un pseudo ou marquer des matchs
  comme vus pour n'importe quel autre pseudo. C'est un choix assumé pour un
  site privé entre amis de confiance (voir `supabase/schema.sql`).
- **Europa League non disponible** : le plan gratuit football-data.org ne
  propose que 13 compétitions (dont la Ligue des Champions, mais pas l'Europa
  League). Pour l'ajouter il faudrait soit passer sur un plan payant
  football-data.org, soit brancher une autre source de données.
- La Ligue des Champions dépend du calendrier publié par football-data.org :
  tant que la nouvelle saison n'est pas encore publiée par l'API (généralement
  fin août), `matches_cache` ne contient que les matchs de la saison
  précédente. Ça se met à jour tout seul (cache 6h) dès que l'API publie les
  nouveaux matchs, sans rien à faire de ton côté.
- **NBA** : `fetch-nba` ne récupère qu'une fenêtre glissante de ~90 jours à
  venir (pas la saison entière, ~1230 matchs), pour rester rapide et large
  sous les 5 requêtes/minute du plan gratuit balldontlie.io. L'API ne fournit
  pas de logo d'équipe sur ce plan, donc les matchs NBA s'affichent sans crest
  (juste le nom de l'équipe).
- **UFC/MMA non disponible** : l'UFC n'a aucune API officielle publique.
  Les seules alternatives trouvées sont des services tiers non établis ou du
  scraping déguisé en API — pas d'option fiable et gratuite à ce jour.
- **API-Football (api-sports.io)** volontairement pas utilisée pour le foot :
  son plan gratuit ne couvre que les saisons 2022-2024, jamais la saison en
  cours, ce qui ne convient pas à un calendrier "à venir".
