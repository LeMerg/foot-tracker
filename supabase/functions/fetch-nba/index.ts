// ============================================================================
// Edge Function: fetch-nba
//
// Rôle : aller chercher les matchs NBA à venir sur balldontlie.io et les
// stocker dans `matches_cache` (sport='basketball', league='NBA'), sans
// jamais exposer la clé API au navigateur. Même logique de cache 6h que
// fetch-matches (voir ce fichier pour le raisonnement détaillé).
//
// On ne récupère qu'une fenêtre glissante de ~90 jours à venir (pas la
// saison entière, ~1230 matchs) : ça reste dans l'esprit "calendrier de ce
// qui arrive bientôt", et ça évite d'avoir à paginer beaucoup de pages sur
// le plan gratuit (5 requêtes/minute).
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'
import { NBA_TEAMS } from '../_shared/nbaTeams.ts'

const CACHE_HOURS = 6
const WINDOW_DAYS = 90
const LEAGUE = 'NBA'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const BALLDONTLIE_API_KEY = Deno.env.get('BALLDONTLIE_API_KEY')

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

async function isCacheFresh(): Promise<boolean> {
  const { data, error } = await supabase
    .from('matches_cache')
    .select('fetched_at')
    .eq('league', LEAGUE)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return false

  const ageHours = (Date.now() - new Date(data.fetched_at).getTime()) / 3_600_000
  return ageHours < CACHE_HOURS
}

// balldontlie pagine par curseur (max 100 résultats/page). On boucle tant
// qu'il reste une page suivante, avec une petite pause pour rester large
// sous les 5 requêtes/minute du plan gratuit.
async function fetchNbaGames(): Promise<any[]> {
  const startDate = isoDate(new Date())
  const endDate = isoDate(new Date(Date.now() + WINDOW_DAYS * 24 * 3_600_000))

  const games: any[] = []
  let cursor: number | undefined

  do {
    const url = new URL('https://api.balldontlie.io/v1/games')
    url.searchParams.set('start_date', startDate)
    url.searchParams.set('end_date', endDate)
    url.searchParams.set('per_page', '100')
    if (cursor !== undefined) url.searchParams.set('cursor', String(cursor))

    const res = await fetch(url, { headers: { Authorization: BALLDONTLIE_API_KEY! } })
    if (!res.ok) {
      throw new Error(`balldontlie.io a répondu ${res.status}`)
    }

    const json = await res.json()
    games.push(...json.data)
    cursor = json.meta?.next_cursor

    if (cursor !== undefined) await sleep(13000) // reste sous 5 req/min
  } while (cursor !== undefined)

  return games
}

// balldontlie n'a pas de statut unique et propre comme football-data.org :
// on reconstruit le même vocabulaire (SCHEDULED/IN_PLAY/FINISHED/POSTPONED/
// CANCELLED) à partir de plusieurs champs (status_state, postponed, status
// texte libre) pour que le reste de l'app (src/lib/eventStatus.js) n'ait
// qu'UN SEUL vocabulaire à comprendre, quel que soit le sport.
function mapGameStatus(game: any): string {
  if (game.postponed) return 'POSTPONED'
  if (typeof game.status === 'string' && /cancel/i.test(game.status)) return 'CANCELLED'
  if (game.status_state === 'final') return 'FINISHED'
  if (game.period > 0) return 'IN_PLAY' // quart-temps en cours, mi-temps, etc.
  return 'SCHEDULED'
}

function mapGameToRow(game: any) {
  const homeTeam = NBA_TEAMS[game.home_team?.id]
  const awayTeam = NBA_TEAMS[game.visitor_team?.id]

  return {
    external_id: game.id,
    sport: 'basketball',
    league: LEAGUE,
    matchday: null,
    utc_date: game.datetime,
    status: mapGameStatus(game),
    home_team: homeTeam?.name ?? game.home_team?.name ?? 'TBD',
    home_crest: homeTeam?.crest ?? null,
    away_team: awayTeam?.name ?? game.visitor_team?.name ?? 'TBD',
    away_crest: awayTeam?.crest ?? null,
    home_score: game.home_team_score || null,
    away_score: game.visitor_team_score || null,
    fetched_at: new Date().toISOString(),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (!BALLDONTLIE_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'BALLDONTLIE_API_KEY manquant côté serveur (supabase secrets set).' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }

  try {
    if (await isCacheFresh()) {
      return new Response(JSON.stringify({ league: LEAGUE, status: 'cached' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const games = await fetchNbaGames()
    const rows = games.map(mapGameToRow)

    const { error } = await supabase
      .from('matches_cache')
      .upsert(rows, { onConflict: 'sport,external_id' })
    if (error) throw error

    return new Response(JSON.stringify({ league: LEAGUE, status: 'refreshed', count: rows.length }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ league: LEAGUE, status: 'error', error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
