// Bump CHANGELOG_VERSION à chaque fois qu'on veut réafficher la modale
// "Quoi de neuf" à tout le monde (même ceux qui l'ont déjà vue avant) —
// c'est juste une chaîne comparée à ce qui est stocké en localStorage,
// n'importe quelle nouvelle valeur suffit (date, numéro de version...).
export const CHANGELOG_VERSION = '2026-08-v5'

export const CHANGELOG_ITEMS = [
  '📱 Nouvelle barre de navigation en bas d’écran sur mobile',
  '📊 Ton profil affiche maintenant ton équipe la plus regardée et ta série de jours en cours',
  '🔍 Le détail au clic (score mi-temps, quart-temps, classement F1) fonctionne aussi sur ta page profil, pas juste le calendrier',
  '📅 Un champ date à côté des flèches du calendrier pour sauter directement à une période',
]
