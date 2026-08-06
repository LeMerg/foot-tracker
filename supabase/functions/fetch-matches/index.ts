// ============================================================================
// Edge Function: fetch-matches
//
// Rôle : aller chercher les matchs des 5 championnats sur football-data.org
// et les stocker dans la table `matches_cache` de Supabase, SANS jamais
// exposer la clé API football-data.org au navigateur (elle ne vit que dans
// les secrets de cette fonction, côté serveur Supabase).
//
// Cette fonction est appelée par le frontend (supabase.functions.invoke)
// à chaque ouverture du calendrier. Pour éviter de dépasser le quota
// football-data.org (10 requêtes/min sur le plan gratuit) même si plusieurs
// amis ouvrent le site en même temps, elle ne refait un vrai fetch externe
// que si le cache d'une ligue a plus de CACHE_HOURS heures. Sinon elle ne
// fait qu'une lecture Supabase (gratuite et illimitée) et ne touche pas
// à l'API externe.
//
// Déploiement : voir le README ("Déployer l'Edge Function").
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

const CACHE_HOURS = 6

const LEAGUES = ['PL', 'PD', 'BL1', 'FL1', 'SA'] as const

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont injectées automatiquement
// par Supabase dans toutes les Edge Functions (pas besoin de les définir).
// La clé service_role contourne les policies RLS : c'est volontaire ici,
// puisque matches_cache n'autorise aucune écriture via la clé publique.
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const FOOTBALL_DATA_API_KEY = Deno.env.get('FOOTBALL_DATA_API_KEY')

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function isCacheFresh(league: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('matches_cache')
    .select('fetched_at')
    .eq('league', league)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return false

  const ageHours = (Date.now() - new Date(data.fetched_at).getTime()) / 3_600_000
  return ageHours < CACHE_HOURS
}

async function fetchLeagueMatches(league: string) {
  const res = await fetch(`https://api.football-data.org/v4/competitions/${league}/matches`, {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY! },
  })

  if (!res.ok) {
    throw new Error(`football-data.org a répondu ${res.status} pour ${league}`)
  }

  const json = await res.json()
  return json.matches as any[]
}

function mapMatchToRow(match: any, league: string) {
  return {
    id: match.id,
    league,
    matchday: match.matchday ?? null,
    utc_date: match.utcDate,
    status: match.status,
    home_team: match.homeTeam?.shortName ?? match.homeTeam?.name ?? 'TBD',
    home_crest: match.homeTeam?.crest ?? null,
    away_team: match.awayTeam?.shortName ?? match.awayTeam?.name ?? 'TBD',
    away_crest: match.awayTeam?.crest ?? null,
    home_score: match.score?.fullTime?.home ?? null,
    away_score: match.score?.fullTime?.away ?? null,
    fetched_at: new Date().toISOString(),
  }
}

Deno.serve(async (req) => {
  // Le navigateur envoie d'abord une requête OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (!FOOTBALL_DATA_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'FOOTBALL_DATA_API_KEY manquant côté serveur (supabase secrets set).' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }

  const results: { league: string; status: 'cached' | 'refreshed' | 'error'; count?: number; error?: string }[] = []

  for (const league of LEAGUES) {
    try {
      if (await isCacheFresh(league)) {
        results.push({ league, status: 'cached' })
        continue
      }

      const matches = await fetchLeagueMatches(league)
      const rows = matches.map((m) => mapMatchToRow(m, league))

      // upsert : insère les nouveaux matchs, met à jour ceux déjà en cache
      // (utile pour rafraîchir le score une fois le match terminé).
      const { error } = await supabase.from('matches_cache').upsert(rows, { onConflict: 'id' })
      if (error) throw error

      results.push({ league, status: 'refreshed', count: rows.length })

      // Petite pause entre deux appels externes pour rester large sous les
      // 10 requêtes/minute du plan gratuit football-data.org.
      await sleep(3000)
    } catch (err) {
      results.push({ league, status: 'error', error: (err as Error).message })
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
