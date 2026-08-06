// Petit wrapper localStorage : garde l'utilisateur courant sur cet appareil
// pour ne pas redemander le pseudo à chaque visite. La vraie source de
// vérité reste la table `users` côté Supabase (voir UserContext).
const STORAGE_KEY = 'foot-tracker:user'

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}
