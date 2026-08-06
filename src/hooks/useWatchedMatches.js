import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Garde en mémoire l'ensemble des match_id que l'utilisateur courant a
// marqués "vu", et expose `toggle` pour en ajouter/retirer un (avec mise à
// jour optimiste de l'UI avant même la réponse de Supabase).
export function useWatchedMatches(userId) {
  const [watchedIds, setWatchedIds] = useState(() => new Set())

  const reload = useCallback(async () => {
    if (!userId) {
      setWatchedIds(new Set())
      return
    }
    const { data, error } = await supabase
      .from('watched_matches')
      .select('match_id')
      .eq('user_id', userId)

    if (!error && data) {
      setWatchedIds(new Set(data.map((row) => row.match_id)))
    }
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  const toggle = useCallback(
    async (match) => {
      if (!userId) return
      const alreadyWatched = watchedIds.has(match.id)

      setWatchedIds((prev) => {
        const next = new Set(prev)
        if (alreadyWatched) next.delete(match.id)
        else next.add(match.id)
        return next
      })

      if (alreadyWatched) {
        await supabase
          .from('watched_matches')
          .delete()
          .eq('user_id', userId)
          .eq('match_id', match.id)
      } else {
        await supabase
          .from('watched_matches')
          .insert({ user_id: userId, match_id: match.id, league: match.league })
      }
    },
    [userId, watchedIds],
  )

  return { watchedIds, toggle, reload }
}
