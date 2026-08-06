import { LEAGUE_BY_CODE } from '../data/leagues'

// Petit badge coloré réutilisé partout (calendrier, classement, détails...)
export default function LeagueBadge({ code, className = '' }) {
  const league = LEAGUE_BY_CODE[code]
  if (!league) return null

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${className}`}
      style={{ backgroundColor: league.color }}
    >
      {league.name}
    </span>
  )
}
