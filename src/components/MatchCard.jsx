import { format } from 'date-fns'
import LeagueBadge from './LeagueBadge'

export default function MatchCard({ match, watched, onToggleWatched }) {
  const played = match.status === 'FINISHED'

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
      <div className="w-12 shrink-0 text-center text-sm text-[var(--color-text-dim)]">
        {format(new Date(match.utc_date), 'HH:mm')}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
        <TeamSide name={match.home_team} crest={match.home_crest} align="right" />

        <div className="shrink-0 px-1 text-center">
          {played ? (
            <span className="text-base font-bold text-white">
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

      <button
        type="button"
        onClick={() => onToggleWatched(match)}
        title={watched ? 'Marquer comme non vu' : 'Marquer comme vu'}
        aria-pressed={watched}
        className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${
          watched
            ? 'bg-emerald-500 text-white'
            : 'bg-[var(--color-panel-2)] text-[var(--color-text-dim)] hover:text-white'
        }`}
      >
        {watched ? '✓ Vu' : 'Marquer vu'}
      </button>
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
      {crest && <img src={crest} alt="" className="h-6 w-6 shrink-0 object-contain" />}
      <span className="truncate text-sm font-medium text-white">{name}</span>
    </div>
  )
}
