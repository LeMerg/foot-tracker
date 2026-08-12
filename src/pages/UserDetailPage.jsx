import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '../lib/supabaseClient'
import { useUser } from '../context/UserContext'
import { deleteCustomMatch } from '../lib/customMatches'
import { LEAGUES, F1_META } from '../data/leagues'
import teams from '../data/teams.json'
import LeagueBadge from '../components/LeagueBadge'
import LeagueBarChart from '../components/LeagueBarChart'
import TeamLogo from '../components/TeamLogo'
import CardSkeleton from '../components/CardSkeleton'
import AddCustomMatchModal from '../components/AddCustomMatchModal'

export default function UserDetailPage() {
  const { pseudo } = useParams()
  const { user: loggedInUser } = useUser()
  const [user, setUser] = useState(null)
  const [watched, setWatched] = useState([])
  const [racesWatchedCount, setRacesWatchedCount] = useState(0)
  const [customMatches, setCustomMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [leagueFilter, setLeagueFilter] = useState('ALL')
  const [modalOpen, setModalOpen] = useState(false)

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
      const [{ data: watchedRows }, { count: racesCount }, { data: customRows }] = await Promise.all([
        supabase
          .from('watched_matches')
          .select('*, matches_cache(*)')
          .eq('user_id', userRow.id)
          .order('watched_at', { ascending: false }),
        supabase
          .from('watched_races')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userRow.id),
        supabase
          .from('custom_matches')
          .select('*')
          .eq('user_id', userRow.id)
          .order('created_at', { ascending: false }),
      ])

      if (!cancelled) {
        setWatched(watchedRows ?? [])
        setRacesWatchedCount(racesCount ?? 0)
        setCustomMatches(customRows ?? [])
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [pseudo])

  const isOwnProfile = Boolean(loggedInUser && user && loggedInUser.id === user.id)

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

  const totalWatched = watched.length + racesWatchedCount + customMatches.length

  function handleCustomMatchAdded(row) {
    setCustomMatches((prev) => [row, ...prev])
  }

  function handleDeleteCustomMatch(id) {
    setCustomMatches((prev) => prev.filter((c) => c.id !== id))
    deleteCustomMatch(id).catch(() => {})
  }

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

      {isOwnProfile && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            + Ajouter un match
          </button>
          <Link
            to="/parametres"
            className="rounded-lg border border-[var(--color-border)] px-3.5 py-1.5 text-sm text-[var(--color-text-dim)] transition hover:text-white"
          >
            ⚙️ Modifier mon profil
          </Link>
        </div>
      )}

      <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-dim)]">
          Répartition par compétition
        </h2>
        <LeagueBarChart counts={counts} />
      </section>

      {customMatches.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-dim)]">
            Matchs ajoutés manuellement ({customMatches.length})
          </h2>
          <div className="space-y-2">
            {customMatches.map((c) => {
              const homeCrest = teams.find((t) => t.name === c.home_team)?.crest
              const awayCrest = teams.find((t) => t.name === c.away_team)?.crest
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3"
                >
                  <TeamLogo src={homeCrest} name={c.home_team} size="xs" />
                  <span className="truncate text-sm text-white">{c.home_team}</span>
                  <span className="shrink-0 text-xs text-[var(--color-text-dim)]">vs</span>
                  <span className="truncate text-sm text-white">{c.away_team}</span>
                  <TeamLogo src={awayCrest} name={c.away_team} size="xs" />
                  {c.played_on && (
                    <span className="ml-auto shrink-0 text-xs text-[var(--color-text-dim)]">
                      {format(new Date(c.played_on), 'd MMM yyyy', { locale: fr })}
                    </span>
                  )}
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomMatch(c.id)}
                      title="Supprimer"
                      className="shrink-0 text-[var(--color-text-dim)] transition hover:text-red-400"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

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

      {isOwnProfile && (
        <AddCustomMatchModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          userId={loggedInUser.id}
          onAdded={handleCustomMatchAdded}
        />
      )}
    </div>
  )
}
