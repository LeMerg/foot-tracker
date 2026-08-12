import { FOOTBALL_LEAGUES, BASKETBALL_LEAGUES } from './leagues'

// Onglets sport affichés en haut du calendrier. Foot et NBA partagent le
// même modèle "match" (matches_cache/watched_matches), juste filtré sur
// des ligues différentes. F1 n'a pas de "leagues" : c'est un calendrier de
// courses (races_cache/watched_races) avec son propre composant RaceList.
export const SPORTS = [
  { id: 'football', label: '⚽ Foot', leagues: FOOTBALL_LEAGUES },
  { id: 'basketball', label: '🏀 NBA', leagues: BASKETBALL_LEAGUES },
  { id: 'f1', label: '🏎️ F1', leagues: null },
]
