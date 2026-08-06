import { format, isSameDay, isSameMonth, isToday } from 'date-fns'

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MAX_VISIBLE_PER_DAY = 3

// Grille calendrier classique (7 colonnes). Chaque jour affiche juste les
// logos des équipes qui s'affrontent + l'heure — pas les noms complets — pour
// rester lisible même les jours avec beaucoup de matchs. Cliquer un jour
// affiche son détail complet en dessous de la grille (voir CalendarPage).
export default function MonthGrid({ days, matchesByDay, anchorMonth, selectedDay, onSelectDay }) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[var(--color-text-dim)]">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          return (
            <DayCell
              key={key}
              day={day}
              matches={matchesByDay.get(key)}
              isCurrentMonth={isSameMonth(day, anchorMonth)}
              isSelected={Boolean(selectedDay) && isSameDay(day, selectedDay)}
              onSelect={onSelectDay}
            />
          )
        })}
      </div>
    </div>
  )
}

function DayCell({ day, matches, isCurrentMonth, isSelected, onSelect }) {
  const dayMatches = matches ?? []
  const visible = dayMatches.slice(0, MAX_VISIBLE_PER_DAY)
  const extra = dayMatches.length - visible.length

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      className={`flex min-h-[68px] flex-col items-stretch gap-1 rounded-lg border p-1 text-left transition sm:min-h-[92px] sm:p-1.5 ${
        isSelected
          ? 'border-emerald-500 bg-emerald-500/10'
          : 'border-[var(--color-border)] bg-[var(--color-panel)] hover:border-emerald-500/40'
      } ${isCurrentMonth ? '' : 'opacity-40'}`}
    >
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
          isToday(day) ? 'bg-emerald-500 text-white' : 'text-[var(--color-text-dim)]'
        }`}
      >
        {format(day, 'd')}
      </span>

      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
        {visible.map((match) => (
          <div key={match.id} className="flex items-center gap-0.5 text-[10px] leading-none text-[var(--color-text-dim)]">
            <img src={match.home_crest} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />
            <img src={match.away_crest} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />
            {/* Heure abrégée sur mobile (peu de place dans une grille à 7 colonnes), complète à partir de sm */}
            <span className="ml-auto shrink-0">
              <span className="sm:hidden">{format(new Date(match.utc_date), 'H')}h</span>
              <span className="hidden sm:inline">{format(new Date(match.utc_date), 'HH:mm')}</span>
            </span>
          </div>
        ))}
        {extra > 0 && (
          <span className="text-[10px] leading-none text-[var(--color-text-dim)]">+{extra}</span>
        )}
      </div>
    </button>
  )
}
