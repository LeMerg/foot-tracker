import { NavLink } from 'react-router-dom'
import { useUser } from '../context/UserContext'

// Nav mobile en bas d'écran (sm:hidden) — sur desktop, NavBar suffit.
// Pas d'onglet Paramètres séparé : accessible depuis la page profil
// ("⚙️ Modifier mon profil"), même logique que l'avatar du nav desktop.
export default function BottomNav() {
  const { user } = useUser()
  if (!user) return null

  const links = [
    { to: '/', label: 'Calendrier', icon: '📅', end: true },
    { to: '/classement', label: 'Classement', icon: '🏆', end: false },
    { to: `/user/${encodeURIComponent(user.pseudo)}`, label: 'Profil', icon: '👤', end: false },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-border)] bg-[var(--color-pitch)]/95 backdrop-blur-md sm:hidden">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-emerald-400' : 'text-[var(--color-text-dim)]'
            }`
          }
        >
          <span className="text-lg leading-none">{link.icon}</span>
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
