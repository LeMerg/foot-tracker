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
import { fetchRaces, triggerRacesRefresh } from '../lib/races'
import { useUser } from '../context/UserContext'
import { useWatchedMatches } from '../hooks/useWatchedMatches'
import { useWatchedRaces } from '../hooks/useWatchedRaces'
import { SPORTS } from '../data/sports'
import MatchCard from '../components/MatchCard'
import MonthGrid from '../components/MonthGrid'
import RaceList from '../components/RaceList'

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
  const [sport, setSport] = useState('football')
  const activeSport = SPORTS.find((s) => s.id === sport)

  const [mode, setMode] = useState('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedLeagues, setSelectedLeagues] = useState(
    () => new Set(SPORTS[0].leagues.map((l) => l.code)),
  )
  const [matches, setMatches] = useState([])
  const [loadingMatches, setLoadingMatches] = useState(true)

  const [races, setRaces] = useState([])
  const [loadingRaces, setLoadingRaces] = useState(true)

  const { watchedIds: watchedMatchIds, toggle: toggleMatch } = useWatchedMatches(user?.id)
  const { watchedIds: watchedRaceIds, toggle: toggleRace } = useWatchedRaces(user?.id)

  const range = useMemo(() => getRange(anchor, mode), [anchor, mode])

  // Une fois au montage : demande aux Edge Functions de rafraîchir les
  // caches si besoin (elles gèrent elles-mêmes le throttle).
  useEffect(() => {
    triggerMatchesRefresh()
    triggerRacesRefresh()
  }, [])

  useEffect(() => {
    if (sport === 'f1') return
    let cancelled = false
    setLoadingMatches(true)
    fetchMatches({ from: range.from, to: range.to, leagues: [...selectedLeagues] })
      .then((data) => {
        if (!cancelled) setMatches(data)
      })
      .catch(() => {
        if (!cancelled) setMatches([])
      })
      .finally(() => {
        if (!cancelled) setLoadingMatches(false)
      })
    return () => {
      cancelled = true
    }
  }, [range, selectedLeagues, sport])

  useEffect(() => {
    if (sport !== 'f1') return
    let cancelled = false
    setLoadingRaces(true)
    fetchRaces()
      .then((data) => {
        if (!cancelled) setRaces(data)
      })
      .catch(() => {
        if (!cancelled) setRaces([])
      })
      .finally(() => {
        if (!cancelled) setLoadingRaces(false)
      })
    return () => {
      cancelled = true
    }
  }, [sport])

  // On repart sans jour sélectionné à chaque changement de vue/période :
  // l'ancien jour sélectionné n'a souvent plus de sens dans la nouvelle plage.
  useEffect(() => {
    setSelectedDay(null)
  }, [mode, anchor])

  function handleSportChange(id) {
    setSport(id)
    const next = SPORTS.find((s) => s.id === id)
    if (next.leagues) setSelectedLeagues(new Set(next.leagues.map((l) => l.code)))
  }

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
      <div className="flex flex-wrap gap-2">
        {SPORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => handleSportChange(s.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              sport === s.id
                ? 'bg-emerald-500 text-white'
                : 'bg-[var(--color-panel-2)] text-[var(--color-text-dim)] hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {sport === 'f1' ? (
        <>
          {loadingRaces && <p className="mt-6 text-[var(--color-text-dim)]">Chargement des courses…</p>}
          {!loadingRaces && (
            <RaceList races={races} watchedIds={watchedRaceIds} onToggleWatched={toggleRace} />
          )}
        </>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
            {activeSport.leagues.map((league) => {
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

          {loadingMatches && <p className="mt-6 text-[var(--color-text-dim)]">Chargement des matchs…</p>}

          {!loadingMatches && mode === 'month' && (
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
            {!loadingMatches && mode === 'week' && agendaEntries.length === 0 && (
              <p className="text-[var(--color-text-dim)]">
                Aucun match sur cette période (ou cache pas encore rempli — voir README pour déployer
                l’Edge Function).
              </p>
            )}

            {!loadingMatches && mode === 'month' && !selectedDay && (
              <p className="text-center text-sm text-[var(--color-text-dim)]">
                Clique un jour dans le calendrier pour voir le détail des matchs.
              </p>
            )}

            {!loadingMatches && mode === 'month' && selectedDay && agendaEntries.length === 0 && (
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
                      watched={watchedMatchIds.has(match.id)}
                      onToggleWatched={toggleMatch}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
