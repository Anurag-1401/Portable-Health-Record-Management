import { createContext, useCallback, useEffect, useState } from 'react'
import {
  apiClient,
  setToken,
  clearToken,
  setRefreshToken,
  clearRefreshToken,
  setAuthSession,
  getAuthSession,
  clearAuthSession,
} from '../../../lib/apiClient'

// import { getCachedPatientProfile, cachePatientProfile } from '../../../lib/offlineDb'

export const AuthContext = createContext(null)

/**
 * Holds the logged-in user's session (role, id, display name) and exposes
 * login/logout. Deliberately thin — the OTP request/verify flow itself
 * lives in features/auth/api/authApi.js, this context just holds the
 * *result* of that flow so any component can read `useAuth()`.
 *
 * Session shape: { userId, role, healthId?, displayName }
 * `role` must be one of USER_ROLES (src/constants/accessLevels.js) — every
 * RBAC decision in the app (RoleGate, route guards, API access-level
 * requests) reads this field.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

 useEffect(() => {
    async function restoreSession() {
      try {
        const cachedSession = await getAuthSession()

        if (cachedSession) {
          setSession(cachedSession)
        }
      } catch (error) {
        console.error(
          'Failed to restore authentication session:',
          error
        )
      } finally {
        setIsLoading(false)
      }
    }

    restoreSession()
  }, [])

   const login = useCallback(
    async (phoneNumber, otp) => {
      const result = await apiClient.verifyOtp(
        phoneNumber,
        otp
      )

      /*
       * Store access token.
       */
      await setToken(result.token)

      /*
       * Store refresh token.
       */
      if (result.refreshToken) {
        await setRefreshToken(result.refreshToken)
      }

      /*
       * Create frontend session.
       */
      const nextSession = {
        userId: result.userId,
        role: result.role,
        healthId: result.healthId,
        displayName: result.displayName,
      }

      /*
       * Persist session so it survives app restart.
       */
      await setAuthSession(nextSession)

      /*
       * Update React state.
       */
      setSession(nextSession)

      return nextSession
    },
    []
  )

  const logout = useCallback(async () => {
    await clearToken()
    await clearRefreshToken()
    await clearAuthSession()
    setSession(null)
    // window.location.reload()
  }, [])

  return (
    <AuthContext.Provider value={{ session, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
