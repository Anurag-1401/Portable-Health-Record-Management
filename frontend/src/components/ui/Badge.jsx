const TONES = {
  neutral: 'bg-neutral-100 text-neutral-800',
  trust: 'bg-trust-50 text-trust-800',
  warning: 'bg-warmth-50 text-warmth-800',
  critical: 'bg-emergency-50 text-emergency-800',
}

export function Badge({ tone = 'neutral', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  )
}
