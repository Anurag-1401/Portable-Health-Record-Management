import { useAuth } from '../../hooks/useAuth'

/**
 * Declarative RBAC boundary for UI. This is a UI-layer convenience only —
 * it hides/shows things so the right role sees the right screen, but it is
 * NOT the security boundary. The real enforcement is server-side (access_
 * grants + access_logs, see schema.sql section 2); never trust this
 * component alone to protect sensitive data, since a modified client could
 * skip it entirely. Always assume the API will reject anything the
 * session's access_grants don't actually cover.
 *
 * Usage:
 *   <RoleGate allow={[USER_ROLES.DOCTOR, USER_ROLES.ADMIN]}>
 *     <FullPatientHistory />
 *   </RoleGate>
 */
export function RoleGate({ allow, fallback = null, children }) {
  const { session } = useAuth()
  if (!session || !allow.includes(session.role)) return fallback
  return children
}
