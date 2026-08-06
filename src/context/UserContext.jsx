import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getStoredUser, setStoredUser } from '../lib/identity'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Recharge la ligne `users` depuis Supabase (utile après un changement
  // d'équipe favorite dans les paramètres, pour rester synchro).
  const refreshUser = useCallback(async (id) => {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
    if (!error && data) {
      setUser(data)
      setStoredUser(data)
      return data
    }
    return null
  }, [])

  useEffect(() => {
    const stored = getStoredUser()
    if (stored?.id) {
      refreshUser(stored.id).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [refreshUser])

  // Appelé juste après la création du pseudo dans l'onboarding.
  const login = useCallback((userRow) => {
    setUser(userRow)
    setStoredUser(userRow)
  }, [])

  return (
    <UserContext.Provider value={{ user, loading, login, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser() doit être appelé à l’intérieur de <UserProvider>')
  return ctx
}
