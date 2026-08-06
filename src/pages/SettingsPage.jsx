import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useUser } from '../context/UserContext'
import TeamSelect from '../components/TeamSelect'

export default function SettingsPage() {
  const { user, refreshUser } = useUser()
  const [team, setTeam] = useState({ team: user.favorite_team, league: user.favorite_league })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    const { error: dbError } = await supabase
      .from('users')
      .update({ favorite_team: team.team, favorite_league: team.league })
      .eq('id', user.id)

    setSaving(false)

    if (dbError) {
      setError("Impossible d'enregistrer, réessaie dans un instant.")
      return
    }

    await refreshUser(user.id)
    setSaved(true)
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-2xl font-bold text-white">Paramètres</h1>
      <p className="mt-1 text-sm text-[var(--color-text-dim)]">
        Connecté en tant que <span className="text-white">{user.pseudo}</span>
      </p>

      <div className="mt-6">
        <span className="block text-sm font-medium text-[var(--color-text-dim)]">Équipe favorite</span>
        <div className="mt-1">
          <TeamSelect value={team} onChange={setTeam} />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {saved && <p className="mt-4 text-sm text-emerald-400">Enregistré !</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-6 w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
      >
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  )
}
