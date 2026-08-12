import { supabase } from './supabaseClient'

// Lit les courses F1 déjà en cache (table races_cache), triées
// chronologiquement. Ne touche jamais OpenF1 directement : c'est le rôle de
// l'Edge Function (voir triggerRacesRefresh ci-dessous).
export async function fetchRaces() {
  const { data, error } = await supabase
    .from('races_cache')
    .select('*')
    .order('date_start', { ascending: true })

  if (error) throw error
  return data
}

// Déclenche l'Edge Function "fetch-races" en arrière-plan (fire-and-forget),
// même pattern que triggerMatchesRefresh.
export function triggerRacesRefresh() {
  supabase.functions.invoke('fetch-races').catch(() => {})
}
