import { NavLink } from 'react-router-dom'
import { useUser } from '../context/UserContext'

const LINKS = [
  { to: '/', label: 'Calendrier', end: true },
  { to: '/classement', label: 'Classement' },
  { to: '/parametres', label: 'Paramètres' },
]

export default function NavBar() {
  const { user } = useUser()

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-pitch)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <span className="text-lg font-extrabold tracking-tight text-white">
          ⚽ Foot<span className="text-emerald-400">Tracker</span>
        </span>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-500 text-white'
                    : 'text-[var(--color-text-dim)] hover:bg-[var(--color-panel-2)] hover:text-white'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {user && (
          <span className="hidden text-sm text-[var(--color-text-dim)] sm:block">{user.pseudo}</span>
        )}
      </div>
    </header>
  )
}
