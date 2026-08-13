// Must stay in sync with the `access_level` and `user_role` enums in
// schema.sql — these are the string values the API actually sends/expects.

export const USER_ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  EMERGENCY_RESPONDER: 'emergency_responder',
  GOVERNMENT_VERIFIER: 'government_verifier',
  ADMIN: 'admin',
}

export const ACCESS_LEVELS = {
  FULL_HISTORY: 'full_history', // doctor, after OTP consent
  CRITICAL_ONLY: 'critical_only', // emergency responder, no consent needed
  ELIGIBILITY_ONLY: 'eligibility_only', // government scheme verifier
}

// Which role gets which access level by default — used by RoleGate and by
// the API layer to decide what a given session is allowed to request.
export const ROLE_ACCESS_LEVEL = {
  [USER_ROLES.DOCTOR]: ACCESS_LEVELS.FULL_HISTORY,
  [USER_ROLES.EMERGENCY_RESPONDER]: ACCESS_LEVELS.CRITICAL_ONLY,
  [USER_ROLES.GOVERNMENT_VERIFIER]: ACCESS_LEVELS.ELIGIBILITY_ONLY,
}
