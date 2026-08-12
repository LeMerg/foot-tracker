import { supabase } from './supabaseClient'

// Matchs de foot ajoutés manuellement (absents du cache API) : créer une
// ligne = l'avoir vu, pas de table watched_* séparée pour ce type de match.
export async function fetchCustomMatches(userId) {
  const { data, error } = await supabase
    .from('custom_matches')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addCustomMatch({
  userId,
  homeTeam,
  awayTeam,
  homeScore = null,
  awayScore = null,
  playedOn = null,
}) {
  const { data, error } = await supabase
    .from('custom_matches')
    .insert({
      user_id: userId,
      home_team: homeTeam.trim(),
      away_team: awayTeam.trim(),
      home_score: homeScore,
      away_score: awayScore,
      played_on: playedOn,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCustomMatch(id) {
  const { error } = await supabase.from('custom_matches').delete().eq('id', id)
  if (error) throw error
}
