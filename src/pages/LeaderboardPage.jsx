import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import teams from '../data/teams.json'

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold text-white">Classement</h1>
      <p className="mt-1 text-sm text-[var(--color-text-dim)]">
        Qui a vu le plus de matchs parmi les 5 grands championnats.
      </p>

      {loading && <p className="mt-6 text-[var(--color-text-dim)]">Chargement…</p>}

      <div className="mt-6 space-y-2">
        {rows.map((row, index) => {
          const team = teams.find(
            (t) => t.name === row.favorite_team && t.league === row.favorite_league,
          )
          return (
            <Link
              key={row.user_id}
              to={`/user/${encodeURIComponent(row.pseudo)}`}
              className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3 transition hover:border-emerald-500/60"
            >
              <div className="w-8 shrink-0 text-center text-lg">
                {MEDALS[index] ?? <span className="text-[var(--color-text-dim)]">{index + 1}</span>}
              </div>

              {team ? (
                <img src={team.crest} alt="" className="h-8 w-8 shrink-0 object-contain" />
              ) : (
                <div className="h-8 w-8 shrink-0 rounded-full bg-[var(--color-panel-2)]" />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{row.pseudo}</p>
                <p className="truncate text-xs text-[var(--color-text-dim)]">
                  {row.favorite_team ?? 'Pas d’équipe favorite'}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-lg font-bold text-emerald-400">{row.total_watched}</p>
                <p className="text-xs text-[var(--color-text-dim)]">
                  match{row.total_watched > 1 ? 's' : ''} vu{row.total_watched > 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          )
        })}

        {!loading && rows.length === 0 && (
          <p className="text-[var(--color-text-dim)]">Personne n’a encore de pseudo, sois le premier !</p>
        )}
      </div>
    </div>
  )
}
