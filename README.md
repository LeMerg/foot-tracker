# ⚽ Foot Tracker

Site privé (toi + tes amis) qui regroupe le calendrier des 5 grands championnats
européens (Premier League, La Liga, Bundesliga, Ligue 1, Serie A), avec pseudo,
suivi des matchs vus et classement.

**Stack** : React (Vite) + Tailwind CSS + Supabase (base de données/API +
Edge Function) + données [football-data.org](https://www.football-data.org/).
Site 100% statique, hébergeable gratuitement sur GitHub Pages.

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

Ça crée 3 tables (`users`, `watched_matches`, `matches_cache`), une vue
(`leaderboard`) et les policies de sécurité (Row Level Security). Voir les
commentaires dans le fichier pour le détail des choix de sécurité :
en résumé, `users` et `watched_matches` sont en "honor system" (pas de mot de
passe = pas de vraie authentification, donc n'importe qui avec la clé
publique pourrait modifier ces données — acceptable pour un site privé entre
amis de confiance), alors que `matches_cache` (le calendrier des matchs)
n'est modifiable que par l'Edge Function, jamais par le frontend.

### 1.3 Déployer l'Edge Function (récupération des matchs)

La clé `football-data.org` ne doit **jamais** être dans le code frontend
(sinon n'importe qui peut la lire et l'utiliser à ta place). Elle vit donc
uniquement dans une Edge Function Supabase, appelée par le frontend, qui va
elle-même interroger football-data.org et remplir `matches_cache`.

Installe la [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)
puis, depuis la racine du projet :

```bash
# 1. Connecte-toi à ton compte Supabase (ouvre une page web)
supabase login

# 2. Lie ce dossier à ton projet Supabase distant
#    (le "project ref" est dans Dashboard > Settings > General > Reference ID,
#    ou dans ton Project URL: https://<ref>.supabase.co)
supabase link --project-ref njbfshxkismqikjzvrbm

# 3. Enregistre ta clé football-data.org comme secret (jamais dans le code)
supabase secrets set FOOTBALL_DATA_API_KEY=ta_cle_ici

# 4. Déploie la fonction
supabase functions deploy fetch-matches
```

Le fichier [`supabase/config.toml`](supabase/config.toml) désactive déjà la
vérification JWT pour cette fonction précise (elle ne fait rien de sensible :
elle ne fait que déclencher un rafraîchissement du cache public).

**Rafraîchissement automatique (optionnel)** : par défaut, la fonction se
déclenche à chaque ouverture du calendrier par un utilisateur (et se
throttle elle-même à 1 vrai appel externe toutes les 6h par ligue). Si tu
veux qu'elle tourne aussi toute seule même quand personne n'ouvre le site,
va dans **Dashboard > Edge Functions > fetch-matches > Cron** et programme-la
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
│   ├── components/     # Composants réutilisables (calendrier, sélecteur d'équipe, badges…)
│   ├── pages/           # Une page = une route (calendrier, classement, détails, paramètres)
│   ├── context/          # UserContext : qui est connecté (pseudo courant)
│   ├── hooks/            # useWatchedMatches : gère les matchs "vus"
│   ├── lib/               # Clients/fonctions partagées (Supabase, fetch des matchs)
│   └── data/              # leagues.js (métadonnées des 5 championnats), teams.json (généré)
├── supabase/
│   ├── schema.sql        # Script SQL à exécuter dans le dashboard Supabase
│   ├── config.toml       # Config de l'Edge Function
│   └── functions/
│       └── fetch-matches/ # Edge Function : va chercher les matchs sur football-data.org
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
