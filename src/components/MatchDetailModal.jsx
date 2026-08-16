import { useEffect, useState } from 'react'
import TeamLogo from './TeamLogo'
import { fetchMatchDetail } from '../lib/matches'

const STAGE_LABELS = {
  LEAGUE_STAGE: 'Phase de ligue',
  GROUP_STAGE: 'Phase de groupes',
  LAST_16: 'Huitièmes de finale',
  ROUND_OF_16: 'Huitièmes de finale',
  QUARTER_FINALS: 'Quarts de finale',
  SEMI_FINALS: 'Demi-finales',
  FINAL: 'Finale',
  REGULAR_SEASON: 'Saison régulière',
}

function stageLabel(stage) {
  if (!stage) return null
  return STAGE_LABELS[stage] ?? stage.replaceAll('_', ' ').toLowerCase()
}

// Détail d'un match déjà joué (foot : mi-temps/arbitre/stage ; NBA :
// quart-temps). Même habillage que les autres modales de l'app.
export default function MatchDetailModal({ match, onClose }) {
  const [detail, setDetail] = useState(match.details ?? null)
  const [loading, setLoading] = useState(!match.details)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (match.details) return

    fetchMatchDetail(match)
      .then((d) => {
        if (!cancelled) setDetail(d)
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger le détail de ce match.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [match])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center gap-3">
          <TeamSide name={match.home_team} crest={match.home_crest} align="right" />
          <span className="shrink-0 px-1 text-xl font-bold tabular-nums text-white">
            {match.home_score ?? '-'} - {match.away_score ?? '-'}
          </span>
          <TeamSide name={match.away_team} crest={match.away_crest} align="left" />
        </div>

        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          {loading && (
            <p className="text-center text-sm text-[var(--color-text-dim)]">Chargement…</p>
          )}
          {error && <p className="text-center text-sm text-red-400">{error}</p>}
          {!loading && !error && (
            match.sport === 'football' ? (
              <FootballDetail detail={detail} />
            ) : (
              <NbaDetail detail={detail} match={match} />
            )
          )}
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

function TeamSide({ name, crest, align }) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center gap-2 ${align === 'right' ? 'items-end' : 'items-start'}`}
    >
      <TeamLogo src={crest} name={name} size="lg" />
      <span className="truncate text-sm font-medium text-white">{name}</span>
    </div>
  )
}

function FootballDetail({ detail }) {
  if (!detail) {
    return (
      <p className="text-center text-sm text-[var(--color-text-dim)]">Détail indisponible.</p>
    )
  }

  const stage = stageLabel(detail.stage)

  return (
    <dl className="space-y-3 text-sm">
      {detail.halfTime && (detail.halfTime.home != null || detail.halfTime.away != null) && (
        <Row label="Mi-temps">
          {detail.halfTime.home} - {detail.halfTime.away}
        </Row>
      )}
      {stage && <Row label="Phase">{stage}</Row>}
      {detail.group && <Row label="Groupe">{detail.group}</Row>}
      {detail.venue && <Row label="Lieu">{detail.venue}</Row>}
      {detail.referees?.length > 0 && (
        <Row label={detail.referees.length > 1 ? 'Arbitres' : 'Arbitre'}>
          {detail.referees.map((r) => r.name + (r.nationality ? ` (${r.nationality})` : '')).join(', ')}
        </Row>
      )}
      {!detail.halfTime && !stage && !detail.group && !detail.venue && !detail.referees?.length && (
        <p className="text-center text-[var(--color-text-dim)]">Aucun détail supplémentaire disponible.</p>
      )}
    </dl>
  )
}

function NbaDetail({ detail, match }) {
  const periods = detail?.periods
  if (!periods) {
    return (
      <p className="text-center text-sm text-[var(--color-text-dim)]">Détail indisponible.</p>
    )
  }

  const labels = periods.home.map((_, i) => (i < 4 ? `Q${i + 1}` : `Prol.${i - 3}`))

  return (
    <table className="w-full text-center text-sm">
      <thead>
        <tr className="text-xs text-[var(--color-text-dim)]">
          <th className="text-left font-normal">Équipe</th>
          {labels.map((l) => (
            <th key={l} className="font-normal">{l}</th>
          ))}
          <th className="font-semibold text-white">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="truncate text-left text-white">{match.home_team}</td>
          {periods.home.map((v, i) => (
            <td key={i} className="tabular-nums text-[var(--color-text-dim)]">{v}</td>
          ))}
          <td className="font-bold tabular-nums text-white">{match.home_score}</td>
        </tr>
        <tr>
          <td className="truncate text-left text-white">{match.away_team}</td>
          {periods.away.map((v, i) => (
            <td key={i} className="tabular-nums text-[var(--color-text-dim)]">{v}</td>
          ))}
          <td className="font-bold tabular-nums text-white">{match.away_score}</td>
        </tr>
      </tbody>
    </table>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-[var(--color-text-dim)]">{label}</dt>
      <dd className="text-right text-white">{children}</dd>
    </div>
  )
}
