import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Même pattern que useWatchedMatches, mais pour les week-ends de course F1
// (watched_races), suivis au niveau de la course entière (pas par session).
export function useWatchedRaces(userId) {
  const [watchedIds, setWatchedIds] = useState(() => new Set())

  const reload = useCallback(async () => {
    if (!userId) {
      setWatchedIds(new Set())
      return
    }
    const { data, error } = await supabase
      .from('watched_races')
      .select('race_id')
      .eq('user_id', userId)

    if (!error && data) {
      setWatchedIds(new Set(data.map((row) => row.race_id)))
    }
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  const toggle = useCallback(
    async (race) => {
      if (!userId) return
      const alreadyWatched = watchedIds.has(race.id)

      setWatchedIds((prev) => {
        const next = new Set(prev)
        if (alreadyWatched) next.delete(race.id)
        else next.add(race.id)
        return next
      })

      if (alreadyWatched) {
        await supabase.from('watched_races').delete().eq('user_id', userId).eq('race_id', race.id)
      } else {
        await supabase.from('watched_races').insert({ user_id: userId, race_id: race.id })
      }
    },
    [userId, watchedIds],
  )

  return { watchedIds, toggle, reload }
}
