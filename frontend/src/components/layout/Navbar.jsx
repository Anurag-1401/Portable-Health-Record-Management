import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import { Badge } from '../ui/Badge'
import { ProfileModal } from '../profile/ProfileModal'
import { useNavigate } from 'react-router-dom'

export function Navbar() {

  const { session, logout } = useAuth()
  const isOnline = useNetworkStatus()
  const navigate = useNavigate()

  const [showProfile, setShowProfile] = useState(false)

  const [profile, setProfile] = useState(null)

  function handleLogout() {

    logout()

    navigate('/login', {
      replace: true,
    })
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3">

        {/* Brand */}
        <div className="flex items-center gap-2">

          <span className="text-lg font-semibold text-trust-800">
            HealthID
          </span>

          <Badge
            tone={isOnline ? 'trust' : 'warning'}
          >
            {isOnline
              ? 'Online'
              : 'Offline — will sync'}
          </Badge>

        </div>


        {/* User */}
        {session && (
          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-700 transition hover:bg-neutral-50"
            >

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-trust-100 text-sm font-semibold text-trust-700">
                {(session.displayName?.[0] ||
                  session.role?.[0] ||
                  'U'
                ).toUpperCase()}
              </div>

              <span className="font-medium">
                {session.displayName ??
                  session.role}
              </span>

              <span className="text-neutral-400">
                ▼
              </span>

            </button>


            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50"
            >
              Log out
            </button>

          </div>
        )}

      </header>


      {/* Profile modal */}
      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        onProfileUpdated={(updatedProfile) => {
          setProfile(updatedProfile)
        }}
      />

    </>
  )
}