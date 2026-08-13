import { useAuth } from '../../hooks/useAuth'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import { Badge } from '../ui/Badge'
import { useNavigate } from 'react-router-dom'

export function Navbar() {
  const { session, logout } = useAuth()
  const isOnline = useNetworkStatus()
  const navigate = useNavigate()

  return (
    <header className="flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-trust-800">HealthID</span>
        <Badge tone={isOnline ? 'trust' : 'warning'}>{isOnline ? 'Online' : 'Offline — will sync'}</Badge>
      </div>
      {session && (
        <div className="flex items-center gap-3 text-sm text-neutral-600">
          <span>{session.displayName ?? session.role}</span>
          <button onClick={()=> {logout();
            navigate('/login',{replace:true})
          }} className="text-trust-600 hover:underline">
            Log out
          </button>
        </div>
      )}
    </header>
  )
}
