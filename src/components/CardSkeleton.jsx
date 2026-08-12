// Bloc de chargement générique (pulse "shimmer", voir src/index.css) —
// utilisé partout où une liste de cartes est en train de charger, pour
// éviter un texte "Chargement…" nu.
export default function CardSkeleton({ count = 3 }) {
  return (
    <div className="mt-6 space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton h-16 rounded-xl border border-[var(--color-border)]" />
      ))}
    </div>
  )
}
