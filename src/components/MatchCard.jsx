import { format } from 'date-fns'
import LeagueBadge from './LeagueBadge'
import TeamLogo from './TeamLogo'
import CheckIcon from './CheckIcon'
import { getMatchStatus, canMarkWatched } from '../lib/eventStatus'
import { LEAGUE_BY_CODE } from '../data/leagues'

export default function MatchCard({ match, watched, onToggleWatched }) {
  const status = getMatchStatus(match)
  const cancelled = status === 'cancelled'
  const league = LEAGUE_BY_CODE[match.league]

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border bg-[var(--color-panel)] py-3 pl-3 pr-3 transition-colors ${
        cancelled
          ? 'border-[var(--color-border)] opacity-60'
          : watched
            ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
            : 'border-[var(--color-border)] hover:border-[var(--color-border)]/80'
      }`}
      style={{ borderLeft: `3px solid ${league?.color ?? 'var(--color-border)'}` }}
    >
      <div className="w-12 shrink-0 text-center text-sm text-[var(--color-text-dim)]">
        {status === 'live' ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            Live
          </span>
        ) : (
          format(new Date(match.utc_date), 'HH:mm')
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
        <TeamSide name={match.home_team} crest={match.home_crest} align="right" />

        <div className="shrink-0 px-1 text-center">
          {status === 'postponed' ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">Reporté</span>
          ) : status === 'cancelled' ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-red-400">Annulé</span>
          ) : status === 'completed' || status === 'live' ? (
            <span className="text-lg font-bold tabular-nums text-white">
              {match.home_score} - {match.away_score}
            </span>
          ) : (
            <span className="text-sm text-[var(--color-text-dim)]">vs</span>
          )}
        </div>

        <TeamSide name={match.away_team} crest={match.away_crest} align="left" />
      </div>

      <div className="hidden shrink-0 sm:block">
        <LeagueBadge code={match.league} />
      </div>

      {canMarkWatched(status) && (
        <button
          type="button"
          onClick={() => onToggleWatched(match)}
          title={watched ? 'Marquer comme non vu' : 'Marquer comme vu'}
          aria-pressed={watched}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
            watched
              ? 'animate-watched-pop bg-emerald-500 text-white'
              : 'bg-[var(--color-panel-2)] text-[var(--color-text-dim)] hover:text-white'
          }`}
        >
          <CheckIcon filled={watched} />
          <span className="hidden sm:inline">{watched ? 'Vu' : 'Marquer vu'}</span>
        </button>
      )}
    </div>
  )
}

function TeamSide({ name, crest, align }) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 ${
        align === 'right' ? 'flex-row-reverse text-right' : 'text-left'
      }`}
    >
      <TeamLogo src={crest} name={name} size="md" />
      <span className="truncate text-sm font-medium text-white">{name}</span>
    </div>
  )
}
