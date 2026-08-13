// Bump CHANGELOG_VERSION à chaque fois qu'on veut réafficher la modale
// "Quoi de neuf" à tout le monde (même ceux qui l'ont déjà vue avant) —
// c'est juste une chaîne comparée à ce qui est stocké en localStorage,
// n'importe quelle nouvelle valeur suffit (date, numéro de version...).
export const CHANGELOG_VERSION = '2026-08-v6'

// Un item peut être une simple chaîne, ou { text, href } pour un lien
// cliquable (voir WhatsNewModal.jsx).
export const CHANGELOG_ITEMS = [
  '🔔 Notifications Discord quand un match/une course se termine (salons séparés foot/NBA/F1), avec un ping du bon rôle',
  '🏎️ Le message F1 inclut directement le top 5 de la course',
  { text: '🎮 Rejoins le Discord de FanLog pour recevoir ces notifs', href: 'https://discord.gg/UY5ydwZM7E' },
]
