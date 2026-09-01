import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AppShell } from '../../../components/layout/AppShell'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'

import { apiClient } from '../../../lib/apiClient'

const SEARCH_STORAGE_KEY = 'doctor_patient_search'

export default function DoctorPatientSearch() {
  const navigate = useNavigate()

  const [healthId, setHealthId] = useState('')
  const [patient, setPatient] = useState(null)

  /*
   * IMPORTANT:
   * consent is always loaded from the backend.
   * Do NOT store consent status in sessionStorage.
   */
  const [consent, setConsent] = useState(null)
  const [isLoadingConsent, setIsLoadingConsent] = useState(false)

  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  /*
   * ---------------------------------------------------------
   * Load latest consent status from backend
   * ---------------------------------------------------------
   */
  const loadConsentStatus = useCallback(async (patientId) => {
    if (!patientId) {
      setConsent(null)
      return
    }

    try {
      setIsLoadingConsent(true)

      const data =
        await apiClient.getConsentStatus(patientId)

      /*
       * Backend returns ConsentResponse directly.
       */
      setConsent(data ?? null)

      /*
       * Convert backend status to UI status.
       */
      const backendStatus =
        data?.status?.toUpperCase()

      if (backendStatus === 'APPROVED') {
        setStatus('approved')
      } else if (backendStatus === 'PENDING') {
        setStatus('pending')
      } else if (backendStatus === 'DENIED') {
        setStatus('denied')
      } else if (backendStatus === 'EXPIRED') {
        setStatus('expired')
      } else {
        setStatus('found')
      }

    } catch (err) {
      /*
       * 404 means there is no consent request yet.
       * That is NOT an error for the search page.
       */
      if (
        err?.status === 404 ||
        err?.response?.status === 404 ||
        err?.message?.toLowerCase()?.includes('no consent')
      ) {
        setConsent(null)
        setStatus('found')
      } else {
        console.error(
          'Failed to load consent status:',
          err
        )

        /*
         * Do not block patient identification if
         * consent status could not be loaded.
         */
        setConsent(null)
      }
    } finally {
      setIsLoadingConsent(false)
    }
  }, [])

  /*
   * ---------------------------------------------------------
   * Restore searched patient
   * ---------------------------------------------------------
   */
  useEffect(() => {
    try {
      const stored =
        sessionStorage.getItem(
          SEARCH_STORAGE_KEY
        )

      if (!stored) return

      const saved = JSON.parse(stored)

      if (saved.healthId) {
        setHealthId(saved.healthId)
      }

      if (saved.patient) {
        setPatient(saved.patient)

        /*
         * IMPORTANT:
         * Do NOT restore consent/status from storage.
         *
         * Instead fetch the current status from DB.
         */
        const patientId =
          saved.patient.patientId ??
          saved.patient.id

        if (patientId) {
          loadConsentStatus(patientId)
        } else {
          setStatus('found')
        }
      }
    } catch (err) {
      console.error(
        'Failed to restore patient search:',
        err
      )

      sessionStorage.removeItem(
        SEARCH_STORAGE_KEY
      )
    }
  }, [loadConsentStatus])

  /*
   * ---------------------------------------------------------
   * Persist searched patient
   *
   * Only patient/search information is stored.
   * Consent status is NEVER stored.
   * ---------------------------------------------------------
   */
  useEffect(() => {
    if (!patient) return

    sessionStorage.setItem(
      SEARCH_STORAGE_KEY,
      JSON.stringify({
        healthId,
        patient,
      })
    )
  }, [healthId, patient])

  /*
   * ---------------------------------------------------------
   * Search patient
   * ---------------------------------------------------------
   */
  async function handleSearch(event) {
    event.preventDefault()

    const value = healthId.trim()

    if (!value) {
      setError('Please enter a Health ID.')
      setPatient(null)
      setConsent(null)
      setStatus('idle')
      return
    }

    setStatus('searching')
    setError(null)
    setConsent(null)

    try {
      const result =
        await apiClient.searchPatient(value)

      const foundPatient =
        result?.patient ??
        result

      if (!foundPatient) {
        throw new Error(
          'Patient not found.'
        )
      }

      const patientId =
        foundPatient.patientId ??
        foundPatient.id

      if (!patientId) {
        throw new Error(
          'Patient response does not contain a patient ID.'
        )
      }

      setPatient(foundPatient)
      setError(null)

      /*
       * Immediately fetch latest consent from DB.
       */
      await loadConsentStatus(patientId)

      /*
       * Persist only patient/search data.
       */
      sessionStorage.setItem(
        SEARCH_STORAGE_KEY,
        JSON.stringify({
          healthId: value,
          patient: foundPatient,
        })
      )

    } catch (err) {
      console.error(
        'Patient search failed:',
        err
      )

      setPatient(null)
      setConsent(null)

      setError(
        err?.message ??
          'Unable to search for the patient.'
      )

      setStatus('error')
    }
  }

  /*
   * ---------------------------------------------------------
   * Request access
   * ---------------------------------------------------------
   */
  async function handleRequestAccess() {
    const patientId =
      patient?.patientId ??
      patient?.id

    if (!patientId) {
      setError(
        'No valid patient selected.'
      )
      return
    }

    setStatus('requesting')
    setError(null)

    try {
      await apiClient.requestConsent(
        patientId,
        'Clinical consultation'
      )

      /*
       * IMPORTANT:
       * Fetch the actual consent object from backend
       * instead of manually assuming the status.
       */
      await loadConsentStatus(patientId)

    } catch (err) {
      console.error(
        'Failed to request patient consent:',
        err
      )

      setError(
        err?.message ??
          'Unable to send the consent request.'
      )

      setStatus('error')
    }
  }

  /*
   * ---------------------------------------------------------
   * Clear patient
   * ---------------------------------------------------------
   */
  function handleClear() {
    sessionStorage.removeItem(
      SEARCH_STORAGE_KEY
    )

    setHealthId('')
    setPatient(null)
    setConsent(null)
    setError(null)
    setStatus('idle')
  }

  /*
   * ---------------------------------------------------------
   * Automatically refresh consent status
   *
   * This handles:
   *
   * Doctor browser
   *       ↓
   * Request PENDING
   *
   * Patient browser
   *       ↓
   * Approve
   *
   * Doctor browser
   *       ↓
   * APPROVED
   * ---------------------------------------------------------
   */
  useEffect(() => {
    if (!patient) return

    const patientId =
      patient.patientId ??
      patient.id

    if (!patientId) return

    const refreshConsent = async () => {
      await loadConsentStatus(patientId)
    }

    const interval = setInterval(
      refreshConsent,
      30000
    )

    return () => {
      clearInterval(interval)
    }
  }, [patient, loadConsentStatus])

  /*
   * ---------------------------------------------------------
   * Derived consent states
   * ---------------------------------------------------------
   */
  const consentStatus =
    consent?.status?.toUpperCase() ?? null

  const isApproved =
    consentStatus === 'APPROVED'

  const isPending =
    consentStatus === 'PENDING'

  const isDenied =
    consentStatus === 'DENIED'

  const isExpired =
    consentStatus === 'EXPIRED'

  const patientId =
    patient?.patientId ??
    patient?.id

  return (
    <AppShell>
      <div className="flex flex-col gap-6">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div>
          <div className="flex items-center gap-3">

            <Button
              type="button"
              onClick={() =>
                navigate('/doctor/dashboard')
              }
            >
              Back
            </Button>

            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">
                Search Patient
              </h1>

              <p className="mt-1 text-sm text-neutral-500">
                Find a patient using their Health ID
                when QR scanning is unavailable.
              </p>
            </div>

          </div>
        </div>

        {/* =====================================================
            SEARCH
        ===================================================== */}

        <Card>
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-4"
          >

            <div>
              <label
                htmlFor="healthId"
                className="text-sm font-medium text-neutral-800"
              >
                Patient Health ID
              </label>

              <p className="mt-1 text-xs text-neutral-500">
                Enter the Health ID provided by the
                patient.
              </p>
            </div>

            <input
              id="healthId"
              type="text"
              value={healthId}
              onChange={(event) =>
                setHealthId(
                  event.target.value
                )
              }
              placeholder="e.g. PHR-IN-123456"
              autoComplete="off"
              className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm font-mono text-neutral-900 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
            />

            {error && (
              <div className="rounded-lg border border-emergency-200 bg-emergency-50 p-3">
                <p className="text-sm text-emergency-600">
                  {error}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">

              <Button
                type="submit"
                disabled={
                  status === 'searching' ||
                  status === 'requesting'
                }
              >
                {status === 'searching'
                  ? 'Searching...'
                  : 'Search Patient'}
              </Button>

              {patient && (
                <Button
                  type="button"
                  onClick={handleClear}
                >
                  Clear Patient
                </Button>
              )}

              <Button
                type="button"
                onClick={() =>
                  navigate('/doctor/scan')
                }
              >
                Scan QR Instead
              </Button>

            </div>

          </form>
        </Card>

        {/* =====================================================
            PATIENT RESULT
        ===================================================== */}

        {patient && (
          <Card>

            <div className="flex flex-col gap-5">

              {/* Patient heading */}

              <div className="flex items-start justify-between gap-4">

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Patient Found
                  </p>

                  <h2 className="mt-1 text-xl font-semibold text-neutral-900">
                    {patient.displayName ??
                      patient.name ??
                      'Patient'}
                  </h2>
                </div>

                {/* Backend consent status */}

                {isLoadingConsent ? (

                  <Badge tone="neutral">
                    Checking Access...
                  </Badge>

                ) : isApproved ? (

                  <Badge tone="trust">
                    Consent Approved
                  </Badge>

                ) : isPending ? (

                  <Badge tone="trust">
                    Consent Pending
                  </Badge>

                ) : isDenied ? (

                  <Badge tone="critical">
                    Consent Denied
                  </Badge>

                ) : isExpired ? (

                  <Badge tone="critical">
                    Consent Expired
                  </Badge>

                ) : (

                  <Badge tone="neutral">
                    Consent Required
                  </Badge>

                )}

              </div>

              {/* =================================================
                  PATIENT INFORMATION
              ================================================= */}

              <div className="grid gap-3 sm:grid-cols-2">

                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">

                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Health ID
                  </p>

                  <p className="mt-1 font-mono text-sm font-medium text-neutral-900">
                    {patient.healthId ??
                      healthId}
                  </p>

                </div>

                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">

                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Patient ID
                  </p>

                  <p className="mt-1 break-all font-mono text-sm font-medium text-neutral-900">
                    {patientId ??
                      'Unavailable'}
                  </p>

                </div>

              </div>

              {/* =================================================
                  CHECKING
              ================================================= */}

              {isLoadingConsent && (
                <div className="rounded-lg border border-neutral-200 p-4">

                  <p className="text-sm font-medium text-neutral-800">
                    Checking patient access...
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    Checking the current consent status
                    from the server.
                  </p>

                </div>
              )}

              {/* =================================================
                  NO CONSENT
              ================================================= */}

              {!isLoadingConsent &&
                !consent &&
                status !== 'requesting' && (
                  <div className="rounded-lg border border-neutral-200 p-4">

                    <div className="flex items-center gap-2">

                      <Badge tone="trust">
                        Consent Required
                      </Badge>

                      <p className="text-sm font-medium text-neutral-800">
                        Medical records are protected
                      </p>

                    </div>

                    <p className="mt-2 text-sm leading-6 text-neutral-500">
                      Finding a patient does not grant
                      access to their medical records.
                      The patient must approve your
                      access request first.
                    </p>

                  </div>
                )}

              {/* =================================================
                  REQUESTING
              ================================================= */}

              {status === 'requesting' && (
                <div className="rounded-lg border border-neutral-200 p-4">

                  <div className="flex items-center gap-2">

                    <Badge tone="trust">
                      Sending
                    </Badge>

                    <p className="text-sm font-medium text-neutral-800">
                      Sending consent request...
                    </p>

                  </div>

                  <p className="mt-2 text-sm text-neutral-500">
                    Please wait while the consent
                    request is created.
                  </p>

                </div>
              )}

              {/* =================================================
                  PENDING
              ================================================= */}

              {isPending && (
                <div className="rounded-lg border border-neutral-200 p-4">

                  <div className="flex items-center gap-2">

                    <Badge tone="trust">
                      Pending
                    </Badge>

                    <p className="text-sm font-medium text-neutral-800">
                      Consent request sent
                    </p>

                  </div>

                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    The patient must approve your
                    request before you can access
                    their medical records.
                  </p>

                  {consent?.requestedAt && (
                    <p className="mt-2 text-xs text-neutral-400">
                      Requested:{' '}
                      {new Date(
                        consent.requestedAt
                      ).toLocaleString()}
                    </p>
                  )}

                </div>
              )}

              {/* =================================================
                  APPROVED
              ================================================= */}

              {isApproved && (
                <div className="rounded-lg border border-neutral-200 p-4">

                  <div className="flex items-center gap-2">

                    <Badge tone="trust">
                      Approved
                    </Badge>

                    <p className="text-sm font-medium text-neutral-800">
                      Patient access approved
                    </p>

                  </div>

                  <p className="mt-2 text-sm text-neutral-500">
                    The patient has approved your request.
                    You can now access the patient's
                    authorized medical records.
                  </p>

                  {consent?.respondedAt && (
                    <p className="mt-2 text-xs text-neutral-400">
                      Approved:{' '}
                      {new Date(
                        consent.respondedAt
                      ).toLocaleString()}
                    </p>
                  )}

                </div>
              )}

              {/* =================================================
                  DENIED
              ================================================= */}

              {isDenied && (
                <div className="rounded-lg border border-emergency-200 bg-emergency-50 p-4">

                  <div className="flex items-center gap-2">

                    <Badge tone="critical">
                      Denied
                    </Badge>

                    <p className="text-sm font-medium text-neutral-800">
                      Patient denied access
                    </p>

                  </div>

                  <p className="mt-2 text-sm text-neutral-600">
                    You cannot access this patient's
                    protected medical records.
                  </p>

                </div>
              )}

              {/* =================================================
                  EXPIRED
              ================================================= */}

              {isExpired && (
                <div className="rounded-lg border border-emergency-200 bg-emergency-50 p-4">

                  <div className="flex items-center gap-2">

                    <Badge tone="critical">
                      Expired
                    </Badge>

                    <p className="text-sm font-medium text-neutral-800">
                      Consent request expired
                    </p>

                  </div>

                  <p className="mt-2 text-sm text-neutral-600">
                    The previous consent request has
                    expired. You may request access again.
                  </p>

                </div>
              )}

              {/* =================================================
                  ACTIONS
              ================================================= */}

              <div className="flex flex-col gap-2 sm:flex-row">

                {/* Request */}

                {!consent &&
                  status !== 'requesting' && (
                    <Button
                      type="button"
                      onClick={
                        handleRequestAccess
                      }
                    >
                      Request Access
                    </Button>
                  )}

                {/* Denied / Expired -> request again */}

                {(isDenied || isExpired) && (
                  <Button
                    type="button"
                    onClick={
                      handleRequestAccess
                    }
                  >
                    Request Access Again
                  </Button>
                )}

                {/* Pending */}

                {isPending && (
                  <Button
                    type="button"
                    disabled
                  >
                    Waiting for Patient Approval
                  </Button>
                )}

                {/* Approved */}

                <Button
                  type="button"
                  disabled={
                    !isApproved ||
                    isLoadingConsent
                  }
                  onClick={() => {

                    if (!isApproved) {
                      return
                    }

                    navigate(
                      `/doctor/patients/${patientId}`
                    )
                  }}
                >
                  {isLoadingConsent
                    ? 'Checking Access...'
                    : isApproved
                      ? 'Open Patient'
                      : 'Open Patient'}
                </Button>

              </div>

            </div>

          </Card>
        )}

        {/* =====================================================
            EMPTY STATE
        ===================================================== */}

        {!patient &&
          status !== 'searching' &&
          status !== 'error' && (

            <Card>

              <div className="py-8 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                  <span className="text-lg">
                    🔎
                  </span>
                </div>

                <h2 className="mt-4 text-sm font-semibold text-neutral-800">
                  Search for a patient
                </h2>

                <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
                  Enter a patient's Health ID above
                  to identify them and request access
                  to their medical records.
                </p>

              </div>

            </Card>
          )}

        {/* =====================================================
            SECURITY
        ===================================================== */}

        <Card>

          <div className="flex gap-3">

            <Badge tone="trust">
              Secure
            </Badge>

            <div>

              <h2 className="text-sm font-semibold text-neutral-800">
                Patient privacy
              </h2>

              <p className="mt-1 text-sm leading-6 text-neutral-500">
                Patient identification and
                medical-record access are separate
                operations. Searching for a Health ID
                does not expose protected medical
                information. Access requires patient
                consent and is recorded in the audit
                trail.
              </p>

            </div>

          </div>

        </Card>

      </div>
    </AppShell>
  )
}