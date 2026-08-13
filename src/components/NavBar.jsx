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
    <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-pitch)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <span className="text-lg font-extrabold tracking-tight text-white">
          🏆 Fan<span className="text-emerald-400">Log</span>
        </span>

        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                    : 'text-[var(--color-text-dim)] hover:bg-[var(--color-panel-2)] hover:text-white'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {user && (
          <NavLink
            to={`/user/${encodeURIComponent(user.pseudo)}`}
            className="hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm text-[var(--color-text-dim)] transition-colors hover:bg-[var(--color-panel-2)] hover:text-white sm:flex"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
              {user.pseudo.slice(0, 1).toUpperCase()}
            </span>
            {user.pseudo}
          </NavLink>
        )}
      </div>
    </header>
  )
}
