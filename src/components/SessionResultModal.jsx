import { useEffect, useState } from 'react'
import TeamLogo from './TeamLogo'
import { fetchSessionResults } from '../lib/raceResults'
import { RANK_STYLES, MEDALS } from '../data/rankStyles'

function statusBadge(r) {
  if (r.dsq) return 'DSQ'
  if (r.dnf) return 'DNF'
  if (r.dns) return 'DNS'
  return null
}

function formatGap(r) {
  if (r.position === 1) return null
  const gap = r.gap_to_leader
  if (gap == null) return null
  if (typeof gap === 'string') return gap
  return `+${gap.toFixed(3)}s`
}

// Classement d'une session F1 (essais/qualifs/sprint/course), récupéré via
// l'Edge Function fetch-session-result (cache permanent côté serveur une
// fois la session terminée — voir ce fichier pour le raisonnement).
export default function SessionResultModal({ session, raceName, onClose }) {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(Boolean(session.session_key))
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!session.session_key) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchSessionResults(session.session_key, session.date_end)
      .then((r) => {
        if (!cancelled) setResults(r)
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger le classement.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [session.session_key, session.date_end, retryCount])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-white">{raceName}</h2>
        <p className="mt-1 text-sm text-[var(--color-text-dim)]">{session.name}</p>

        <div className="mt-4 space-y-1.5">
          {!session.session_key && (
            <p className="text-center text-sm text-[var(--color-text-dim)]">
              Réessaie plus tard, le calendrier se met à jour automatiquement.
            </p>
          )}
          {loading && <p className="text-center text-sm text-[var(--color-text-dim)]">Chargement…</p>}
          {error && (
            <div className="text-center">
              <p className="text-sm text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => setRetryCount((c) => c + 1)}
                className="mt-2 text-sm text-emerald-400 hover:underline"
              >
                Réessayer
              </button>
            </div>
          )}
          {results?.length === 0 && (
            <p className="text-center text-sm text-[var(--color-text-dim)]">
              Classement pas encore disponible, réessaie une fois la session terminée.
            </p>
          )}

          {results?.map((r, index) => {
            const badge = statusBadge(r)
            const gap = formatGap(r)
            const rankStyle = RANK_STYLES[index]
            return (
              <div
                key={r.driver_number}
                className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                  rankStyle ?? 'border-[var(--color-border)] bg-[var(--color-panel-2)]'
                }`}
              >
                <div className="w-7 shrink-0 text-center text-sm">
                  {badge ? (
                    <span className="text-xs font-semibold text-red-400">{badge}</span>
                  ) : (
                    MEDALS[index] ?? <span className="text-[var(--color-text-dim)]">{r.position}</span>
                  )}
                </div>

                <TeamLogo src={r.driver?.headshot_url} name={r.driver?.full_name} size="sm" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {r.driver?.full_name ?? `#${r.driver_number}`}
                  </p>
                  {r.driver?.team_name && (
                    <p
                      className="truncate text-xs font-medium"
                      style={{ color: `#${r.driver.team_colour}` }}
                    >
                      {r.driver.team_name}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right text-xs text-[var(--color-text-dim)]">
                  {r.points > 0 && <p className="font-semibold text-white">{r.points} pts</p>}
                  {gap && <p>{gap}</p>}
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg border border-[var(--color-border)] py-2.5 text-sm font-medium text-[var(--color-text-dim)] transition hover:text-white"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}
