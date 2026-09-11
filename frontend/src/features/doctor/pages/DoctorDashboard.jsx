import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DoctorQRDisplay } from '../../../components/qr/DoctorQRDisplay'

import { AppShell } from '../../../components/layout/AppShell'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'

import { useAuth } from '../../../hooks/useAuth'
import { apiClient } from '../../../lib/apiClient'
import { STORES, openDb } from '../../../lib/offlineDb'

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const { session } = useAuth()

  const [pendingRequests, setPendingRequests] = useState([])
  const [activity, setActivity] = useState([])
  const [approvedPatients, setApprovedPatients] = useState([])
  const [doctor, setDoctor] = useState(null)
  const [showDoctorQR, setShowDoctorQR] = useState(false)
  const [syncStats, setSyncStats] = useState({
    localOnly: 0,
    synced: 0,
    conflict: 0,
    total: 0,
  })

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  const [isLoading, setIsLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [error, setError] = useState(null)

  /* -------------------------------- */
  /* Network status */
  /* -------------------------------- */

  useEffect(() => {
  const loadDoctor = async () => {
    try {
      const data = await apiClient.getCurrentDoctor()
      setDoctor(data)
    } catch (error) {
      console.error('Failed to load doctor profile:', error)
    }
  }

  loadDoctor()
}, [])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  /* -------------------------------- */
  /* Load sync queue */
  /* -------------------------------- */

  const loadSyncStats = useCallback(async () => {
    try {
      const db = await openDb()

      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        db.close()
        return
      }

      const tx = db.transaction(STORES.syncQueue, 'readonly')
      const store = tx.objectStore(STORES.syncQueue)

      const request = store.getAll()

      request.onsuccess = () => {
        const entries = request.result ?? []

        const localOnly = entries.filter(
          (entry) => entry.status === 'local_only'
        ).length

        const synced = entries.filter(
          (entry) => entry.status === 'synced'
        ).length

        const conflict = entries.filter(
          (entry) => entry.status === 'conflict'
        ).length

        setSyncStats({
          localOnly,
          synced,
          conflict,
          total: entries.length,
        })

        db.close()
      }

      request.onerror = () => {
        db.close()
      }
    } catch (err) {
      console.error('Failed to load sync queue:', err)
    }
  }, [])

  /* -------------------------------- */
  /* Load dashboard data */
  /* -------------------------------- */

  const loadDashboard = useCallback(async () => {
    if (!session?.userId) return

    try {
      setIsLoading(true)
      setError(null)

      const [consentsResult, approvedPatientsResult, activityResult] =
        await Promise.allSettled([
          apiClient.getDoctorPendingConsentRequests(),
          apiClient.getDoctorApprovedPatients(),
          apiClient.getDoctorActivity(),
        ])

      /* ------------------------------ */
      /* Pending consent requests */
      /* ------------------------------ */

      if (consentsResult.status === 'fulfilled') {
        const data = consentsResult.value

        setPendingRequests(
          Array.isArray(data)
            ? data
            : data?.requests ??
                data?.consents ??
                []
        )
      } else {
        console.error(
          'Failed to load pending consent requests:',
          consentsResult.reason
        )
      }

      if (approvedPatientsResult.status === 'fulfilled') {
  const data = approvedPatientsResult.value

  console.log(
    'APPROVED PATIENTS:',
    data
  )

  setApprovedPatients(
    Array.isArray(data)
      ? data
      : data?.patients ??
          data?.consents ??
          []
  )
} else {
  console.error(
    'Failed to load approved patients:',
    approvedPatientsResult.reason
  )
}

      /* ------------------------------ */
      /* Recent activity */
      /* ------------------------------ */

      if (activityResult.status === 'fulfilled') {
        const data = activityResult.value

        setActivity(
          Array.isArray(data)
            ? data
            : data?.activities ??
                data?.content ??
                []
        )
      } else {
        console.error(
          'Failed to load recent activity:',
          activityResult.reason
        )
      }

      await loadSyncStats()

      /*
       * If both backend requests failed, show an error.
       * This prevents a partially loaded dashboard from
       * looking like there is simply no data.
       */
      if (
        consentsResult.status === 'rejected' &&
        activityResult.status === 'rejected'
      ) {
        throw (
          consentsResult.reason ??
          activityResult.reason ??
          new Error('Failed to load dashboard')
        )
      }
    } catch (err) {
      console.error(
        'Failed to load doctor dashboard:',
        err
      )

      setError(
        err?.message ??
          'Failed to load dashboard information.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [session?.userId, loadSyncStats])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  /* -------------------------------- */
  /* Refresh sync state periodically */
  /* -------------------------------- */

  useEffect(() => {
    loadSyncStats()

    const interval = window.setInterval(
      loadSyncStats,
      5000
    )

    return () => window.clearInterval(interval)
  }, [loadSyncStats])

  /* -------------------------------- */
  /* Recently accessed patients */
  /* -------------------------------- */

  const recentPatients = useMemo(() => {
    const patients = new Map()

    for (const item of activity) {
      /*
       * Different backend DTO versions may use different
       * field names. Support the common variants without
       * creating fake patient data.
       */

      const patientId =
        item.patientId ??
        item.patient_id ??
        item.targetPatientId ??
        item.target_patient_id

      const healthId =
        item.healthId ??
        item.health_id ??
        item.patientHealthId ??
        item.patient_health_id

      const displayName =
        item.patientName ??
        item.patient_name ??
        item.patientDisplayName ??
        item.patient_display_name

      /*
       * Only consider activities that actually identify
       * a patient.
       */
      if (!patientId && !healthId) {
        continue
      }

      const key = patientId ?? healthId

      if (!patients.has(key)) {
        patients.set(key, {
          patientId,
          healthId,
          displayName,
          createdAt:
            item.createdAt ??
            item.created_at ??
            null,
        })
      }
    }

    return Array.from(patients.values())
      .sort((a, b) => {
        const aTime = a.createdAt
          ? new Date(a.createdAt).getTime()
          : 0

        const bTime = b.createdAt
          ? new Date(b.createdAt).getTime()
          : 0

        return bTime - aTime
      })
  }, [activity])

  /* -------------------------------- */
  /* Sync state */
  /* -------------------------------- */

  const syncStatus = useMemo(() => {
    if (!isOnline) {
      return {
        label: 'Offline',
        tone: 'neutral',
        description:
          syncStats.localOnly > 0
            ? `${syncStats.localOnly} change${
                syncStats.localOnly === 1
                  ? ''
                  : 's'
              } waiting for connection.`
            : 'Changes will be queued locally until connectivity returns.',
      }
    }

    if (syncStats.conflict > 0) {
      return {
        label: 'Conflict',
        tone: 'emergency',
        description: `${syncStats.conflict} change${
          syncStats.conflict === 1
            ? ''
            : 's'
        } require manual review.`,
      }
    }

    if (syncStats.localOnly > 0) {
      return {
        label: 'Pending',
        tone: 'trust',
        description: `${syncStats.localOnly} local change${
          syncStats.localOnly === 1
            ? ''
            : 's'
        } waiting to sync.`,
      }
    }

    return {
      label: 'Synced',
      tone: 'trust',
      description:
        syncStats.synced > 0
          ? `${syncStats.synced} queued change${
              syncStats.synced === 1
                ? ''
                : 's'
            } have been synchronized.`
          : 'No local changes are waiting to be synchronized.',
    }
  }, [isOnline, syncStats])

  /* -------------------------------- */
  /* Manual sync */
  /* -------------------------------- */

  const handleSync = async () => {
    if (!isOnline || syncLoading) return

    try {
      setSyncLoading(true)
      setError(null)

      const { processSyncQueue } =
        await import('../../../lib/syncQueue')

      await processSyncQueue(apiClient)

      await loadSyncStats()
    } catch (err) {
      console.error('Sync failed:', err)

      setError(
        err?.message ??
          'Unable to synchronize local changes.'
      )

      await loadSyncStats()
    } finally {
      setSyncLoading(false)
    }
  }

  /* -------------------------------- */
  /* Activity formatting */
  /* -------------------------------- */

  const getActivityDescription = (item) => {
    return (
      item.description ??
      item.details ??
      formatAction(
        item.action ??
          item.eventType ??
          item.event_type
      )
    )
  }

  const getActivityDate = (item) => {
    return (
      item.createdAt ??
      item.created_at ??
      item.timestamp ??
      null
    )
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">

        {/* -------------------------------- */}
        {/* Header */}
        {/* -------------------------------- */}

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-neutral-900">
              Doctor Dashboard
            </h1>

            <Badge
              tone={
                isOnline
                  ? 'trust'
                  : 'neutral'
              }
            >
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>

          <p className="mt-1 text-sm text-neutral-500">
            Manage patient access and review authorized
            medical records.
          </p>
        </div>

        {/* -------------------------------- */}
        {/* Error */}
        {/* -------------------------------- */}

        {error && (
          <Card>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-emergency-600">
                {error}
              </p>

              <Button
                type="button"
                onClick={loadDashboard}
                disabled={isLoading}
              >
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* -------------------------------- */}
        {/* Main actions */}
        {/* -------------------------------- */}

        <div className="grid gap-4 md:grid-cols-2">

          <Card>
            <div className="flex flex-col gap-4">

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Access a Patient
                  </h2>

                  <Badge tone="trust">
                    Consent required
                  </Badge>
                </div>

                <p className="text-sm text-neutral-500">
                  Scan a patient's Health ID QR code to
                  identify them and request access to
                  their medical history.
                </p>
              </div>

               <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        type="button"
        onClick={() => navigate('/doctor/scan')}
      >
        Scan Patient QR
      </Button>

       <Button
        type="button"
        variant="secondary"
        disabled={!doctor}
        onClick={() => setShowDoctorQR(true)}
      >
        {!doctor ? 'Loading QR':'Show My QR'}
      </Button>
    </div>

            </div>
          </Card>

          <Card>
            <div className="flex flex-col gap-4">

              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Find Patient
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Search for a patient using their Health ID
                  when QR scanning is unavailable.
                </p>
              </div>

              <Button
                type="button"
                onClick={() =>
                  navigate('/doctor/patients/search')
                }
              >
                Search Patient
              </Button>

            </div>
          </Card>

        </div>

        {/* -------------------------------- */}
        {/* Access / Consent */}
        {/* -------------------------------- */}

        <div className="grid gap-4 lg:grid-cols-3">

          {/* Pending requests */}

          <Card>
            <h2 className="text-sm font-semibold text-neutral-700">
              Pending Requests
            </h2>

            <p className="mt-2 text-3xl font-semibold text-neutral-900">
              {isLoading
                ? '...'
                : pendingRequests.length}
            </p>

            <p className="mt-1 text-sm text-neutral-500">
              Consent requests waiting for patient action.
            </p>

            <Button
              type="button"
              className="mt-4"
              onClick={() =>
                navigate('/doctor/consents')
              }
            >
              View requests
            </Button>
          </Card>

          {/* Authorized patients */}

          <Card>

    <div>
      <h2 className="font-semibold text-neutral-900">
        Authorized Patients
      </h2>

       <p className="mt-2 text-3xl font-semibold text-neutral-900">
              {isLoading
                ? '...'
                : approvedPatients.length}
            </p>

      <p className="mt-1 text-sm text-neutral-500">
        Patients with approved consent.
      </p>
    </div>

    <Button
      type="button"
      className="mt-4"
      onClick={() =>
        navigate('/doctor/patients')
      }
    >
      View all
    </Button>

</Card>

          {/* Sync status */}

          <Card>
            <h2 className="text-sm font-semibold text-neutral-700">
              Sync Status
            </h2>

            <div className="mt-3">
              <Badge tone={syncStatus.tone}>
                {syncStatus.label}
              </Badge>
            </div>

            <p className="mt-2 text-sm text-neutral-500">
              {syncStatus.description}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() =>
                  navigate('/doctor/sync')
                }
              >
                View sync queue
              </Button>

              {isOnline &&
                syncStats.localOnly > 0 && (
                  <Button
                    type="button"
                    onClick={handleSync}
                    disabled={syncLoading}
                  >
                    {syncLoading
                      ? 'Syncing...'
                      : 'Sync now'}
                  </Button>
                )}
            </div>
          </Card>

        </div>

        {/* -------------------------------- */}
        {/* Recently accessed patients */}
        {/* -------------------------------- */}

        <Card>

          <div className="mb-4 flex items-center justify-between">

            <div>
              <h2 className="font-semibold text-neutral-900">
                Recently Accessed Patients
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Patients identified from your recent
                authorized activity.
              </p>
            </div>

            <Button
              type="button"
              onClick={() =>
                navigate('/doctor/patients')
              }
            >
              View all
            </Button>

          </div>

          {isLoading ? (
            <p className="text-sm text-neutral-500">
              Loading patients...
            </p>
          ) : recentPatients.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-200 p-6 text-center">

              <p className="text-sm font-medium text-neutral-700">
                No recently accessed patients
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                Scan or search for a patient's Health ID
                to begin.
              </p>

              <Button
                type="button"
                className="mt-4"
                onClick={() =>
                  navigate('/doctor/scan')
                }
              >
                Scan Patient
              </Button>

            </div>
          ) : (
            <div className="divide-y divide-neutral-200">

              {recentPatients
                .slice(0, 5)
                .map((patient) => {

                  const patientId =
                    patient.patientId

                  return (
                    <div
                      key={
                        patientId ??
                        patient.healthId
                      }
                      className="flex items-center justify-between gap-4 py-4"
                    >

                      <div>
                        <p className="text-sm font-medium text-neutral-800">
                          {patient.displayName ??
                            'Patient'}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          Health ID:{' '}
                          {patient.healthId ??
                            'Unavailable'}
                        </p>

                        {patient.createdAt && (
                          <p className="mt-1 text-xs text-neutral-400">
                            {new Date(
                              patient.createdAt
                            ).toLocaleString()}
                          </p>
                        )}
                      </div>

                      {patientId ? (
                        <Button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/doctor/patients/${patientId}`
                            )
                          }
                        >
                          Open
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() =>
                            navigate(
                              '/doctor/patients/search'
                            )
                          }
                        >
                          Search
                        </Button>
                      )}

                    </div>
                  )
                })}

            </div>
          )}

        </Card>

        {/* -------------------------------- */}
        {/* Doctor activity */}
        {/* -------------------------------- */}

        <Card>

          <div className="mb-4 flex items-center justify-between">

            <div>
              <h2 className="font-semibold text-neutral-900">
                Recent Activity
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Your recent patient-access activity.
              </p>
            </div>

            <Button
              type="button"
              onClick={loadDashboard}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>

          </div>

          {isLoading && activity.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Loading activity...
            </p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No recent activity.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-neutral-200">

              {activity
                .slice(0, 5)
                .map((item, index) => {

                  const createdAt =
                    getActivityDate(item)

                  return (
                    <div
                      key={
                        item.id ??
                        item.auditId ??
                        `${createdAt ?? 'activity'}-${index}`
                      }
                      className="py-3"
                    >

                      <p className="text-sm font-medium text-neutral-800">
                        {getActivityDescription(item)}
                      </p>

                      {createdAt && (
                        <p className="mt-1 text-xs text-neutral-500">
                          {new Date(
                            createdAt
                          ).toLocaleString()}
                        </p>
                      )}

                    </div>
                  )
                })}

            </div>
          )}

        </Card>

        {/* -------------------------------- */}
        {/* Sync summary */}
        {/* -------------------------------- */}

        <Card>

          <div className="mb-4">
            <h2 className="font-semibold text-neutral-900">
              Offline Sync
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Local changes are stored on the device and
              synchronized when connectivity is available.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Waiting
              </p>

              <p className="mt-1 text-2xl font-semibold text-neutral-900">
                {syncStats.localOnly}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Synced
              </p>

              <p className="mt-1 text-2xl font-semibold text-neutral-900">
                {syncStats.synced}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Conflicts
              </p>

              <p className="mt-1 text-2xl font-semibold text-neutral-900">
                {syncStats.conflict}
              </p>
            </div>

          </div>

          {syncStats.conflict > 0 && (
            <div className="mt-4 rounded-lg border border-neutral-200 p-4">
              <p className="text-sm font-medium text-neutral-800">
                Manual review required
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                Critical-field conflicts are not automatically
                resolved.
              </p>

              <Button
                type="button"
                className="mt-3"
                onClick={() =>
                  navigate('/doctor/sync')
                }
              >
                Review sync queue
              </Button>
            </div>
          )}

        </Card>

        {/* -------------------------------- */}
        {/* Clinical workflow */}
        {/* -------------------------------- */}

        <Card>

          <h2 className="text-sm font-semibold text-neutral-700">
            Clinical Workflow
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <WorkflowItem
              number="1"
              title="Identify"
              description="Scan or search the patient's Health ID."
            />

            <WorkflowItem
              number="2"
              title="Request Access"
              description="Request patient consent for medical records."
            />

            <WorkflowItem
              number="3"
              title="Review"
              description="Access records only after authorization."
            />

            <WorkflowItem
              number="4"
              title="Record"
              description="Create or update medical records as permitted."
            />

          </div>

        </Card>

        {/* -------------------------------- */}
        {/* Security notice */}
        {/* -------------------------------- */}

        <Card>

          <div className="flex gap-3">

            <div className="mt-0.5">
              <Badge tone="trust">
                Secure
              </Badge>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-neutral-800">
                Patient privacy
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Patient medical records are protected by
                consent and role-based access control.
                Access to records is audited.
              </p>
            </div>

          </div>

        </Card>

      </div>
      {showDoctorQR && doctor && (
  <DoctorQRDisplay
    doctorId={doctor.id}
    displayName={doctor.displayName}
    specialization={doctor.specialization}
    onClose={() => setShowDoctorQR(false)}
  />
)}
    </AppShell>
  )
}

/* -------------------------------- */
/* Workflow item */
/* -------------------------------- */

function WorkflowItem({
  number,
  title,
  description,
}) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">

      <div className="flex items-center gap-3">

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700">
          {number}
        </div>

        <h3 className="text-sm font-semibold text-neutral-800">
          {title}
        </h3>

      </div>

      <p className="mt-2 text-xs leading-5 text-neutral-500">
        {description}
      </p>

    </div>
  )
}

/* -------------------------------- */
/* Audit action formatting */
/* -------------------------------- */

function formatAction(action) {
  if (!action) {
    return 'Activity recorded'
  }

  switch (action) {
    case 'RECORD_READ':
      return 'Patient medical records viewed'

    case 'RECORD_CREATED':
      return 'Medical record created'

    case 'RECORD_UPDATED':
      return 'Medical record updated'

    case 'CONSENT_REQUESTED':
      return 'Patient consent requested'

    case 'CONSENT_APPROVED':
      return 'Patient consent approved'

    case 'CONSENT_DENIED':
      return 'Patient consent denied'

    case 'QR_VALIDATED':
      return 'Patient Health ID QR validated'

    case 'EMERGENCY_CRITICAL_INFO_READ':
      return 'Emergency medical information accessed'

    default:
      return String(action)
        .replaceAll('_', ' ')
        .toLowerCase()
  }
}