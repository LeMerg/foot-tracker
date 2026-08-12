import { useState } from 'react'
import { format } from 'date-fns'
import teams from '../data/teams.json'
import { addCustomMatch } from '../lib/customMatches'

const TEAM_NAME_OPTIONS = [...new Set(teams.map((t) => t.name))].sort((a, b) =>
  a.localeCompare(b, 'fr'),
)

// format() (contrairement à toISOString()) utilise l'heure locale : évite
// qu'un fuseau négatif affiche "hier" comme date par défaut.
function todayIso() {
  return format(new Date(), 'yyyy-MM-dd')
}

// Ajoute un match de foot absent du cache API (amateur, historique, amical…).
// Équipes en texte libre (autocomplétées depuis teams.json, pas restreintes) :
// l'ajout vaut immédiatement "vu", pas d'étape séparée. Pas de score demandé :
// on trace juste le fait d'avoir vu le match, pas le résultat.
export default function AddCustomMatchModal({ open, onClose, userId, onAdded }) {
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [playedOn, setPlayedOn] = useState(todayIso())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  if (!open) return null

  function resetAndClose() {
    setHomeTeam('')
    setAwayTeam('')
    setPlayedOn(todayIso())
    setError(null)
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const home = homeTeam.trim()
    const away = awayTeam.trim()

    if (!home || !away) {
      setError('Renseigne les deux équipes.')
      return
    }
    if (home.toLowerCase() === away.toLowerCase()) {
      setError('Les deux équipes doivent être différentes.')
      return
    }

    setSaving(true)
    try {
      const row = await addCustomMatch({
        userId,
        homeTeam: home,
        awayTeam: away,
        playedOn: playedOn || null,
      })
      onAdded(row)
      resetAndClose()
    } catch {
      setError("Impossible d'ajouter ce match, réessaie.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={resetAndClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white">Ajouter un match</h2>
        <p className="mt-1 text-sm text-[var(--color-text-dim)]">
          Pour un match de foot absent du calendrier (amateur, ancien, amical…).
        </p>

        <datalist id="custom-match-team-names">
          {TEAM_NAME_OPTIONS.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <input
            type="text"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            list="custom-match-team-names"
            placeholder="Équipe (domicile)"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
          />

          <input
            type="text"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            list="custom-match-team-names"
            placeholder="Équipe (extérieur)"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
          />

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-dim)]">Date</label>
            <input
              type="date"
              value={playedOn}
              onChange={(e) => setPlayedOn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={resetAndClose}
              className="flex-1 rounded-lg border border-[var(--color-border)] py-2.5 text-sm font-medium text-[var(--color-text-dim)] transition hover:text-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
