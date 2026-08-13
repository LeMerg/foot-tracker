import TeamLogo from './TeamLogo'

// Résumé perso léger (pas un système d'achievements) : équipe la plus
// regardée + série de jours consécutifs. Visible sur tous les profils
// (public), masqué si rien à montrer (profil flambant neuf).
export default function ProfileStats({ topTeam, streak }) {
  if (!topTeam && !streak) return null

  return (
    <div className="mt-6 grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
        <p className="text-xs text-[var(--color-text-dim)]">Équipe la plus regardée</p>
        {topTeam ? (
          <div className="mt-2 flex items-center gap-2">
            <TeamLogo src={topTeam.crest} name={topTeam.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{topTeam.name}</p>
              <p className="text-xs text-[var(--color-text-dim)]">{topTeam.count}×</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-text-dim)]">—</p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
        <p className="text-xs text-[var(--color-text-dim)]">Série actuelle</p>
        <p className="mt-2 text-2xl font-extrabold tabular-nums text-emerald-400">
          {streak} <span className="text-sm font-normal text-[var(--color-text-dim)]">jour{streak > 1 ? 's' : ''}</span>
        </p>
      </div>
    </div>
  )
}
