// ============================================================================
// Edge Function: notify-discord
//
// Rôle : envoyer un message Discord (dans le salon du bon sport) pour
// rappeler aux amis d'aller marquer "vu" sur le site. Appelée toutes les
// 15 min par un job pg_cron (voir la migration
// 20260813050000_discord_notifications.sql), pas besoin d'auth pour cet
// appel (verify_jwt = false, voir config.toml).
//
// Foot/NBA : UN SEUL message récap par soirée (pas un message par match) —
// une soirée de Ligue des Champions peut avoir 8-9 matchs qui finissent à
// quelques minutes d'écart, un message par match aurait spammé le salon.
// Une "soirée" = tous les matchs d'un sport partageant la même date UTC
// (`utc_date`). On attend que TOUS les matchs de cette date soient dans un
// état terminal (FINISHED/POSTPONED/CANCELLED) avant d'envoyer le récap —
// sinon on risque d'annoncer une soirée encore en cours.
//
// F1 : toujours un message par week-end de course (déjà un événement
// unique, pas de regroupement nécessaire), avec le top 5.
//
// Anti-doublon : chaque ligne (matches_cache/races_cache) n'est traitée
// qu'une fois grâce à la colonne `notified_at`.
//
// 3 webhooks indépendants (un par sport) : si l'un des secrets manque
// (setup progressif), on traite quand même les autres sports au lieu
// d'échouer entièrement.
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'
import { LEAGUE_NAMES } from '../_shared/leagueNames.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = 'https://foot-tracker.pages.dev'
const TERMINAL_STATUSES = ['FINISHED', 'POSTPONED', 'CANCELLED']

// Même compromis que côté frontend (src/lib/eventStatus.js) : le cache
// Highlightly ne se rafraîchit que toutes les 3h, donc un match peut rester
// IN_PLAY dans matches_cache bien après sa fin réelle. Sans ce filet de
// sécurité, UN SEUL match encore marqué IN_PLAY (à tort) bloquerait le récap
// de toute la soirée indéfiniment, pour tous les sports. Passé ce délai
// depuis le coup d'envoi, on traite le match comme terminé (avec son
// dernier score connu) plutôt que d'attendre un rafraîchissement qui n'a
// pas eu lieu.
const STALE_LIVE_HOURS = 2

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const WEBHOOKS: Record<'football' | 'basketball' | 'f1', string | undefined> = {
  football: Deno.env.get('DISCORD_WEBHOOK_FOOTBALL'),
  basketball: Deno.env.get('DISCORD_WEBHOOK_NBA'),
  f1: Deno.env.get('DISCORD_WEBHOOK_F1'),
}

// Ids de rôle (pas des secrets, juste des identifiants propres à ce
// serveur Discord) — pingés dans chaque message pour que les gens
// reçoivent une vraie notification, pas juste un message silencieux.
const ROLE_IDS: Record<'football' | 'basketball' | 'f1', string> = {
  football: '1537483367715438694',
  basketball: '1537483400418689114',
  f1: '1537483427228553276',
}

// `test: true` désactive le ping (utilisé pour vérifier un message sans
// déranger les gens déjà sur le serveur Discord) — préfixe "(test)" et
// allowed_mentions vide plutôt que de compter sur l'absence du rôle dans
// le texte.
async function postToDiscord(webhookUrl: string, content: string, roleId: string, test: boolean) {
  const body = test
    ? { content: `🧪 *(test)* ${content}`, allowed_mentions: { parse: [] } }
    : { content: `<@&${roleId}> ${content}`, allowed_mentions: { roles: [roleId] } }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Discord a répondu ${res.status}`)
}

// Toutes les sessions non-annulées d'une course sont-elles terminées ?
// Même logique que getRaceStatus() côté frontend (src/lib/eventStatus.js).
function isRaceOver(race: any): boolean {
  const sessions = race.sessions ?? []
  const relevant = sessions.filter((s: any) => !s.is_cancelled)
  if (relevant.length === 0) return false
  return relevant.every((s: any) => new Date(s.date_end).getTime() < Date.now())
}

// Un match encore IN_PLAY/PAUSED/SUSPENDED dont le coup d'envoi remonte à
// plus de STALE_LIVE_HOURS est traité comme terminé (cache jamais rafraîchi
// après la fin réelle), sans quoi il resterait "en attente" pour toujours.
function isStaleLive(m: any): boolean {
  if (TERMINAL_STATUSES.includes(m.status)) return false
  const hoursSinceKickoff = (Date.now() - new Date(m.utc_date).getTime()) / 3_600_000
  return hoursSinceKickoff > STALE_LIVE_HOURS
}

function isEffectivelyClosed(m: any): boolean {
  return TERMINAL_STATUSES.includes(m.status) || isStaleLive(m)
}

// Regroupe une liste de matchs par compétition, dans l'ordre alphabétique
// du nom affiché — sert au format de récap "---------Ligue---------".
function groupByLeague(matches: any[], sportValue: 'football' | 'basketball'): Map<string, any[]> {
  const byLeague = new Map<string, any[]>()
  for (const m of matches) {
    const name = sportValue === 'basketball' ? 'NBA' : (LEAGUE_NAMES[m.league] ?? m.league)
    if (!byLeague.has(name)) byLeague.set(name, [])
    byLeague.get(name)!.push(m)
  }
  return new Map([...byLeague.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

const PODIUM_MEDALS = ['🥇', '🥈', '🥉']

// Top 5 de la session "Race" du week-end, formaté pour le message Discord.
// Réutilise fetch-session-result (même cache permanent que la modale de
// détail côté site) plutôt que de refaire l'appel OpenF1 ici. Retourne null
// si indisponible (session annulée, pas encore de résultat...) — le
// message reste alors simple, sans bloquer la notification.
async function buildPodiumText(race: any): Promise<string | null> {
  const raceSession = (race.sessions ?? []).find((s: any) => s.type === 'Race' && s.session_key != null)
  if (!raceSession) return null

  const { data, error } = await supabase.functions.invoke('fetch-session-result', {
    body: { session_key: raceSession.session_key, session_end: raceSession.date_end },
  })
  if (error || !Array.isArray(data) || data.length === 0) return null

  return data
    .slice(0, 5)
    .map((r: any, i: number) => {
      const rank = PODIUM_MEDALS[i] ?? `${i + 1}.`
      const driver = r.driver?.full_name ?? `#${r.driver_number}`
      const team = r.driver?.team_name ? ` (${r.driver.team_name})` : ''
      return `${rank} ${driver}${team}`
    })
    .join('\n')
}

// Un récap par soirée (groupée par date UTC de `utc_date`) pour un sport
// donné. Ne s'exécute que sur les soirées "closes" (plus aucun match
// SCHEDULED/IN_PLAY ce jour-là) — sinon on attend le prochain passage du cron.
async function processMatchRecaps(
  sportValue: 'football' | 'basketball',
  webhookKey: 'football' | 'basketball',
  test: boolean,
  skipped: string[],
): Promise<number> {
  // Bornée aux 3 derniers jours passés : sans ça, la requête ramène aussi
  // les centaines/milliers de matchs SCHEDULED du reste de la saison (tous
  // "non notifiés" par défaut) et se fait tronquer par la limite par
  // défaut de PostgREST (1000 lignes) — un match déjà joué mais trié après
  // ce seuil ne serait alors jamais repris. Un match futur n'a de toute
  // façon rien à faire dans un récap avant sa date.
  const now = new Date()
  const windowStart = new Date(now.getTime() - 3 * 24 * 3_600_000).toISOString()

  const { data: rows } = await supabase
    .from('matches_cache')
    .select('*')
    .eq('sport', sportValue)
    .is('notified_at', null)
    .gte('utc_date', windowStart)
    .lt('utc_date', now.toISOString())

  if (!rows || rows.length === 0) return 0

  const groups = new Map<string, any[]>()
  for (const m of rows) {
    const day = String(m.utc_date).slice(0, 10)
    if (!groups.has(day)) groups.set(day, [])
    groups.get(day)!.push(m)
  }

  let recapsSent = 0

  for (const [day, dayMatches] of groups) {
    const stillPending = dayMatches.some((m) => !isEffectivelyClosed(m))
    if (stillPending) continue // soirée pas encore terminée, on retentera au prochain passage

    const ids = dayMatches.map((m) => m.id)
    const finished = dayMatches.filter((m) => m.status === 'FINISHED' || isStaleLive(m))

    if (finished.length === 0) {
      // Rien à annoncer (tout reporté/annulé) — on clôt juste le groupe.
      await supabase.from('matches_cache').update({ notified_at: new Date().toISOString() }).in('id', ids)
      continue
    }

    const webhook = WEBHOOKS[webhookKey]
    if (!webhook) {
      skipped.push(`récap ${sportValue} ${day} (secret manquant)`)
      continue
    }

    const emoji = sportValue === 'basketball' ? '🏀' : '⚽'
    const sections = [...groupByLeague(finished, sportValue).entries()].map(([leagueName, ms]) => {
      const lines = ms.map((m) => `${m.home_team} ${m.home_score} - ${m.away_score} ${m.away_team}`)
      return `---------${leagueName}---------\n${lines.join('\n')}`
    })
    const content = `${emoji} **Récap de la soirée**\n\n${sections.join('\n\n')}\n\nVa les marquer comme vus sur FanLog 👉 ${SITE_URL}`

    try {
      await postToDiscord(webhook, content, ROLE_IDS[webhookKey], test)
      recapsSent += 1
    } catch (err) {
      skipped.push(`récap ${sportValue} ${day} : ${(err as Error).message}`)
      continue
    }

    await supabase.from('matches_cache').update({ notified_at: new Date().toISOString() }).in('id', ids)
  }

  return recapsSent
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  const { test } = await req.json().catch(() => ({ test: false }))
  const skipped: string[] = []

  const footballRecaps = await processMatchRecaps('football', 'football', Boolean(test), skipped)
  const basketballRecaps = await processMatchRecaps('basketball', 'basketball', Boolean(test), skipped)

  // --- Courses F1 (déjà un message par week-end, pas de regroupement à faire) ---
  const { data: races } = await supabase
    .from('races_cache')
    .select('*')
    .is('notified_at', null)

  let racesNotified = 0

  for (const r of races ?? []) {
    if (!isRaceOver(r)) continue

    if (!WEBHOOKS.f1) {
      skipped.push(`course ${r.id} (F1 : secret manquant)`)
      continue
    }

    const podium = await buildPodiumText(r)
    const content = podium
      ? `🏎️ **${r.name}** est terminée !\n${podium}\nClassement complet sur FanLog 👉 ${SITE_URL}`
      : `🏎️ **${r.name}** est terminée ! Le classement complet est dispo sur FanLog 👉 ${SITE_URL}`

    try {
      await postToDiscord(WEBHOOKS.f1, content, ROLE_IDS.f1, Boolean(test))
      racesNotified += 1
    } catch (err) {
      skipped.push(`course ${r.id} : ${(err as Error).message}`)
      continue
    }

    await supabase.from('races_cache').update({ notified_at: new Date().toISOString() }).eq('id', r.id)
  }

  return new Response(
    JSON.stringify({ footballRecaps, basketballRecaps, races: racesNotified, skipped }),
    { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
  )
})
