import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

export function GuestRoute({ children }) {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner label="Checking session" />
  }

  if (session) {
    return (
      <Navigate
        to={roleHomePath(session.role)}
        replace
      />
    )
  }

  return children
}

function roleHomePath(role) {
  switch (role) {
    case 'doctor':
      return '/doctor'

    case 'emergency_responder':
      return '/emergency'

    case 'government_verifier':
      return '/government'

    case 'patient':
    default:
      return '/patient'
  }
}