import { useMemo, useRef, useState } from 'react'
import teams from '../data/teams.json'
import { DOMESTIC_LEAGUES } from '../data/leagues'
import TeamLogo from './TeamLogo'

// Sélecteur d'équipe favorite : bouton qui ouvre un panneau avec recherche +
// équipes groupées par championnat (logo inclus). Utilisé à l'onboarding et
// dans les paramètres du profil.
//
// value  : { team: string, league: string } | null
// onChange(team) : appelé avec { team: string, league: string }
export default function TeamSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)

  const selected = useMemo(
    () => teams.find((t) => t.name === value?.team && t.league === value?.league),
    [value],
  )

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return DOMESTIC_LEAGUES.map((league) => ({
      league,
      teams: teams.filter(
        (t) => t.league === league.code && (!q || t.name.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.teams.length > 0)
  }, [query])

  function handlePick(team) {
    onChange({ team: team.name, league: team.league })
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2.5 text-left hover:border-emerald-500/60"
      >
        {selected ? (
          <>
            <TeamLogo src={selected.crest} name={selected.name} size="sm" />
            <span className="flex-1 truncate">{selected.name}</span>
            <span className="text-xs text-[var(--color-text-dim)]">{selected.leagueName}</span>
          </>
        ) : (
          <span className="flex-1 text-[var(--color-text-dim)]">Choisir une équipe…</span>
        )}
      </button>

      {open && (
        <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] shadow-xl">
          <div className="sticky top-0 bg-[var(--color-panel)] p-2">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une équipe…"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          {groups.map((group) => (
            <div key={group.league.code}>
              <div className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
                {group.league.name}
              </div>
              {group.teams.map((team) => (
                <button
                  type="button"
                  key={team.id}
                  onClick={() => handlePick(team)}
                  className="flex w-full items-center gap-3 px-3 py-1.5 text-left hover:bg-[var(--color-panel-2)]"
                >
                  <TeamLogo src={team.crest} name={team.name} size="xs" />
                  <span className="truncate text-sm">{team.name}</span>
                </button>
              ))}
            </div>
          ))}

          {groups.length === 0 && (
            <div className="p-3 text-sm text-[var(--color-text-dim)]">Aucune équipe trouvée.</div>
          )}
        </div>
      )}
    </div>
  )
}
