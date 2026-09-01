import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AppShell } from '../../../components/layout/AppShell'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'

import { useAuth } from '../../../hooks/useAuth'
import { apiClient } from '../../../lib/apiClient'

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const { session } = useAuth()

  const [recentPatients, setRecentPatients] = useState([])
  const [activity, setActivity] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  /*
   * Load dashboard information.
   *
   * The dashboard should not contain hard-coded patient data.
   * Patient information should come from the backend.
   */
  const loadDashboard = useCallback(async () => {
    if (!session?.userId) return

    try {
      setIsLoading(true)
      setError(null)

      /*
       * These endpoints can be wired to the corresponding
       * backend APIs when they are available.
       *
       * For now we safely attempt them only if they exist
       * in apiClient.
       */

      if (typeof apiClient.getDoctorRecentPatients === 'function') {
        const patients =
          await apiClient.getDoctorRecentPatients()

        setRecentPatients(
          Array.isArray(patients)
            ? patients
            : patients?.patients ?? []
        )
      }

      if (typeof apiClient.getDoctorActivity === 'function') {
        const activities =
          await apiClient.getDoctorActivity()

        setActivity(
          Array.isArray(activities)
            ? activities
            : activities?.activities ?? []
        )
      }
    } catch (err) {
      console.error(
        'Failed to load doctor dashboard:',
        err
      )

      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [session?.userId])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  return (
    <AppShell>
      <div className="flex flex-col gap-6">

        {/* -------------------------------- */}
        {/* Header */}
        {/* -------------------------------- */}

        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Doctor Dashboard
          </h1>

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

              <Button
                type="button"
                onClick={() => navigate('/doctor/scan')}
              >
                Scan Health ID
              </Button>

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
                onClick={() => navigate('/doctor/patients/search')}
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

          <Card>
            <h2 className="text-sm font-semibold text-neutral-700">
              Pending Requests
            </h2>

            <p className="mt-2 text-3xl font-semibold text-neutral-900">
              —
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

          <Card>
            <h2 className="text-sm font-semibold text-neutral-700">
              Authorized Patients
            </h2>

            <p className="mt-2 text-3xl font-semibold text-neutral-900">
              {recentPatients.length}
            </p>

            <p className="mt-1 text-sm text-neutral-500">
              Patients you've recently accessed.
            </p>

            <Button
              type="button"
              className="mt-4"
              onClick={() =>
                navigate('/doctor/patients')
              }
            >
              View patients
            </Button>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-neutral-700">
              Sync Status
            </h2>

            <div className="mt-3">
              <Badge tone="trust">
                Ready
              </Badge>
            </div>

            <p className="mt-2 text-sm text-neutral-500">
              Local records can be synchronized when
              connectivity is available.
            </p>

            <Button
              type="button"
              className="mt-4"
              onClick={() =>
                navigate('/doctor/sync')
              }
            >
              View sync queue
            </Button>
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
                Patients whose records you recently accessed
                with appropriate authorization.
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
                Scan a patient's Health ID to begin.
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

              {recentPatients.slice(0, 5).map((patient) => (
                <div
                  key={
                    patient.patientId ??
                    patient.id
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
                  </div>

                  <Button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/doctor/patients/${
                          patient.patientId ??
                          patient.id
                        }`
                      )
                    }
                  >
                    Open
                  </Button>

                </div>
              ))}

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
              Refresh
            </Button>

          </div>

          {activity.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No recent activity.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-neutral-200">

              {activity.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="py-3"
                >

                  <p className="text-sm font-medium text-neutral-800">
                    {item.description ??
                      item.details ??
                      formatAction(item.action)}
                  </p>

                  {item.createdAt && (
                    <p className="mt-1 text-xs text-neutral-500">
                      {new Date(
                        item.createdAt
                      ).toLocaleString()}
                    </p>
                  )}

                </div>
              ))}

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
  if (!action) return 'Activity recorded'

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
      return action
        .replaceAll('_', ' ')
        .toLowerCase()
    }
  }