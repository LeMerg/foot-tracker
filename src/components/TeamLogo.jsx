import { useState } from 'react'

const SIZE_CLASSES = {
  '2xs': 'h-3.5 w-3.5 text-[6px]',
  xs: 'h-5 w-5 text-[8px]',
  sm: 'h-6 w-6 text-[9px]',
  md: 'h-8 w-8 text-[10px]',
  lg: 'h-12 w-12 text-xs',
}

function initials(name) {
  if (!name) return '?'
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

// Logo d'équipe avec repli propre : jamais d'icône "image cassée". Si `src`
// est absent, ou si l'image externe ne charge pas (URL morte, CDN en
// panne...), affiche un rond avec les initiales de l'équipe à la place.
export default function TeamLogo({ src, name, size = 'sm', className = '' }) {
  const [failed, setFailed] = useState(false)
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.sm

  if (!src || failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--color-panel-2)] font-bold text-[var(--color-text-dim)] ${sizeClass} ${className}`}
        title={name}
      >
        {initials(name)}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt=""
      title={name}
      onError={() => setFailed(true)}
      className={`shrink-0 object-contain ${sizeClass} ${className}`}
    />
  )
}
