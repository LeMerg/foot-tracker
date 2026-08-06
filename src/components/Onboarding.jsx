import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useUser } from '../context/UserContext'
import TeamSelect from './TeamSelect'

const PSEUDO_REGEX = /^[a-zA-Z0-9 _-]{2,20}$/

// Écran plein cran affiché tant que l'utilisateur n'a pas choisi de pseudo
// (première visite sur cet appareil). Une fois validé, le pseudo + l'équipe
// favorite sont stockés dans Supabase (table `users`) et en localStorage.
export default function Onboarding() {
  const { login } = useUser()
  const [pseudo, setPseudo] = useState('')
  const [team, setTeam] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const trimmed = pseudo.trim()
    if (!PSEUDO_REGEX.test(trimmed)) {
      setError('Le pseudo doit faire 2 à 20 caractères (lettres, chiffres, espace, - ou _).')
      return
    }
    if (!team) {
      setError('Choisis ton équipe favorite.')
      return
    }

    setSubmitting(true)
    const { data, error: dbError } = await supabase
      .from('users')
      .insert({ pseudo: trimmed, favorite_team: team.team, favorite_league: team.league })
      .select()
      .single()
    setSubmitting(false)

    if (dbError) {
      // 23505 = violation de contrainte unique (pseudo déjà pris)
      setError(
        dbError.code === '23505'
          ? 'Ce pseudo est déjà pris, choisis-en un autre.'
          : "Une erreur est survenue, réessaie dans un instant.",
      )
      return
    }

    login(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-pitch)] p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 shadow-2xl"
      >
        <h1 className="text-2xl font-bold text-white">Bienvenue 👋</h1>
        <p className="mt-1 text-sm text-[var(--color-text-dim)]">
          Choisis un pseudo et ton équipe de cœur pour commencer à suivre les matchs.
        </p>

        <label className="mt-6 block text-sm font-medium text-[var(--color-text-dim)]">
          Pseudo
          <input
            type="text"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder="ex: Mergim"
            maxLength={20}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2.5 text-white outline-none focus:border-emerald-500"
          />
        </label>

        <div className="mt-4">
          <span className="block text-sm font-medium text-[var(--color-text-dim)]">
            Équipe favorite
          </span>
          <div className="mt-1">
            <TeamSelect value={team} onChange={setTeam} />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {submitting ? 'Création…' : 'C’est parti !'}
        </button>
      </form>
    </div>
  )
}
