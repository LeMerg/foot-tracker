import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useUser } from '../context/UserContext'
import TeamSelect from './TeamSelect'

const PSEUDO_REGEX = /^[a-zA-Z0-9 _-]{2,20}$/

// Écran plein cran affiché tant qu'aucun pseudo n'est enregistré sur cet
// appareil. Deux modes :
// - "create" : nouveau pseudo + équipe favorite (première visite du site).
// - "existing" : retrouver un pseudo déjà créé ailleurs (ex: sur un autre
//   appareil) — pas de mot de passe, donc on se contente de vérifier que le
//   pseudo existe déjà en base (même logique "honor system" que le reste du
//   site, voir supabase/schema.sql).
export default function Onboarding() {
  const { login } = useUser()
  const [mode, setMode] = useState('create')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-pitch)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 shadow-2xl">
        <h1 className="text-2xl font-bold text-white">Bienvenue 👋</h1>

        <div className="mt-4 flex rounded-lg border border-[var(--color-border)] p-0.5">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
              mode === 'create' ? 'bg-emerald-500 text-white' : 'text-[var(--color-text-dim)]'
            }`}
          >
            Nouveau pseudo
          </button>
          <button
            type="button"
            onClick={() => setMode('existing')}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
              mode === 'existing' ? 'bg-emerald-500 text-white' : 'text-[var(--color-text-dim)]'
            }`}
          >
            J’ai déjà un pseudo
          </button>
        </div>

        {mode === 'create' ? <CreateForm login={login} /> : <ExistingForm login={login} />}
      </div>
    </div>
  )
}

function CreateForm({ login }) {
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
          ? 'Ce pseudo est déjà pris, choisis-en un autre (ou connecte-toi avec via "J’ai déjà un pseudo").'
          : "Une erreur est survenue, réessaie dans un instant.",
      )
      return
    }

    login(data)
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="mt-4 text-sm text-[var(--color-text-dim)]">
        Choisis un pseudo et ton équipe de cœur pour commencer à suivre les matchs.
      </p>

      <label className="mt-4 block text-sm font-medium text-[var(--color-text-dim)]">
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
        <span className="block text-sm font-medium text-[var(--color-text-dim)]">Équipe favorite</span>
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
  )
}

function ExistingForm({ login }) {
  const [pseudo, setPseudo] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const trimmed = pseudo.trim()
    if (!trimmed) {
      setError('Entre ton pseudo.')
      return
    }

    setSubmitting(true)
    const { data, error: dbError } = await supabase
      .from('users')
      .select('*')
      .ilike('pseudo', trimmed)
      .maybeSingle()
    setSubmitting(false)

    if (dbError || !data) {
      setError('Pseudo introuvable. Vérifie l’orthographe, ou crée un nouveau pseudo.')
      return
    }

    login(data)
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="mt-4 text-sm text-[var(--color-text-dim)]">
        Retrouve ton pseudo créé sur un autre appareil (aucun mot de passe : tape juste le même
        pseudo).
      </p>

      <label className="mt-4 block text-sm font-medium text-[var(--color-text-dim)]">
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

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
      >
        {submitting ? 'Connexion…' : 'Continuer'}
      </button>
    </form>
  )
}
