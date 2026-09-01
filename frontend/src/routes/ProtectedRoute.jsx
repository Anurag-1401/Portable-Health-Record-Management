import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

export function ProtectedRoute({ allow, children }) {
  const { session, isLoading } = useAuth()

  if (isLoading) return <LoadingSpinner label="Checking session" />
  if (!session) return <Navigate to="/login" replace />
  if (allow && !allow.includes(session.role)) return <Navigate to="/login" replace />

  return children
}
 