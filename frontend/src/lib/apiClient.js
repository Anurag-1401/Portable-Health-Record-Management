import { Preferences } from '@capacitor/preferences'

/**
 * Single fetch wrapper every feature should go through. Centralizing this
 * means the JWT-attachment logic, base URL, and error shape only need to
 * be right in one place.
 *
 * Token storage uses @capacitor/preferences instead of localStorage —
 * Preferences works identically on native (backed by UserDefaults/
 * SharedPreferences) and web (falls back to localStorage under the hood),
 * so this is the one storage API in the app that's already platform-safe
 * without an explicit isNativePlatform() branch.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

async function getToken() {
  const { value } = await Preferences.get({ key: 'auth_token' })
  return value
}

export async function setToken(token) {
  await Preferences.set({ key: 'auth_token', value: token })
}

export async function clearToken() {
  await Preferences.remove({ key: 'auth_token' })
}


export async function setRefreshToken(token) {
  await Preferences.set({
    key: 'refresh_token',
    value: token,
  })
}

export async function getRefreshToken() {
  const { value } = await Preferences.get({
    key: 'refresh_token',
  })

  return value
}

export async function clearRefreshToken() {
  await Preferences.remove({
    key: 'refresh_token',
  })
}

export async function setAuthSession(session) {
  await Preferences.set({
    key: 'auth_session',
    value: JSON.stringify(session),
  })
}

export async function getAuthSession() {
  const { value } = await Preferences.get({
    key: 'auth_session',
  })

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export async function clearAuthSession() {
  await Preferences.remove({
    key: 'auth_session',
  })
}

function isAuthEndpoint(path) {
  return (
    path === '/auth/otp/request' ||
    path === '/auth/otp/verify' ||
    path === '/auth/register' ||
    path === '/auth/register/verify' ||
    path === '/auth/refresh'
  )
}

async function request(
  path,
  {
    method = 'GET',
    body,
    headers = {},
  } = {},
  isRetry = false
) {
  const token = await getToken()

  const res = await fetch(`${BASE_URL}${path}`, {
    method,

    headers: {
      'Content-Type': 'application/json',

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      ...headers,
    },

    body: body
      ? JSON.stringify(body)
      : undefined,
  })

  /*
   * Access token expired.
   *
   * Try refreshing it once and retrying the
   * original request.
   */
  if (
    (res.status === 401 || res.status === 403) &&
    !isRetry &&
     !isAuthEndpoint(path)
  ) {
    try {
      await refreshAccessToken()

      /*
       * Retry the original request using the
       * newly generated access token.
       */
      return request(
        path,
        {
          method,
          body,
          headers,
        },
        true
      )
    } catch (refreshError) {
      /*
       * Refresh token is also invalid/expired.
       * User must login again.
       */


      await clearToken()
      await clearRefreshToken()
      await clearAuthSession()

       const error = new Error(
        'Your session has expired. Please login again.'
      )

      error.status = 401
      error.code = 'SESSION_EXPIRED'

      throw error
    }
  }

  if (!res.ok) {
    const errorBody =
      await res.json().catch(() => ({}))
      
     const message =
      errorBody.message ??
      errorBody.error ??
      errorBody.detail ??
      `Request failed: ${res.status}`

    const error = new Error(message)

    error.status = res.status
    error.body = errorBody

    throw error
  }

  if (res.status === 204) {
    return null
  }

  return res.json()
}

export const apiClient = {
  request,

  // Auth
  register: (
      phoneNumber,
      displayName,
      role,
      doctorDetails = null
    ) =>
      request('/auth/register', {
        method: 'POST',
        body: {
          phoneNumber,
          displayName,
          role,
        
          ...(role === 'doctor'
            ? {
                licenseNumber: doctorDetails?.licenseNumber,
                specialization: doctorDetails?.specialization,
                hospitalId: doctorDetails?.hospitalId || null,
              }
            : {}),
        },
  }),

verifyRegistration: (phoneNumber, otp) =>
  request('/auth/register/verify', {
    method: 'POST',
    body: {
      phoneNumber,
      otp,
    },
  }),
  requestOtp: (phoneNumber) => request('/auth/otp/request', { method: 'POST', body: { phoneNumber } }),
  verifyOtp: (phoneNumber, otp) =>
    request('/auth/otp/verify', { method: 'POST', body: { phoneNumber, otp } }),

  // Records (see FHIR resource endpoints — wire these up in Request Set B item 7)
   // Patient

   getMyProfile: () =>
  request('/patients/me'),

updateMyProfile: (data) =>
  request('/patients/me', {
    method: 'PUT',
    body: data,
  }),

  getPatientProfile: () =>
    request(`/patients/me`),
  
  getMyRecords: () =>
  request('/records/me'),

  getRecentActivity: () =>
  request('/audit/me'),

  getPatientRecords: (patientId) =>
    request(
      `/records?patientId=${encodeURIComponent(patientId)}`
    ),

    getDoctorPatient: (patientId) =>
  request(`/patients/${patientId}`),

getDoctorPatientRecords: (patientId) =>
  request(`/patients/${patientId}/records`),

    searchPatient: (healthId) =>
  request(
    `/patients/search?healthId=${encodeURIComponent(
      healthId
    )}`
  ),
  
  getCriticalInfo: (healthId) =>
    request(`/emergency/critical-info/${encodeURIComponent(healthId)}`),
  
  // Consent
  requestConsent: (patientId, purpose) =>
  request('/consent/request', {
    method: 'POST',
    body: {
      patientId,
      purpose,
    },
  }),

  getPendingConsentRequests: () =>
  request('/consent/pending'),

  getConsentStatus: (patientId) =>
  request(`/consent/status/${patientId}`),

  approveConsent: (consentId) =>
  request(`/consent/${consentId}/approve`, {
    method: 'POST',
  }),

denyConsent: (consentId) =>
  request(`/consent/${consentId}/deny`, {
    method: 'POST',
  }),

  // Sync — called by src/lib/syncQueue.js, not directly by feature code
  syncRecordWrite: (queueEntry) => request('/sync/record', { method: 'POST', body: queueEntry }),

  getMyProfile: () =>
  request('/profile/me', {
    method: 'GET',
  }),

updateMyProfile: (data) =>
  request('/profile/me', {
    method: 'PATCH',
    body: data,
  }),
}

async function refreshAccessToken() {
  const refreshToken = await getRefreshToken()

  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refreshToken,
    }),
  })

   if (!res.ok) {
    const errorBody =
      await res.json().catch(() => ({}))

    const message =
      errorBody.message ??
      errorBody.error ??
      errorBody.detail ??
      `Refresh failed: ${res.status}`

    const error = new Error(message)

    error.status = res.status
    error.body = errorBody

    throw error
  }

  const data = await res.json()

  await setToken(data.token)

  if (data.refreshToken) {
    await setRefreshToken(data.refreshToken)
  }

  return data.token
}