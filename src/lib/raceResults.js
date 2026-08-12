import { supabase } from './supabaseClient'

// Classement d'une session F1 (essais/qualifs/sprint/course). Passe par
// l'Edge Function "fetch-session-result" (pas d'appel direct au navigateur
// vers OpenF1) : évite le rate-limit/CORS côté navigateur et cache le
// résultat de façon permanente une fois la session terminée.
export async function fetchSessionResults(sessionKey, sessionEnd) {
  const { data, error } = await supabase.functions.invoke('fetch-session-result', {
    body: { session_key: sessionKey, session_end: sessionEnd },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
