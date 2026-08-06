// Métadonnées des 5 grands championnats suivis par le site.
// "code" = code compétition football-data.org (utilisé partout comme identifiant).
export const LEAGUES = [
  { code: 'PL', name: 'Premier League', country: 'Angleterre', color: '#37003c' },
  { code: 'PD', name: 'La Liga', country: 'Espagne', color: '#d3720a' },
  { code: 'BL1', name: 'Bundesliga', country: 'Allemagne', color: '#d3010c' },
  { code: 'FL1', name: 'Ligue 1', country: 'France', color: '#0a1a3e' },
  { code: 'SA', name: 'Serie A', country: 'Italie', color: '#0087d1' },
]

export const LEAGUE_BY_CODE = Object.fromEntries(LEAGUES.map((l) => [l.code, l]))
