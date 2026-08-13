import { Navbar } from './Navbar'

export function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  )
}
