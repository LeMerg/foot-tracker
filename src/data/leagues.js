// Métadonnées des compétitions suivies par le site.
// "code" = code compétition football-data.org (utilisé partout comme identifiant).

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

// Toutes les compétitions dont on affiche les matchs dans le calendrier
// (filtre par ligue, badges, répartition par championnat...).
export const LEAGUES = [...DOMESTIC_LEAGUES, ...CUP_LEAGUES]

export const LEAGUE_BY_CODE = Object.fromEntries(LEAGUES.map((l) => [l.code, l]))
