import { useEffect, useMemo, useState } from 'react'
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { fetchMatches, triggerMatchesRefresh } from '../lib/matches'
import { useUser } from '../context/UserContext'
import { useWatchedMatches } from '../hooks/useWatchedMatches'
import { LEAGUES } from '../data/leagues'
import MatchCard from '../components/MatchCard'
import MonthGrid from '../components/MonthGrid'

const VIEW_MODES = [
  { id: 'week', label: 'Semaine' },
  { id: 'month', label: 'Mois' },
]

function getRange(anchor, mode) {
  if (mode === 'week') {
    return { from: startOfWeek(anchor, { weekStartsOn: 1 }), to: endOfWeek(anchor, { weekStartsOn: 1 }) }
  }
  // En mode mois, on récupère aussi les jours "de remplissage" des mois
  // voisins affichés dans la grille (ex: les derniers jours de juillet qui
  // apparaissent sur la première ligne de la grille d'août).
  return {
    from: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
    to: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
  }
}

export default function CalendarPage() {
  const { user } = useUser()
  const [mode, setMode] = useState('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedLeagues, setSelectedLeagues] = useState(() => new Set(LEAGUES.map((l) => l.code)))
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  const { watchedIds, toggle } = useWatchedMatches(user?.id)

  const range = useMemo(() => getRange(anchor, mode), [anchor, mode])

  // Une fois au montage : demande à l'Edge Function de rafraîchir le cache
  // si besoin (elle gère elle-même le throttle, donc pas de risque de spam).
  useEffect(() => {
    triggerMatchesRefresh()
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchMatches({ from: range.from, to: range.to, leagues: [...selectedLeagues] })
      .then((data) => {
        if (!cancelled) setMatches(data)
      })
      .catch(() => {
        if (!cancelled) setMatches([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [range, selectedLeagues])

  // On repart sans jour sélectionné à chaque changement de vue/période :
  // l'ancien jour sélectionné n'a souvent plus de sens dans la nouvelle plage.
  useEffect(() => {
    setSelectedDay(null)
  }, [mode, anchor])

  function toggleLeague(code) {
    setSelectedLeagues((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  function shift(direction) {
    setAnchor((prev) => (mode === 'week' ? addWeeks(prev, direction) : addMonths(prev, direction)))
  }

  const matchesByDay = useMemo(() => {
    const groups = new Map()
    for (const match of matches) {
      const key = format(new Date(match.utc_date), 'yyyy-MM-dd')
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(match)
    }
    return groups
  }, [matches])

  const monthGridDays = useMemo(
    () => (mode === 'month' ? eachDayOfInterval({ start: range.from, end: range.to }) : []),
    [mode, range],
  )

  // En mode semaine : tous les jours de la plage. En mode mois : uniquement
  // le jour sélectionné dans la grille (s'il y en a un).
  const agendaEntries = useMemo(() => {
    const entries = [...matchesByDay.entries()]
    if (mode === 'week') return entries
    if (!selectedDay) return []
    const key = format(selectedDay, 'yyyy-MM-dd')
    return entries.filter(([day]) => day === key)
  }, [matchesByDay, mode, selectedDay])

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shift(-1)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-panel-2)]"
          >
            ←
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-panel-2)]"
          >
            Aujourd’hui
          </button>
          <button
            onClick={() => shift(1)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-panel-2)]"
          >
            →
          </button>
        </div>

        <div className="flex rounded-lg border border-[var(--color-border)] p-0.5">
          {VIEW_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                mode === m.id ? 'bg-emerald-500 text-white' : 'text-[var(--color-text-dim)]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2 text-sm capitalize text-[var(--color-text-dim)]">
        {format(anchor, mode === 'week' ? "'Semaine du' d MMM yyyy" : 'MMMM yyyy', { locale: fr })}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {LEAGUES.map((league) => {
          const active = selectedLeagues.has(league.code)
          return (
            <button
              key={league.code}
              onClick={() => toggleLeague(league.code)}
              className="rounded-full px-3 py-1 text-xs font-semibold transition"
              style={{
                backgroundColor: active ? league.color : 'var(--color-panel-2)',
                color: active ? 'white' : 'var(--color-text-dim)',
              }}
            >
              {league.name}
            </button>
          )
        })}
      </div>

      {loading && <p className="mt-6 text-[var(--color-text-dim)]">Chargement des matchs…</p>}

      {!loading && mode === 'month' && (
        <div className="mt-6">
          <MonthGrid
            days={monthGridDays}
            matchesByDay={matchesByDay}
            anchorMonth={anchor}
            selectedDay={selectedDay}
            onSelectDay={(day) => setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day))}
          />
        </div>
      )}

      <div className="mt-6 space-y-6 pb-10">
        {!loading && mode === 'week' && agendaEntries.length === 0 && (
          <p className="text-[var(--color-text-dim)]">
            Aucun match sur cette période (ou cache pas encore rempli — voir README pour déployer
            l’Edge Function).
          </p>
        )}

        {!loading && mode === 'month' && !selectedDay && (
          <p className="text-center text-sm text-[var(--color-text-dim)]">
            Clique un jour dans le calendrier pour voir le détail des matchs.
          </p>
        )}

        {!loading && mode === 'month' && selectedDay && agendaEntries.length === 0 && (
          <p className="text-center text-sm text-[var(--color-text-dim)]">Aucun match ce jour-là.</p>
        )}

        {agendaEntries.map(([day, dayMatches]) => (
          <div key={day}>
            <h2 className="mb-2 text-sm font-semibold capitalize text-[var(--color-text-dim)]">
              {format(new Date(day), 'EEEE d MMMM', { locale: fr })}
            </h2>
            <div className="space-y-2">
              {dayMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  watched={watchedIds.has(match.id)}
                  onToggleWatched={toggle}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
