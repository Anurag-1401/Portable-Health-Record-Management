const VARIANTS = {
  primary: 'bg-trust-600 text-white hover:bg-trust-800 focus-visible:ring-trust-400',
  emergency: 'bg-emergency-600 text-white hover:bg-emergency-800 focus-visible:ring-emergency-400',
  secondary: 'bg-white text-trust-600 border border-trust-600 hover:bg-trust-50 focus-visible:ring-trust-400',
  ghost: 'bg-transparent text-neutral-800 hover:bg-neutral-100 focus-visible:ring-neutral-400',
}

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5
        text-sm font-medium transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        disabled:opacity-50 disabled:pointer-events-none
        ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
