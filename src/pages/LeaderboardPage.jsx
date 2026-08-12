import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import teams from '../data/teams.json'
import TeamLogo from '../components/TeamLogo'
import CardSkeleton from '../components/CardSkeleton'
import { RANK_STYLES, MEDALS } from '../data/rankStyles'

const FILTERS = [
  { id: 'all', label: 'Tout', metric: 'total_watched', color: '#10b981', description: 'Qui a vu le plus de contenu (foot, NBA, F1) au total.' },
  { id: 'football', label: '⚽ Foot', metric: 'football_watched', color: '#10b981', description: 'Qui a vu le plus de matchs de foot (calendrier + ajoutés manuellement).' },
  { id: 'basketball', label: '🏀 NBA', metric: 'basketball_watched', color: '#f97316', description: 'Qui a vu le plus de matchs NBA.' },
  { id: 'f1', label: '🏎️ F1', metric: 'f1_watched', color: '#e10600', description: 'Qui a vu le plus de courses F1.' },
]

export default function LeaderboardPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterId, setFilterId] = useState('all')

  const activeFilter = FILTERS.find((f) => f.id === filterId)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('leaderboard')
      .select('*')
      .order('total_watched', { ascending: false })
      .order('pseudo', { ascending: true })
      .then(({ data, error }) => {
        if (!cancelled && !error) setRows(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sortedRows = useMemo(
    () =>
      [...rows].sort(
        (a, b) => b[activeFilter.metric] - a[activeFilter.metric] || a.pseudo.localeCompare(b.pseudo),
      ),
    [rows, activeFilter],
  )

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold text-white">Classement</h1>
      <p className="mt-1 text-sm text-[var(--color-text-dim)]">{activeFilter.description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setFilterId(filter.id)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all ${
              filterId === filter.id
                ? 'text-white shadow-md'
                : 'bg-[var(--color-panel-2)] text-[var(--color-text-dim)] hover:text-white'
            }`}
            style={{ backgroundColor: filterId === filter.id ? filter.color : undefined }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading && <CardSkeleton />}

      <div className="mt-6 space-y-2">
        {sortedRows.map((row, index) => {
          const team = teams.find(
            (t) => t.name === row.favorite_team && t.league === row.favorite_league,
          )
          const rankStyle = RANK_STYLES[index]
          const value = row[activeFilter.metric]
          return (
            <Link
              key={row.user_id}
              to={`/user/${encodeURIComponent(row.pseudo)}`}
              className={`flex items-center gap-4 rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 ${
                rankStyle ? rankStyle : 'border-[var(--color-border)] bg-[var(--color-panel)] hover:border-emerald-500/60'
              }`}
            >
              <div className="w-8 shrink-0 text-center text-lg">
                {MEDALS[index] ?? <span className="text-[var(--color-text-dim)]">{index + 1}</span>}
              </div>

              <TeamLogo src={team?.crest} name={row.favorite_team} size="md" />

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{row.pseudo}</p>
                <p className="truncate text-xs text-[var(--color-text-dim)]">
                  {row.favorite_team ?? 'Pas d’équipe favorite'}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-lg font-bold" style={{ color: activeFilter.color }}>{value}</p>
                <p className="text-xs text-[var(--color-text-dim)]">vu{value > 1 ? 's' : ''}</p>
              </div>
            </Link>
          )
        })}

        {!loading && sortedRows.length === 0 && (
          <p className="text-[var(--color-text-dim)]">Personne n’a encore de pseudo, sois le premier !</p>
        )}
      </div>
    </div>
  )
}
