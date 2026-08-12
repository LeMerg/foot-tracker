import { FOOTBALL_LEAGUES, BASKETBALL_LEAGUES, F1_META } from './leagues'

// Onglets sport affichés en haut du calendrier. Foot et NBA partagent le
// même modèle "match" (matches_cache/watched_matches), juste filtré sur
// des ligues différentes. F1 n'a pas de "leagues" : c'est un calendrier de
// courses (races_cache/watched_races) avec son propre composant RaceList.
//
// `color` sert aux états actifs (onglets, filtres) — foot garde l'émeraude
// neutre de l'app, NBA/F1 reprennent une couleur qui leur est propre au lieu
// de tout aplatir en émeraude. Le bleu marine officiel NBA (#1d428a) est
// trop sombre comme fond d'état actif sur ce thème sombre, d'où l'orange.
export const SPORTS = [
  { id: 'football', label: '⚽ Foot', leagues: FOOTBALL_LEAGUES, color: '#10b981' },
  { id: 'basketball', label: '🏀 NBA', leagues: BASKETBALL_LEAGUES, color: '#f97316' },
  { id: 'f1', label: '🏎️ F1', leagues: null, color: F1_META.color },
]
