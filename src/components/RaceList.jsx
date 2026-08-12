import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import CheckIcon from './CheckIcon'
import { getRaceStatus, canMarkWatched } from '../lib/eventStatus'
import { F1_META } from '../data/leagues'

const SESSION_LABELS = { Practice: 'Essais', Qualifying: 'Qualifs', Sprint: 'Sprint', Race: 'Course' }

// Liste chronologique des week-ends de course F1. Pas de grille comme pour
// le foot/NBA : ~24 courses/an, une grille jour par jour serait vide la
// quasi-totalité du temps. Le suivi "vu" porte sur le week-end entier.
export default function RaceList({ races, watchedIds, onToggleWatched }) {
  if (races.length === 0) {
    return (
      <p className="mt-6 text-center text-sm text-[var(--color-text-dim)]">
        Aucune course trouvée (cache pas encore rempli — le calendrier se remplit automatiquement).
      </p>
    )
  }

  return (
    <div className="mt-6 space-y-3 pb-10">
      {races.map((race) => (
        <RaceCard key={race.id} race={race} watched={watchedIds.has(race.id)} onToggle={onToggleWatched} />
      ))}
    </div>
  )
}

function RaceCard({ race, watched, onToggle }) {
  const status = getRaceStatus(race)
  // Les essais libres comptent peu pour un fan casual : on met en avant
  // seulement qualifs/sprint/course.
  const keySessions = race.sessions.filter((s) => s.type !== 'Practice')

  return (
    <div
      className={`rounded-xl border bg-[var(--color-panel)] p-4 transition-colors ${
        status === 'cancelled'
          ? 'border-[var(--color-border)] opacity-60'
          : watched
            ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
            : 'border-[var(--color-border)]'
      }`}
      style={{ borderLeft: `3px solid ${F1_META.color}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {race.country_flag && (
            <img src={race.country_flag} alt="" className="h-6 w-9 shrink-0 rounded object-cover" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-white">{race.name}</p>
              {status === 'cancelled' && (
                <span className="shrink-0 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-400">
                  Annulée
                </span>
              )}
              {status === 'live' && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                  Live
                </span>
              )}
              {status === 'completed' && (
                <span className="shrink-0 rounded-full bg-[var(--color-panel-2)] px-2 py-0.5 text-[10px] text-[var(--color-text-dim)]">
                  Terminée
                </span>
              )}
            </div>
            <p className="truncate text-xs text-[var(--color-text-dim)]">{race.circuit}</p>
          </div>
        </div>

        {canMarkWatched(status) && (
          <button
            type="button"
            onClick={() => onToggle(race)}
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

      <div className="mt-3 flex flex-wrap gap-2">
        {keySessions.map((s) => (
          <div
            key={s.name}
            className={`rounded-lg bg-[var(--color-panel-2)] px-2.5 py-1 text-xs text-[var(--color-text-dim)] ${
              s.is_cancelled ? 'line-through opacity-50' : ''
            }`}
          >
            <span className="font-medium text-white">{SESSION_LABELS[s.type] ?? s.type}</span>{' '}
            {format(new Date(s.date_start), 'EEE d MMM · HH:mm', { locale: fr })}
            {s.is_cancelled && ' (annulée)'}
          </div>
        ))}
      </div>
    </div>
  )
}
