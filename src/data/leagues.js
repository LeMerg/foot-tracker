// Métadonnées des compétitions suivies par le site.
// "code" = valeur stockée dans matches_cache.league (identifiant utilisé
// partout : filtres, badges, classement par compétition).

// Les 5 grands championnats domestiques : utilisés pour le sélecteur
// "équipe favorite" (une équipe appartient à UN championnat domestique,
// même si elle joue aussi la Ligue des Champions certaines saisons).
export const DOMESTIC_LEAGUES = [
  { code: 'PL', name: 'Premier League', country: 'Angleterre', color: '#37003c' },
  { code: 'PD', name: 'La Liga', country: 'Espagne', color: '#d3720a' },
  { code: 'BL1', name: 'Bundesliga', country: 'Allemagne', color: '#d3010c' },
  { code: 'FL1', name: 'Ligue 1', country: 'France', color: '#0a1a3e' },
  { code: 'SA', name: 'Serie A', country: 'Italie', color: '#0087d1' },
]

// Compétitions européennes ponctuelles, en plus des championnats domestiques.
export const CUP_LEAGUES = [
  { code: 'CL', name: 'Ligue des Champions', country: 'Europe', color: '#1a1464' },
]

// Toutes les compétitions football dont on affiche les matchs dans le
// calendrier (filtre par ligue, badges, répartition par championnat...).
export const FOOTBALL_LEAGUES = [...DOMESTIC_LEAGUES, ...CUP_LEAGUES]

// NBA : partage matches_cache/watched_matches avec le foot (même forme
// "équipe A vs équipe B, un score"), donc traité comme une ligue de plus.
export const BASKETBALL_LEAGUES = [
  { code: 'NBA', name: 'NBA', country: 'États-Unis', color: '#1d428a' },
]

// Toutes les ligues "de type match" confondues (utilisé pour les badges et
// la répartition par compétition sur la page profil).
export const LEAGUES = [...FOOTBALL_LEAGUES, ...BASKETBALL_LEAGUES]

export const LEAGUE_BY_CODE = Object.fromEntries(LEAGUES.map((l) => [l.code, l]))

// F1 n'est pas une "league" de matches_cache (races_cache est un modèle à
// part), mais garde une couleur cohérente pour son onglet et ses stats.
export const F1_META = { code: 'F1', name: 'Formule 1', color: '#e10600' }
