// ============================================================================
// Edge Function: notify-discord
//
// Rôle : envoyer un message Discord (dans le salon du bon sport) quand un
// match ou une course vient de se terminer, pour rappeler aux amis d'aller
// le marquer "vu" sur le site. Appelée toutes les 15 min par un job
// pg_cron (voir la migration 20260813050000_discord_notifications.sql),
// pas besoin d'auth pour cet appel (verify_jwt = false, voir config.toml).
//
// Anti-doublon : chaque ligne (matches_cache/races_cache) n'est traitée
// qu'une fois grâce à la colonne `notified_at` — un match déjà notifié est
// ignoré aux passages suivants du cron.
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

async function postToDiscord(webhookUrl: string, content: string, roleId: string) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `<@&${roleId}> ${content}`,
      // Autorise explicitement le ping de CE rôle précis, plutôt que de
      // compter sur le comportement par défaut de Discord.
      allowed_mentions: { roles: [roleId] },
    }),
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  const skipped: string[] = []
  let matchesNotified = 0
  let racesNotified = 0

  // --- Matchs (foot + NBA, même vocabulaire de statut) ---
  const { data: matches } = await supabase
    .from('matches_cache')
    .select('*')
    .eq('status', 'FINISHED')
    .is('notified_at', null)

  for (const m of matches ?? []) {
    const sportKey = m.sport === 'basketball' ? 'basketball' : 'football'
    const webhook = WEBHOOKS[sportKey]
    if (!webhook) {
      skipped.push(`match ${m.id} (${m.sport} : secret manquant)`)
      continue
    }

    const emoji = m.sport === 'basketball' ? '🏀' : '⚽'
    const competition = m.sport === 'basketball' ? 'NBA' : (LEAGUE_NAMES[m.league] ?? m.league)
    const content = `${emoji} **${m.home_team} ${m.home_score} - ${m.away_score} ${m.away_team}** (${competition}) est terminé ! Va le marquer comme vu sur FanLog 👉 ${SITE_URL}`

    try {
      await postToDiscord(webhook, content, ROLE_IDS[sportKey])
      matchesNotified += 1
    } catch (err) {
      skipped.push(`match ${m.id} : ${(err as Error).message}`)
      continue
    }

    await supabase.from('matches_cache').update({ notified_at: new Date().toISOString() }).eq('id', m.id)
  }

  // --- Courses F1 ---
  const { data: races } = await supabase
    .from('races_cache')
    .select('*')
    .is('notified_at', null)

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
      await postToDiscord(WEBHOOKS.f1, content, ROLE_IDS.f1)
      racesNotified += 1
    } catch (err) {
      skipped.push(`course ${r.id} : ${(err as Error).message}`)
      continue
    }

    await supabase.from('races_cache').update({ notified_at: new Date().toISOString() }).eq('id', r.id)
  }

  return new Response(JSON.stringify({ matches: matchesNotified, races: racesNotified, skipped }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
