import { useEffect, useState } from 'react'
import { CHANGELOG_VERSION, CHANGELOG_ITEMS } from '../data/changelog'

const STORAGE_KEY = 'foot-tracker:seen-changelog'

// Modale "Quoi de neuf", affichée une seule fois par version (comparaison
// avec une clé localStorage). Montée dans App.jsx uniquement une fois
// l'utilisateur chargé, donc jamais pendant l'onboarding.
export default function WhatsNewModal() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (seen !== CHANGELOG_VERSION) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, CHANGELOG_VERSION)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white">Quoi de neuf 🎉</h2>
        <ul className="mt-4 space-y-2 text-sm text-[var(--color-text-dim)]">
          {CHANGELOG_ITEMS.map((item, i) => {
            const text = typeof item === 'string' ? item : item.text
            const href = typeof item === 'string' ? null : item.href
            return (
              <li key={i} className="flex gap-2">
                <span className="shrink-0">•</span>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 underline hover:text-emerald-300"
                  >
                    {text}
                  </a>
                ) : (
                  <span>{text}</span>
                )}
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          onClick={dismiss}
          className="mt-6 w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-white transition hover:bg-emerald-400"
        >
          Compris !
        </button>
      </div>
    </div>
  )
}
