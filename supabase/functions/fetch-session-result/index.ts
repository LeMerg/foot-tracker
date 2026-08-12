// ============================================================================
// Edge Function: fetch-session-result
//
// Rôle : récupérer le classement d'UNE session F1 (essais/qualifs/sprint/
// course) à la demande, quand l'utilisateur clique sur une session déjà
// jouée. OpenF1 est gratuite et sans clé, mais appliquer une vraie limite de
// débit côté navigateur (429 constaté en pratique) et le CORS navigateur
// est plus fragile qu'un appel serveur→serveur — donc même si aucune clé
// secrète n'est nécessaire, on centralise l'appel ici pour :
//   1. Ne faire qu'UN SEUL appel externe par session, jamais répété une fois
//      le résultat en cache (le classement d'une session terminée ne
//      change plus) — actuellement chaque ouverture de modale refaisait
//      2 appels (session_result + drivers), même pour la même session.
//   2. Éviter toute dépendance au CORS/rate-limit du navigateur de
//      l'utilisateur final.
//
// Une session encore "live" (date de fin pas encore passée) n'est JAMAIS
// mise en cache : son classement peut encore changer.
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

async function fetchJson(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OpenF1 a répondu ${res.status} pour ${url}`)
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const { session_key, session_end } = await req.json()
    if (!session_key) {
      return new Response(JSON.stringify({ error: 'session_key manquant.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { data: cached } = await supabase
      .from('session_results_cache')
      .select('results')
      .eq('session_key', session_key)
      .maybeSingle()

    if (cached) {
      return new Response(JSON.stringify(cached.results), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const [results, drivers] = await Promise.all([
      fetchJson(`https://api.openf1.org/v1/session_result?session_key=${session_key}`),
      fetchJson(`https://api.openf1.org/v1/drivers?session_key=${session_key}`),
    ])

    const byNumber = new Map(drivers.map((d: any) => [d.driver_number, d]))
    const merged = results
      .map((r: any) => ({ ...r, driver: byNumber.get(r.driver_number) ?? null }))
      .sort((a: any, b: any) => (a.position ?? 999) - (b.position ?? 999))

    // Cache permanent uniquement si la session est bien terminée ET que le
    // classement n'est pas vide (une session sans résultat, ex: pas encore
    // publié côté OpenF1, ne doit pas être figée en cache).
    const sessionOver = session_end ? new Date(session_end).getTime() < Date.now() : false
    if (sessionOver && merged.length > 0) {
      await supabase.from('session_results_cache').upsert({ session_key, results: merged })
    }

    return new Response(JSON.stringify(merged), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
