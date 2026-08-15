// Bump CHANGELOG_VERSION à chaque fois qu'on veut réafficher la modale
// "Quoi de neuf" à tout le monde (même ceux qui l'ont déjà vue avant) —
// c'est juste une chaîne comparée à ce qui est stocké en localStorage,
// n'importe quelle nouvelle valeur suffit (date, numéro de version...).
export const CHANGELOG_VERSION = '2026-08-v7'

// Un item peut être une simple chaîne, ou { text, href } pour un lien
// cliquable (voir WhatsNewModal.jsx).
export const CHANGELOG_ITEMS = [
  '⚽ 5 nouvelles compétitions : Eredivisie, Jupiler Pro League, Primeira Liga, Ligue Europa et Ligue Europa Conférence',
  '🔔 Notifications Discord groupées en un seul récap par soirée (au lieu d’un message par match)',
]
