// ============================================================================
// Edge Function: fetch-match-detail
//
// Rôle : récupérer le détail d'UN match de foot déjà joué (score mi-temps,
// arbitre, stage) à la demande, quand l'utilisateur clique sur une carte de
// match — contrairement à fetch-matches (rafraîchissement en masse toutes
// les 6h), cette fonction ne touche l'API externe que sur clic explicite,
// et ne rafraîchit JAMAIS un détail déjà en cache : un match terminé, son
// score mi-temps et son arbitre ne changent plus, donc `details` sert de
// cache permanent une fois rempli (pas de TTL comme les autres fonctions).
//
// NBA n'a pas besoin de cette fonction : son détail (score quart-temps) est
// déjà présent dans la réponse balldontlie récupérée en masse par fetch-nba,
// donc déjà sur la ligne matches_cache au moment où l'utilisateur clique.
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

const FOOTBALL_DATA_API_KEY = Deno.env.get('FOOTBALL_DATA_API_KEY')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (!FOOTBALL_DATA_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'FOOTBALL_DATA_API_KEY manquant côté serveur (supabase secrets set).' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const { id } = await req.json()

    const { data: row, error: rowError } = await supabase
      .from('matches_cache')
      .select('id, sport, external_id, details')
      .eq('id', id)
      .maybeSingle()

    if (rowError) throw rowError
    if (!row) {
      return new Response(JSON.stringify({ error: 'Match introuvable.' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    if (row.sport !== 'football') {
      return new Response(JSON.stringify({ error: 'Détail disponible pour le foot uniquement.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Cache permanent : si déjà rempli, on ne rappelle jamais l'API externe.
    if (row.details) {
      return new Response(JSON.stringify(row.details), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch(`https://api.football-data.org/v4/matches/${row.external_id}`, {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
    })
    if (!res.ok) {
      throw new Error(`football-data.org a répondu ${res.status}`)
    }
    const match = await res.json()

    const details = {
      halfTime: match.score?.halfTime ?? null,
      referees: (match.referees ?? []).map((r: any) => ({ name: r.name, nationality: r.nationality })),
      stage: match.stage ?? null,
      group: match.group ?? null,
      venue: match.venue ?? null,
    }

    const { error: updateError } = await supabase
      .from('matches_cache')
      .update({ details })
      .eq('id', row.id)
    if (updateError) throw updateError

    return new Response(JSON.stringify(details), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
