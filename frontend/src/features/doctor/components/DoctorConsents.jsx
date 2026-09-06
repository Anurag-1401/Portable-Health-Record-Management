import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AppShell } from '../../../components/layout/AppShell'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { apiClient } from '../../../lib/apiClient'

function formatDateTime(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatRelativeTime(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `${hours} hr ago`

  const days = Math.floor(hours / 24)

  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`

  return formatDateTime(value)
}

function getStatusTone(status) {
  switch (String(status || '').toUpperCase()) {
    case 'APPROVED':
      return 'success'

    case 'DENIED':
      return 'danger'

    case 'EXPIRED':
      return 'warning'

    case 'PENDING':
    default:
      return 'neutral'
  }
}

function getPatientIdentifier(consent) {
  return (
    consent?.healthId ||
    consent?.patientHealthId ||
    consent?.patient?.healthId ||
    consent?.patientId ||
    'Patient'
  )
}

function getDoctorIdentifier(consent) {
  return (
    consent?.doctorName ||
    consent?.doctor?.name ||
    consent?.doctorId ||
    'Doctor'
  )
}

export default function DoctorConsents() {
  const navigate = useNavigate()

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadRequests = useCallback(async (showRefreshState = false) => {
    try {
      if (showRefreshState) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError('')

      const data =
        await apiClient.getDoctorPendingConsentRequests()

      setRequests(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load doctor consent requests:', err)

      setError(
        err?.message ||
          'Unable to load consent requests. Please try again.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const handleOpenPatient = (request) => {
    const patientId =
      request?.patientId ||
      request?.patient?.id

    if (!patientId) {
      return
    }

    navigate(`/doctor/patients/${patientId}`)
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Page header */}
        <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-medium text-neutral-900">
                Consent Requests
              </h1>

              <p className="mt-1 text-sm text-neutral-500">
                View patient access requests and their current status.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => loadRequests(true)}
              disabled={loading || refreshing}
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Security notice */}
        <Card>
          <div className="flex items-start gap-3">
            <Badge tone="trust">
              Secure
            </Badge>

            <div className="min-w-0">
              <p className="font-medium text-neutral-900">
                Patient-controlled access
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                Consent must be approved by the patient before
                protected medical records can be accessed.
              </p>
            </div>
          </div>
        </Card>

        {/* Error */}
        {error && (
          <Card>
            <div className="flex flex-col gap-3">
              <div>
                <p className="font-medium text-neutral-900">
                  Unable to load consent requests
                </p>

                <p className="mt-1 text-sm text-neutral-500">
                  {error}
                </p>
              </div>

              <div>
                <Button
                  type="button"
                  onClick={() => loadRequests()}
                >
                  Try again
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Loading */}
        {loading && !error && (
          <Card>
            <div className="flex flex-col gap-2">
              <p className="font-medium text-neutral-900">
                Loading consent requests
              </p>

              <p className="text-sm text-neutral-500">
                Checking for pending patient approvals…
              </p>
            </div>
          </Card>
        )}

        {/* Empty state */}
        {!loading && !error && requests.length === 0 && (
          <Card>
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="font-medium text-neutral-900">
                No pending consent requests
              </p>

              <p className="max-w-md text-sm text-neutral-500">
                You do not currently have any patient consent
                requests awaiting approval.
              </p>

              <div className="mt-2">
                <Button
                  type="button"
                  onClick={() => navigate('/doctor/patients/search')}
                >
                  Search Patients
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Requests */}
        {!loading && !error && requests.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-neutral-900">
                  Pending Requests
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  {requests.length}{' '}
                  {requests.length === 1
                    ? 'request'
                    : 'requests'}{' '}
                  awaiting patient approval
                </p>
              </div>
            </div>

            {requests.map((request) => {
              const requestId = request?.id

              const patientIdentifier =
                getPatientIdentifier(request)

              const status =
                String(request?.status || 'PENDING').toUpperCase()

              const purpose =
                request?.purpose ||
                'Clinical consultation'

              return (
                <Card key={requestId || patientIdentifier}>
                  <div className="flex flex-col gap-5">
                    {/* Request heading */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                          Patient
                        </p>

                        <p className="mt-1 text-base font-medium text-neutral-900">
                          {patientIdentifier}
                        </p>
                      </div>

                      <Badge tone={getStatusTone(status)}>
                        {status}
                      </Badge>
                    </div>

                    {/* Request details */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                          Purpose
                        </p>

                        <p className="mt-1 text-sm text-neutral-900">
                          {purpose}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                          Requested
                        </p>

                        <p className="mt-1 text-sm text-neutral-900">
                          {formatDateTime(request?.requestedAt)}
                        </p>

                        {request?.requestedAt && (
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {formatRelativeTime(
                              request.requestedAt
                            )}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                          Expires
                        </p>

                        <p className="mt-1 text-sm text-neutral-900">
                          {formatDateTime(request?.expiresAt)}
                        </p>
                      </div>

                      {request?.id && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                            Request ID
                          </p>

                          <p className="mt-1 break-all font-mono text-xs text-neutral-600">
                            {request.id}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-neutral-500">
                        The patient must approve this request
                        before their protected records can be
                        viewed.
                      </p>

                      {request?.patientId && (
                        <Button
                          type="button"
                          onClick={() =>
                            handleOpenPatient(request)
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
