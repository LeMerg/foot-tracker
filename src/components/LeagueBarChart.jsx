// Petit bar chart "maison" (pas de librairie externe) : une barre par ligue,
// largeur proportionnelle au max. counts: [{ code, name, color, count }]
export default function LeagueBarChart({ counts }) {
  const max = Math.max(1, ...counts.map((c) => c.count))

  return (
    <div className="space-y-2.5">
      {counts.map((c) => (
        <div key={c.code} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-xs text-[var(--color-text-dim)]">{c.name}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--color-panel-2)]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${(c.count / max) * 100}%`, backgroundColor: c.color }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs font-semibold text-white">{c.count}</span>
        </div>
      ))}
    </div>
  )
}
