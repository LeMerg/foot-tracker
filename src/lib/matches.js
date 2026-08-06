import { supabase } from './supabaseClient'

// Lit les matchs déjà en cache (table matches_cache) sur une période donnée,
// filtrés par ligue. Ne touche jamais l'API football-data.org directement :
// c'est le rôle de l'Edge Function (voir triggerMatchesRefresh ci-dessous).
export async function fetchMatches({ from, to, leagues }) {
  let query = supabase
    .from('matches_cache')
    .select('*')
    .gte('utc_date', from.toISOString())
    .lte('utc_date', to.toISOString())
    .order('utc_date', { ascending: true })

  if (leagues && leagues.length > 0) {
    query = query.in('league', leagues)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

// Déclenche l'Edge Function "fetch-matches" en arrière-plan (fire-and-forget).
// Elle décide elle-même si le cache a besoin d'être rafraîchi ou non, donc on
// peut l'appeler sans souci à chaque ouverture du calendrier.
export function triggerMatchesRefresh() {
  supabase.functions.invoke('fetch-matches').catch(() => {
    // Si l'Edge Function n'est pas encore déployée, on ignore silencieusement :
    // le calendrier reste simplement vide jusqu'au déploiement (voir README).
  })
}
