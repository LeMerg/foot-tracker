// Bump CHANGELOG_VERSION à chaque fois qu'on veut réafficher la modale
// "Quoi de neuf" à tout le monde (même ceux qui l'ont déjà vue avant) —
// c'est juste une chaîne comparée à ce qui est stocké en localStorage,
// n'importe quelle nouvelle valeur suffit (date, numéro de version...).
export const CHANGELOG_VERSION = '2026-08-v4'

export const CHANGELOG_ITEMS = [
  '🏆 Foot Tracker devient FanLog — même site, nouveau nom (ça ne parlait plus que de foot depuis un moment)',
  '🔎 Classement filtrable : Tout / Foot / NBA / F1',
  '👤 Cliquer sur ton pseudo en haut à droite ouvre maintenant ton profil complet avec toutes tes stats',
  '➕ Tu peux ajouter un match de foot vu qui n’est pas dans le calendrier (équipes en texte libre)',
  '🔍 Clique sur un match ou une course déjà jouée pour voir le détail (score mi-temps/arbitre en foot, quart-temps en NBA, classement complet en F1)',
  '🎨 Les onglets NBA et F1 ont maintenant leur propre couleur au lieu d’être toujours en vert',
]
