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

// Même principe pour les compétitions supplémentaires via Highlightly
// (Eredivisie, Jupiler Pro League, Primeira Liga, Ligue Europa, Ligue
// Europa Conférence) — voir supabase/functions/fetch-highlightly.
export function triggerHighlightlyRefresh() {
  supabase.functions.invoke('fetch-highlightly').catch(() => {})
}

// Détail d'un match déjà joué (score mi-temps/arbitre pour le foot, déjà
// caché en base après un premier appel ; quart-temps pour la NBA, déjà
// présent sur la ligne). null si rien à montrer (NBA sans quart-temps —
// le match n'a pas encore commencé, incohérent avec un clic possible mais
// gardé par sécurité).
export async function fetchMatchDetail(match) {
  if (match.details) return match.details
  if (match.sport !== 'football') return null
  const { data, error } = await supabase.functions.invoke('fetch-match-detail', {
    body: { id: match.id },
  })
  if (error) throw error
  return data
}
