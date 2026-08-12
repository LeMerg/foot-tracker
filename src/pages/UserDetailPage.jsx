import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { LEAGUES, F1_META } from '../data/leagues'
import teams from '../data/teams.json'
import LeagueBadge from '../components/LeagueBadge'
import LeagueBarChart from '../components/LeagueBarChart'
import TeamLogo from '../components/TeamLogo'
import CardSkeleton from '../components/CardSkeleton'

export default function UserDetailPage() {
  const { pseudo } = useParams()
  const [user, setUser] = useState(null)
  const [watched, setWatched] = useState([])
  const [racesWatchedCount, setRacesWatchedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [leagueFilter, setLeagueFilter] = useState('ALL')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setNotFound(false)

      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('pseudo', pseudo)
        .maybeSingle()

      if (cancelled) return
      if (userError || !userRow) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setUser(userRow)

      // Jointure via la clé étrangère watched_matches.match_id -> matches_cache.id
      const [{ data: watchedRows }, { count: racesCount }] = await Promise.all([
        supabase
          .from('watched_matches')
          .select('*, matches_cache(*)')
          .eq('user_id', userRow.id)
          .order('watched_at', { ascending: false }),
        supabase
          .from('watched_races')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userRow.id),
      ])

      if (!cancelled) {
        setWatched(watchedRows ?? [])
        setRacesWatchedCount(racesCount ?? 0)
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [pseudo])

  const counts = useMemo(
    () => [
      ...LEAGUES.map((league) => ({
        code: league.code,
        name: league.name,
        color: league.color,
        count: watched.filter((w) => w.league === league.code).length,
      })),
      { code: F1_META.code, name: F1_META.name, color: F1_META.color, count: racesWatchedCount },
    ],
    [watched, racesWatchedCount],
  )

  const filteredWatched = useMemo(
    () => (leagueFilter === 'ALL' ? watched : watched.filter((w) => w.league === leagueFilter)),
    [watched, leagueFilter],
  )

  const favoriteTeam = useMemo(
    () => teams.find((t) => t.name === user?.favorite_team && t.league === user?.favorite_league),
    [user],
  )

  const totalWatched = watched.length + racesWatchedCount

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <CardSkeleton count={1} />
        <CardSkeleton />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <p className="text-[var(--color-text-dim)]">Utilisateur introuvable.</p>
        <Link to="/classement" className="mt-2 inline-block text-emerald-400">
          ← Retour au classement
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link to="/classement" className="text-sm text-emerald-400">
        ← Classement
      </Link>

      <div className="mt-3 flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
        <TeamLogo src={favoriteTeam?.crest} name={user.favorite_team} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-white">{user.pseudo}</h1>
          <p className="truncate text-sm text-[var(--color-text-dim)]">
            {user.favorite_team ?? 'Pas d’équipe favorite'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-extrabold tabular-nums text-emerald-400">{totalWatched}</p>
          <p className="text-xs text-[var(--color-text-dim)]">vu{totalWatched > 1 ? 's' : ''} au total</p>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-dim)]">
          Répartition par compétition
        </h2>
        <LeagueBarChart counts={counts} />
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setLeagueFilter('ALL')}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
            leagueFilter === 'ALL'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-[var(--color-panel-2)] text-[var(--color-text-dim)] opacity-70 hover:opacity-100'
          }`}
        >
          Tous ({watched.length})
        </button>
        {LEAGUES.map((league) => (
          <button
            key={league.code}
            onClick={() => setLeagueFilter(league.code)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              leagueFilter === league.code ? 'shadow-sm' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: leagueFilter === league.code ? league.color : 'var(--color-panel-2)',
              color: leagueFilter === league.code ? 'white' : 'var(--color-text-dim)',
            }}
          >
            {league.name}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {filteredWatched.map((w) => {
          const m = w.matches_cache
          if (!m) return null
          return (
            <div
              key={w.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3 transition-colors hover:border-emerald-500/30"
            >
              <TeamLogo src={m.home_crest} name={m.home_team} size="xs" />
              <span className="truncate text-sm text-white">{m.home_team}</span>
              <span className="shrink-0 text-xs text-[var(--color-text-dim)]">
                {m.home_score ?? '-'} - {m.away_score ?? '-'}
              </span>
              <span className="truncate text-sm text-white">{m.away_team}</span>
              <TeamLogo src={m.away_crest} name={m.away_team} size="xs" />
              <div className="ml-auto shrink-0">
                <LeagueBadge code={w.league} />
              </div>
            </div>
          )
        })}

        {filteredWatched.length === 0 && (
          <p className="text-[var(--color-text-dim)]">
            Aucun match vu {leagueFilter !== 'ALL' ? 'dans ce championnat.' : 'pour le moment.'}
          </p>
        )}
      </div>
    </div>
  )
}
