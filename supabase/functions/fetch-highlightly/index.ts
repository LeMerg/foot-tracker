// ============================================================================
// Edge Function: fetch-highlightly
//
// Rôle : aller chercher les matchs de 5 compétitions supplémentaires via
// l'API Highlightly (Eredivisie, Jupiler Pro League, Primeira Liga, Ligue
// Europa, Ligue Europa Conférence) et les stocker dans `matches_cache`,
// aux côtés des matchs football-data.org (même table, sport='football',
// juste des codes de ligue différents).
//
// Stratégie différente de fetch-matches : le plan gratuit Highlightly est
// plafonné à 100 requêtes/JOUR (pas de souci de débit/minute chez
// football-data.org, mais ici un vrai plafond quotidien) et son endpoint
// /matches ne prend qu'un seul jour à la fois (`date=YYYY-MM-DD`), pas de
// plage. Récupérer une saison entière (~300-400 matchs/compétition) à
// chaque rafraîchissement est donc hors de question.
//
// Deux vitesses de rafraîchissement, pour ne pas sacrifier le suivi "live"
// du jour même au profit de la fenêtre large :
//   - Aujourd'hui : TTL courte (3h) — un match qui vient de commencer ou de
//     se terminer apparaît à jour en quelques heures, pas le lendemain.
//   - Les 9 jours suivants : TTL longue (24h), comme avant — rien ne change
//     sur un match qui n'a pas encore eu lieu, pas besoin de le vérifier
//     souvent.
// Budget pire cas : (24h/3h) × 5 ligues [aujourd'hui] + 9 jours × 5 ligues
// [fenêtre future, 1x/24h] = 40 + 45 = 85 requêtes/jour, sous les 100/jour.
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

const TODAY_CACHE_HOURS = 3
const CACHE_HOURS = 24
const WINDOW_DAYS = 10

const LEAGUES = [
  { id: 3337, code: 'EL' },
  { id: 722432, code: 'ECL' },
  { id: 75672, code: 'ERE' },
  { id: 123328, code: 'JPL' },
  { id: 80778, code: 'PPL' },
] as const

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const HIGHLIGHTLY_API_KEY = Deno.env.get('HIGHLIGHTLY_API_KEY')

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

// Saison = année de début (une saison qui commence en août 2026 est
// "season=2026" côté Highlightly) — bascule automatiquement chaque été,
// pas de valeur à maintenir à la main.
function currentSeason(): number {
  const now = new Date()
  const month = now.getUTCMonth() // 0 = janvier
  return month >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
}

// today = true : ne regarde que les lignes datées d'aujourd'hui (fraîcheur
// du suivi live). today = false : ne regarde QUE les lignes datées après
// aujourd'hui (fraîcheur de la fenêtre future) — sans cette exclusion, les
// mises à jour fréquentes de la passe 1 (toutes les 3h) feraient paraître
// la fenêtre "fraîche" en permanence et elle ne se rafraîchirait plus jamais.
// S'il n'y a aucune ligne correspondante (ex. aucun match aujourd'hui dans
// ces 5 ligues), on considère que ce n'est pas frais : mieux vaut un appel
// API qui revient vide qu'un cache jamais vérifié.
async function isCacheFresh(hours: number, today: boolean): Promise<boolean> {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start.getTime() + 24 * 3_600_000)

  let query = supabase
    .from('matches_cache')
    .select('fetched_at')
    .in('league', LEAGUES.map((l) => l.code))

  query = today
    ? query.gte('utc_date', start.toISOString()).lt('utc_date', end.toISOString())
    : query.gte('utc_date', end.toISOString())

  const { data, error } = await query.order('fetched_at', { ascending: false }).limit(1).maybeSingle()

  if (error || !data) return false

  const ageHours = (Date.now() - new Date(data.fetched_at).getTime()) / 3_600_000
  return ageHours < hours
}

// Vocabulaire propre à Highlightly (state.description, texte libre) ->
// même vocabulaire interne que les autres sources (façon football-data.org).
// Filet de sécurité par défaut (SCHEDULED) si une valeur inconnue apparaît,
// à affiner à l'usage — même esprit que mapGameStatus() dans fetch-nba.
function mapStatus(description: string | undefined): string {
  const d = (description ?? '').toLowerCase()
  if (d.includes('finished')) return 'FINISHED'
  if (d.includes('postpon')) return 'POSTPONED'
  if (d.includes('cancel')) return 'CANCELLED'
  if (d.includes('live') || d.includes('half') || d.includes('progress')) return 'IN_PLAY'
  return 'SCHEDULED'
}

// "0 - 3" -> [0, 3]. null si pas encore joué (score absent/non numérique).
function parseScore(current: string | null | undefined): [number | null, number | null] {
  if (!current) return [null, null]
  const parts = current.split('-').map((p) => Number(p.trim()))
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return [null, null]
  return [parts[0], parts[1]]
}

function mapMatchToRow(match: any, league: string) {
  const [homeScore, awayScore] = parseScore(match.state?.score?.current)
  return {
    external_id: match.id,
    sport: 'football',
    league,
    matchday: null,
    utc_date: match.date,
    status: mapStatus(match.state?.description),
    home_team: match.homeTeam?.name ?? 'TBD',
    home_crest: match.homeTeam?.logo ?? null,
    away_team: match.awayTeam?.name ?? 'TBD',
    away_crest: match.awayTeam?.logo ?? null,
    home_score: homeScore,
    away_score: awayScore,
    fetched_at: new Date().toISOString(),
  }
}

async function fetchDayMatches(leagueId: number, season: number, date: string): Promise<any[]> {
  const url = new URL('https://soccer.highlightly.net/matches')
  url.searchParams.set('leagueId', String(leagueId))
  url.searchParams.set('season', String(season))
  url.searchParams.set('date', date)

  const res = await fetch(url, { headers: { 'x-rapidapi-key': HIGHLIGHTLY_API_KEY! } })
  if (!res.ok) {
    throw new Error(`Highlightly a répondu ${res.status} pour leagueId=${leagueId} date=${date}`)
  }
  const json = await res.json()
  return json.data ?? []
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (!HIGHLIGHTLY_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'HIGHLIGHTLY_API_KEY manquant côté serveur (supabase secrets set).' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }

  const season = currentSeason()
  const results: { league: string; tier: 'today' | 'window'; status: 'ok' | 'error'; count?: number; error?: string }[] = []

  // Passe 1 : aujourd'hui, TTL courte — c'est ici que se joue le suivi live.
  if (!(await isCacheFresh(TODAY_CACHE_HOURS, true))) {
    const today = isoDate(new Date())
    for (const league of LEAGUES) {
      try {
        const matches = await fetchDayMatches(league.id, season, today)
        const rows = matches.map((m) => mapMatchToRow(m, league.code))
        if (rows.length > 0) {
          const { error } = await supabase
            .from('matches_cache')
            .upsert(rows, { onConflict: 'sport,external_id' })
          if (error) throw error
        }
        results.push({ league: league.code, tier: 'today', status: 'ok', count: rows.length })
        await sleep(300)
      } catch (err) {
        results.push({ league: league.code, tier: 'today', status: 'error', error: (err as Error).message })
      }
    }
  }

  // Passe 2 : les 9 jours suivants, TTL longue — aujourd'hui déjà couvert
  // par la passe 1, pas la peine de le refaire ici.
  if (!(await isCacheFresh(CACHE_HOURS, false))) {
    const days = Array.from({ length: WINDOW_DAYS - 1 }, (_, i) => isoDate(new Date(Date.now() + (i + 1) * 24 * 3_600_000)))

    for (const league of LEAGUES) {
      try {
        const rows: any[] = []
        for (const date of days) {
          const matches = await fetchDayMatches(league.id, season, date)
          rows.push(...matches.map((m) => mapMatchToRow(m, league.code)))
          await sleep(300) // reste large sous les limites de débit
        }

        if (rows.length > 0) {
          const { error } = await supabase
            .from('matches_cache')
            .upsert(rows, { onConflict: 'sport,external_id' })
          if (error) throw error
        }

        results.push({ league: league.code, tier: 'window', status: 'ok', count: rows.length })
      } catch (err) {
        results.push({ league: league.code, tier: 'window', status: 'error', error: (err as Error).message })
      }
    }
  }

  return new Response(JSON.stringify({ status: 'refreshed', season, results }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
