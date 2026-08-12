// Icône utilisée sur les boutons "Marquer vu" (foot/NBA/F1) : cercle vide
// non coché, coche pleine une fois marqué.
export default function CheckIcon({ filled }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none">
      {filled ? (
        <path d="M4 10.5 8 14.5 16 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
      )}
    </svg>
  )
}
