export function Card({ className = '', children }) {
  return (
    <div className={`rounded-xl border border-neutral-100 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  )
}
