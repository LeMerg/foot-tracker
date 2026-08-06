import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { LEAGUES } from '../data/leagues'
import teams from '../data/teams.json'
import LeagueBadge from '../components/LeagueBadge'
import LeagueBarChart from '../components/LeagueBarChart'

export default function UserDetailPage() {
  const { pseudo } = useParams()
  const [user, setUser] = useState(null)
  const [watched, setWatched] = useState([])
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
      const { data: watchedRows } = await supabase
        .from('watched_matches')
        .select('*, matches_cache(*)')
        .eq('user_id', userRow.id)
        .order('watched_at', { ascending: false })

      if (!cancelled) {
        setWatched(watchedRows ?? [])
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [pseudo])

  const counts = useMemo(
    () =>
      LEAGUES.map((league) => ({
        code: league.code,
        name: league.name,
        color: league.color,
        count: watched.filter((w) => w.league === league.code).length,
      })),
    [watched],
  )

  const filteredWatched = useMemo(
    () => (leagueFilter === 'ALL' ? watched : watched.filter((w) => w.league === leagueFilter)),
    [watched, leagueFilter],
  )

  const favoriteTeam = useMemo(
    () => teams.find((t) => t.name === user?.favorite_team && t.league === user?.favorite_league),
    [user],
  )

  if (loading) {
    return <div className="mx-auto max-w-2xl px-4 py-6 text-[var(--color-text-dim)]">Chargement…</div>
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

      <div className="mt-3 flex items-center gap-4">
        {favoriteTeam ? (
          <img src={favoriteTeam.crest} alt="" className="h-12 w-12 object-contain" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-[var(--color-panel-2)]" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">{user.pseudo}</h1>
          <p className="text-sm text-[var(--color-text-dim)]">
            {user.favorite_team ?? 'Pas d’équipe favorite'}
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-dim)]">
          Répartition par championnat
        </h2>
        <LeagueBarChart counts={counts} />
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setLeagueFilter('ALL')}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            leagueFilter === 'ALL'
              ? 'bg-emerald-500 text-white'
              : 'bg-[var(--color-panel-2)] text-[var(--color-text-dim)]'
          }`}
        >
          Tous ({watched.length})
        </button>
        {LEAGUES.map((league) => (
          <button
            key={league.code}
            onClick={() => setLeagueFilter(league.code)}
            className="rounded-full px-3 py-1 text-xs font-semibold transition"
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
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3"
            >
              <img src={m.home_crest} alt="" className="h-5 w-5 shrink-0 object-contain" />
              <span className="truncate text-sm text-white">{m.home_team}</span>
              <span className="shrink-0 text-xs text-[var(--color-text-dim)]">
                {m.home_score ?? '-'} - {m.away_score ?? '-'}
              </span>
              <span className="truncate text-sm text-white">{m.away_team}</span>
              <img src={m.away_crest} alt="" className="h-5 w-5 shrink-0 object-contain" />
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
