import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AppShell } from '../../../components/layout/AppShell'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { apiClient } from '../../../lib/apiClient'

export default function DoctorPatients() {
  const navigate = useNavigate()

  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPatients()
  }, [])

  async function loadPatients() {
    try {
      setLoading(true)
      setError('')

      const data =
        await apiClient.getDoctorApprovedPatients()

      console.log(
        'APPROVED PATIENTS:',
        data
      )

      const approvedPatients =
        Array.isArray(data)
          ? data
          : data?.patients ??
            data?.consents ??
            []

      setPatients(approvedPatients)
    } catch (err) {
      console.error(
        'Failed to load patients:',
        err
      )

      setError(
        err?.message ||
          'Unable to load patients. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">

        {/* -------------------------------- */}
        {/* Header */}
        {/* -------------------------------- */}

        <div>
          <h1 className="text-2xl font-medium text-neutral-900">
            Patients
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            View and access patients who have granted you access.
          </p>
        </div>

        {/* -------------------------------- */}
        {/* Security notice */}
        {/* -------------------------------- */}

        <Card>
          <div className="flex items-start gap-3">

            <Badge tone="trust">
              Secure
            </Badge>

            <div>
              <p className="font-medium text-neutral-900">
                Patient-controlled access
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                Patient medical records are only available when
                the required consent has been approved.
              </p>
            </div>

          </div>
        </Card>

        {/* -------------------------------- */}
        {/* Error */}
        {/* -------------------------------- */}

        {error && (
          <Card>
            <div className="flex flex-col gap-3">

              <div>
                <p className="font-medium text-neutral-900">
                  Unable to load patients
                </p>

                <p className="mt-1 text-sm text-neutral-500">
                  {error}
                </p>
              </div>

              <div>
                <Button
                  type="button"
                  onClick={loadPatients}
                >
                  Try again
                </Button>
              </div>

            </div>
          </Card>
        )}

        {/* -------------------------------- */}
        {/* Loading */}
        {/* -------------------------------- */}

        {loading && !error && (
          <Card>
            <div>
              <p className="font-medium text-neutral-900">
                Loading patients
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                Checking your approved patient access…
              </p>
            </div>
          </Card>
        )}

        {/* -------------------------------- */}
        {/* Empty */}
        {/* -------------------------------- */}

        {!loading &&
          !error &&
          patients.length === 0 && (
            <Card>
              <div className="flex flex-col items-center gap-3 py-8 text-center">

                <div>
                  <p className="font-medium text-neutral-900">
                    No authorized patients
                  </p>

                  <p className="mt-1 max-w-md text-sm text-neutral-500">
                    Patients will appear here after they
                    approve your access request.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() =>
                    navigate(
                      '/doctor/patients/search'
                    )
                  }
                >
                  Search Patients
                </Button>

              </div>
            </Card>
          )}

        {/* -------------------------------- */}
        {/* Patients */}
        {/* -------------------------------- */}

        {!loading &&
          !error &&
          patients.length > 0 && (
            <div className="flex flex-col gap-4">

              <div>
                <h2 className="text-lg font-medium text-neutral-900">
                  My Patients
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  {patients.length}{' '}
                  {patients.length === 1
                    ? 'patient'
                    : 'patients'}{' '}
                  with approved access.
                </p>
              </div>

              {patients.map((patient) => {

                /*
                 * ConsentResponse may currently return
                 * patientId rather than id.
                 */
                const patientId =
                  patient.patientId ??
                  patient.patient_id ??
                  patient.id

                const patientName =
                  patient.patientName ??
                  patient.patient_name ??
                  patient.name ??
                  'Patient'

                const healthId =
                  patient.healthId ??
                  patient.health_id

                return (
                  <Card
                    key={
                      patient.consentId ??
                      patient.id ??
                      patientId
                    }
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div>

                        <p className="font-medium text-neutral-900">
                          {patientName}
                        </p>

                        {healthId && (
                          <p className="mt-1 text-sm text-neutral-500">
                            Health ID: {healthId}
                          </p>
                        )}

                        {patientId && (
                          <p className="mt-1 text-xs text-neutral-400">
                            Patient ID: {patientId}
                          </p>
                        )}

                        {patient.purpose && (
                          <p className="mt-1 text-xs text-neutral-500">
                            Purpose: {patient.purpose}
                          </p>
                        )}

                        {patient.respondedAt && (
                          <p className="mt-1 text-xs text-neutral-400">
                            Approved:{' '}
                            {new Date(
                              patient.respondedAt
                            ).toLocaleString()}
                          </p>
                        )}

                      </div>

                      <div className="flex items-center gap-3">

                        <Badge tone="trust">
                          Access Granted
                        </Badge>

                        {patientId && (
                          <Button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/doctor/patients/${patientId}`
                              )
                            }
                          >
                            View Patient
                          </Button>
                        )}

                      </div>

                    </div>
                  </Card>
                )
              })}

            </div>
          )}

      </div>
    </AppShell>
  )
}