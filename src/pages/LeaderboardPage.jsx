import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import teams from '../data/teams.json'
import TeamLogo from '../components/TeamLogo'
import CardSkeleton from '../components/CardSkeleton'

const MEDALS = ['🥇', '🥈', '🥉']

// Traitement visuel distinct pour le podium (section 12 : "qui regarde le
// plus" doit se lire d'un coup d'œil), le reste garde un style neutre.
const RANK_STYLES = [
  'border-amber-500/40 bg-gradient-to-r from-amber-500/[0.07] to-transparent',
  'border-slate-400/30 bg-gradient-to-r from-slate-400/[0.06] to-transparent',
  'border-orange-700/40 bg-gradient-to-r from-orange-700/[0.07] to-transparent',
]

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
        Qui a vu le plus de contenu (foot, NBA, F1) au total.
      </p>

      {loading && <CardSkeleton />}

      <div className="mt-6 space-y-2">
        {rows.map((row, index) => {
          const team = teams.find(
            (t) => t.name === row.favorite_team && t.league === row.favorite_league,
          )
          const rankStyle = RANK_STYLES[index]
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
                <p className="text-lg font-bold text-emerald-400">{row.total_watched}</p>
                <p className="text-xs text-[var(--color-text-dim)]">
                  vu{row.total_watched > 1 ? 's' : ''}
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
