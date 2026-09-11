import { Preferences } from '@capacitor/preferences'

/**
 * Central API client
 *
 * Responsibilities:
 * - JWT access-token handling
 * - Refresh-token handling
 * - Auth session storage
 * - API requests
 * - Patient APIs
 * - Doctor APIs
 * - Medical record CRUD
 * - Consent APIs
 * - QR APIs
 * - Emergency APIs
 * - Audit APIs
 * - Sync APIs
 */

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:8000/api'

/* ============================================================
   TOKEN / SESSION STORAGE
   ============================================================ */

async function getToken() {
  const { value } = await Preferences.get({
    key: 'auth_token',
  })

  return value
}

export async function setToken(token) {
  await Preferences.set({
    key: 'auth_token',
    value: token,
  })
}

export async function clearToken() {
  await Preferences.remove({
    key: 'auth_token',
  })
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

/* ============================================================
   AUTH HELPERS
   ============================================================ */

function isAuthEndpoint(path) {
  return (
    path === '/auth/otp/request' ||
    path === '/auth/otp/verify' ||
    path === '/auth/register' ||
    path === '/auth/register/verify' ||
    path === '/auth/refresh'
  )
}

/* ============================================================
   CORE REQUEST
   ============================================================ */

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

  // Detect file/multipart requests
  const isFormData =
    typeof FormData !== 'undefined' &&
    body instanceof FormData

  const res = await fetch(`${BASE_URL}${path}`, {
    method,

    headers: {
      // IMPORTANT:
      // Do NOT manually set Content-Type for FormData.
      // Browser automatically adds:
      // multipart/form-data; boundary=...
      ...(isFormData
        ? {}
        : {
            'Content-Type': 'application/json',
          }),

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      ...headers,
    },

    body:
      body !== undefined && body !== null
        ? isFormData
          ? body
          : JSON.stringify(body)
        : undefined,
  })

  /* ----------------------------------------------------------
     ACCESS TOKEN EXPIRED
     ---------------------------------------------------------- */

  if (
    (res.status === 401 || res.status === 403) &&
    !isRetry &&
    !isAuthEndpoint(path)
  ) {
    try {
      await refreshAccessToken()

      return request(
        path,
        {
          method,
          body,
          headers,
        },
        true
      )
    } catch {
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

  /* ----------------------------------------------------------
     API ERROR
     ---------------------------------------------------------- */

  if (!res.ok) {
    const responseText = await res.text()

    let errorBody = {}

    if (responseText) {
      try {
        errorBody = JSON.parse(responseText)
      } catch {
        errorBody = {
          message: responseText,
        }
      }
    }

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

  /* ----------------------------------------------------------
     EMPTY / JSON / TEXT RESPONSE
     ---------------------------------------------------------- */

  const responseText = await res.text()

  if (!responseText) {
    return null
  }

  try {
    return JSON.parse(responseText)
  } catch {
    return responseText
  }
}

/* ============================================================
   AUTH
   ============================================================ */

const authApi = {
  requestOtp: (phoneNumber) =>
    request('/auth/otp/request', {
      method: 'POST',
      body: {
        phoneNumber,
      },
    }),

  verifyOtp: (phoneNumber, otp) =>
    request('/auth/otp/verify', {
      method: 'POST',
      body: {
        phoneNumber,
        otp,
      },
    }),

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
              licenseNumber:
                doctorDetails?.licenseNumber,

              specialization:
                doctorDetails?.specialization,

              hospitalId:
                doctorDetails?.hospitalId ?? null,
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
}

/* ============================================================
   PATIENT
   ============================================================ */

const patientApi = {
  getMyProfile: () =>
    request('/profile/me', {
      method: 'GET',
    }),

  updateMyProfile: (data) =>
    request('/profile/me', {
      method: 'PATCH',
      body: data,
    }),

  getPatientProfile: () =>
    request('/patients/me'),

  searchPatient: (healthId) =>
    request(
      `/patients/search?healthId=${encodeURIComponent(
        healthId
      )}`
    ),

  getDoctorPatient: (patientId) =>
    request(`/patients/${patientId}`),
}

/* ============================================================
   DOCTOR
   ============================================================ */

const doctorApi = {
  getAvailableDoctors: () =>
    request('/doctors/available'),

  getCurrentDoctor: () =>
    request('/doctors/me'),

  getDoctorActivity: () =>
    request('/audit/doctor/me'),

  getDoctorPendingConsentRequests: () =>
    request('/consent/doctor/pending'),

  getDoctorApprovedPatients: () =>
    request('/consent/doctor/approved-patients'),

  getDoctorPatientRecords: (patientId) =>
  request(
    `/records?patientId=${encodeURIComponent(patientId)}`
  ),
}

/* ============================================================
   MEDICAL RECORDS
   ============================================================ */

/*
 * Patient's own complete record history.
 *
 * GET /api/records/me
 */
const recordApi = {
  getMyRecords: () =>
    request('/records/me'),

  /*
   * Get records belonging to a specific patient.
   *
   * patientId can be:
   * - Patient UUID
   * - User UUID
   * - Health ID
   */
  getPatientRecords: (patientId) =>
    request(
      `/records?patientId=${encodeURIComponent(
        patientId
      )}`
    ),

  /*
   * Alias used by older frontend code.
   */
  getRecordsByPatient: (patientId) =>
    request(
      `/records?patientId=${encodeURIComponent(
        patientId
      )}`
    ),

  /*
   * CREATE
   *
   * POST /api/records
   */
  createRecord: ({
    patientId = null,
    healthId = null,
    fhirResourceType,
    resourceData,
    expectedVersion = null,
  }) =>
    request('/records', {
      method: 'POST',
      body: {
        patientId,
        healthId,
        fhirResourceType,
        resourceData,
        expectedVersion,
      },
    }),

  /*
   * UPDATE
   *
   * PUT /api/records/{recordId}
   */
  updateRecord: (
    recordId,
    {
      patientId = null,
      healthId = null,
      fhirResourceType,
      resourceData,
      expectedVersion = null,
    }
  ) =>
    request(`/records/${recordId}`, {
      method: 'PUT',
      body: {
        patientId,
        healthId,
        fhirResourceType,
        resourceData,
        expectedVersion,
      },
    }),

  /*
   * DELETE
   *
   * Backend performs a hash-chain tombstone.
   */
  deleteRecord: (recordId) =>
    request(`/records/${recordId}`, {
      method: 'DELETE',
    }),

  /*
   * Verify patient's complete hash chain.
   */
  verifyHashChain: (patientId) =>
    request(
      `/records/patient/${encodeURIComponent(
        patientId
      )}/hash-chain/verify`
    ),
}


/* ============================================================
   DOCUMENTS / MEDICAL RECORD ATTACHMENTS
   ============================================================ */

const documentApi = {
  /*
   * Upload a file to a medical record.
   *
   * POST /api/documents/upload
   *
   * multipart/form-data:
   * - file
   * - recordId
   */
  uploadDocument: (recordId, file) => {
    const formData = new FormData()

    formData.append('file', file)
    formData.append('recordId', recordId)

    return request('/documents/upload', {
      method: 'POST',
      body: formData,
    })
  },

  /*
   * Get all attachments belonging to a record.
   *
   * GET /api/documents/record/{recordId}
   */
  getRecordDocuments: (recordId) =>
    request(`/documents/record/${recordId}`),

  /*
   * Download an attachment.
   */
  downloadDocument: async (documentId) => {
    const token = await getAccessToken()

    const response = await fetch(
      `${BASE_URL}/documents/${documentId}/download`,
      {
        method: 'GET',
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      }
    )

    if (!response.ok) {
      throw new Error(
        `Failed to download document: ${response.status}`
      )
    }

    return response.blob()
  },

  /*
   * Delete an attachment.
   *
   * DELETE /api/documents/{documentId}
   */
  deleteDocument: (documentId) =>
    request(`/documents/${documentId}`, {
      method: 'DELETE',
    }),
}

/* ============================================================
   CONSENT
   ============================================================ */

const consentApi = {
  /*
   * Doctor requests access to patient records.
   */
  requestConsent: (patientId, purpose) =>
    request('/consent/request', {
      method: 'POST',
      body: {
        patientId,
        purpose,
      },
    }),

  /*
   * Patient requests/gives access to a doctor.
   */
  requestConsentByPatient: (
    doctorId,
    purpose
  ) =>
    request('/consent/patient/request', {
      method: 'POST',
      body: {
        doctorId,
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
}

/* ============================================================
   QR
   ============================================================ */

const qrApi = {
  /*
   * Legacy QR validation.
   */
  validateQr: (healthId, payloadHash) =>
    request('/qr/validate', {
      method: 'POST',
      body: {
        healthId,
        payloadHash,
      },
    }),

  /*
   * Universal QR resolution.
   */
  resolveUniversalQr: (type, token) =>
    request(
      `/qr/public/${type}/${encodeURIComponent(
        token
      )}`
    ),

  /*
   * Patient QR.
   */
  generatePatientQr: () =>
    request('/qr/patient/generate', {
      method: 'POST',
    }),

  revokePatientQr: () =>
    request('/qr/patient/revoke', {
      method: 'POST',
    }),

  /*
   * Doctor QR.
   */
  generateDoctorQr: () =>
    request('/qr/doctor/generate', {
      method: 'POST',
    }),

  revokeDoctorQr: () =>
    request('/qr/doctor/revoke', {
      method: 'POST',
    }),

  /*
   * Legacy doctor QR.
   */
  validateDoctorQR: (doctorId) =>
    request('/qr/doctor/validate', {
      method: 'POST',
      body: {
        doctorId,
      },
    }),
}

/* ============================================================
   HOSPITALS
   ============================================================ */

const hospitalApi = {
  getHospitalsByPincode: (pincode) =>
    request(
      `/hospitals/search?pincode=${encodeURIComponent(
        pincode
      )}`
    ),
}

/* ============================================================
   EMERGENCY
   ============================================================ */

const emergencyApi = {
  getCriticalInfo: (healthId) =>
    request(
      `/emergency/critical-info/${encodeURIComponent(
        healthId
      )}`
    ),
}

/* ============================================================
   AUDIT / ACTIVITY
   ============================================================ */

const auditApi = {
  getRecentActivity: () =>
    request('/audit/me'),
}

/* ============================================================
   OFFLINE SYNC
   ============================================================ */

const syncApi = {
  syncRecordWrite: (queueEntry) =>
    request('/sync/record', {
      method: 'POST',
      body: queueEntry,
    }),
}

/* ============================================================
   PUBLIC API CLIENT
   ============================================================ */

export const apiClient = {
  request,

  // Auth
  ...authApi,

  // Patient
  ...patientApi,

  // Doctor
  ...doctorApi,

  // Medical Records
  ...recordApi,

  ...documentApi,

  // Consent
  ...consentApi,

  // QR
  ...qrApi,

  // Hospitals
  ...hospitalApi,

  // Emergency
  ...emergencyApi,

  // Audit
  ...auditApi,

  // Sync
  ...syncApi,
}

/* ============================================================
   REFRESH ACCESS TOKEN
   ============================================================ */

async function refreshAccessToken() {
  const refreshToken = await getRefreshToken()

  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const res = await fetch(
    `${BASE_URL}/auth/refresh`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        refreshToken,
      }),
    }
  )

  if (!res.ok) {
    const responseText = await res.text()

    let errorBody = {}

    if (responseText) {
      try {
        errorBody = JSON.parse(responseText)
      } catch {
        errorBody = {
          message: responseText,
        }
      }
    }

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