// Statut interne unifié, quel que soit le sport : un match/une course est
// toujours dans un de ces 5 états. Calculé à l'affichage (rien n'est stocké
// tel quel en base) à partir de ce que les Edge Functions écrivent déjà —
// foot et NBA partagent le même vocabulaire "façon football-data.org"
// (SCHEDULED/IN_PLAY/FINISHED/POSTPONED/CANCELLED), voir mapGameStatus dans
// supabase/functions/fetch-nba/index.ts.
const MATCH_STATUS_MAP = {
  SCHEDULED: 'scheduled',
  TIMED: 'scheduled',
  IN_PLAY: 'live',
  PAUSED: 'live',
  SUSPENDED: 'live',
  FINISHED: 'completed',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
}

export function getMatchStatus(match) {
  return MATCH_STATUS_MAP[match.status] ?? 'scheduled'
}

// Une session F1 n'a pas de statut explicite côté OpenF1 (à part
// is_cancelled) : on déduit "live/completed/scheduled" à partir des dates.
export function getSessionStatus(session) {
  if (session.is_cancelled) return 'cancelled'
  const now = Date.now()
  const start = new Date(session.date_start).getTime()
  const end = new Date(session.date_end).getTime()
  if (now < start) return 'scheduled'
  if (now > end) return 'completed'
  return 'live'
}

// Le statut d'un week-end de course se déduit de ses sessions : annulé si
// TOUTES le sont, en direct si une est en cours, terminé si toutes les
// sessions non-annulées sont passées, sinon à venir.
export function getRaceStatus(race) {
  const sessions = race.sessions ?? []
  if (sessions.length > 0 && sessions.every((s) => s.is_cancelled)) return 'cancelled'

  const relevant = sessions.filter((s) => !s.is_cancelled)
  if (relevant.length === 0) {
    return getSessionStatus({ is_cancelled: false, date_start: race.date_start, date_end: race.date_end })
  }
  if (relevant.some((s) => getSessionStatus(s) === 'live')) return 'live'
  if (relevant.every((s) => getSessionStatus(s) === 'completed')) return 'completed'
  return 'scheduled'
}

// Libellé de badge à afficher (null = pas de badge, l'heure ou le score suffit).
export const STATUS_LABELS = {
  scheduled: null,
  live: 'EN DIRECT',
  completed: null,
  postponed: 'Reporté',
  cancelled: 'Annulé',
}

// Un événement annulé ou pas encore reprogrammé n'a rien à "regarder" —
// on masque le bouton "Marquer vu" dans ces deux cas.
export function canMarkWatched(status) {
  return status !== 'cancelled' && status !== 'postponed'
}
