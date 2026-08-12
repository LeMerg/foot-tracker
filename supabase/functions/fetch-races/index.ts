// ============================================================================
// Edge Function: fetch-races
//
// Rôle : aller chercher le calendrier F1 de l'année en cours sur OpenF1
// (gratuite, sans clé) et le stocker dans `races_cache`. Un "meeting" OpenF1
// = un week-end de course (ex: "Bahrain Grand Prix"), qui contient plusieurs
// "sessions" (essais libres, qualifs, course...) qu'on stocke en jsonb dans
// la ligne du meeting plutôt que dans une table séparée (très peu de volume :
// ~5 sessions x ~24 courses/an).
//
// Contrairement à football-data.org, OpenF1 n'impose pas de clé ni de
// rate-limit strict documenté, mais on garde le même pattern de cache 6h
// que les autres fonctions pour rester cohérent et rapide côté frontend.
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

const CACHE_HOURS = 6

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

async function isCacheFresh(): Promise<boolean> {
  const { data, error } = await supabase
    .from('races_cache')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return false

  const ageHours = (Date.now() - new Date(data.fetched_at).getTime()) / 3_600_000
  return ageHours < CACHE_HOURS
}

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
    if (await isCacheFresh()) {
      return new Response(JSON.stringify({ status: 'cached' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const year = new Date().getFullYear()

    const [meetings, sessions] = await Promise.all([
      fetchJson(`https://api.openf1.org/v1/meetings?year=${year}`),
      fetchJson(`https://api.openf1.org/v1/sessions?year=${year}`),
    ])

    // Regroupe les sessions par week-end de course (une seule requête pour
    // toute l'année plutôt qu'un appel par meeting).
    const sessionsByMeeting = new Map<number, any[]>()
    for (const s of sessions as any[]) {
      const list = sessionsByMeeting.get(s.meeting_key) ?? []
      list.push({
        type: s.session_type,
        name: s.session_name,
        date_start: s.date_start,
        date_end: s.date_end,
      })
      sessionsByMeeting.set(s.meeting_key, list)
    }

    const rows = (meetings as any[]).map((m) => ({
      id: m.meeting_key,
      name: m.meeting_name,
      country: m.country_name,
      country_flag: m.country_flag ?? null,
      circuit: m.circuit_short_name,
      date_start: m.date_start,
      date_end: m.date_end,
      sessions: (sessionsByMeeting.get(m.meeting_key) ?? []).sort(
        (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
      ),
      fetched_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from('races_cache').upsert(rows, { onConflict: 'id' })
    if (error) throw error

    return new Response(JSON.stringify({ status: 'refreshed', count: rows.length }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
