import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { AppShell } from '../../../components/layout/AppShell'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'

import { apiClient } from '../../../lib/apiClient'

export default function DoctorPatientDetails() {
  const navigate = useNavigate()
  const { patientId } = useParams()

  const [patient, setPatient] = useState(null)
  const [records, setRecords] = useState([])

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [error, setError] = useState(null)

  /*
   * ---------------------------------------------------------
   * Load authorized patient information
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   *
   * The backend must verify that the current doctor has
   * an APPROVED consent before returning protected data.
   *
   * The frontend should never be responsible for enforcing
   * medical-record authorization.
   */
  const loadPatientDetails = useCallback(
    async (refresh = false) => {
      if (!patientId) {
        setError('No patient was selected.')
        setIsLoading(false)
        return
      }

      try {
        if (refresh) {
          setIsRefreshing(true)
        } else {
          setIsLoading(true)
        }

        setError(null)

        /*
         * Expected backend API:
         *
         * GET /api/patients/{patientId}
         *
         * This should return the patient's basic profile
         * only when the doctor has authorized access.
         */
        const patientResponse =
          await apiClient.getDoctorPatient(patientId)

        const foundPatient =
          patientResponse?.patient ??
          patientResponse

        if (!foundPatient) {
          throw new Error(
            'Patient information could not be found.'
          )
        }

        setPatient(foundPatient)

        /*
         * Expected backend API:
         *
         * GET /api/patients/{patientId}/records
         *
         * Backend must verify approved consent.
         */
        if (
          typeof apiClient.getDoctorPatientRecords ===
          'function'
        ) {
          const recordsResponse =
            await apiClient.getDoctorPatientRecords(
              patientId
            )

          setRecords(
            Array.isArray(recordsResponse)
              ? recordsResponse
              : recordsResponse?.records ?? []
          )
        } else {
          setRecords([])
        }
      } catch (err) {
        console.error(
          'Failed to load patient details:',
          err
        )

        setPatient(null)
        setRecords([])

        setError(
          err?.message ??
            'Unable to load patient information.'
        )
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [patientId]
  )

  useEffect(() => {
    loadPatientDetails()
  }, [loadPatientDetails])

  /*
   * ---------------------------------------------------------
   * Derived patient information
   * ---------------------------------------------------------
   */

  const patientName =
    patient?.displayName ??
    patient?.name ??
    'Patient'

  const healthId =
    patient?.healthId ??
    'Unavailable'

  const patientUuid =
    patient?.patientId ??
    patient?.id ??
    patientId

  const bloodGroup =
    patient?.bloodGroup ??
    'Not available'

  const allergies = Array.isArray(
    patient?.allergies
  )
    ? patient.allergies
    : []

  const chronicConditions = Array.isArray(
    patient?.chronicConditions
  )
    ? patient.chronicConditions
    : []

  /*
   * ---------------------------------------------------------
   * Loading
   * ---------------------------------------------------------
   */

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex flex-col gap-6">

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-neutral-900">
                  Patient Details
                </h1>

                <p className="mt-1 text-sm text-neutral-500">
                  Loading authorized patient information...
                </p>
              </div>

              <Badge tone="trust">
                Loading
              </Badge>
            </div>
          </Card>

        </div>
      </AppShell>
    )
  }

  /*
   * ---------------------------------------------------------
   * Error state
   * ---------------------------------------------------------
   */

  if (error || !patient) {
    return (
      <AppShell>
        <div className="flex flex-col gap-6">

          <Card>
            <div className="flex flex-col gap-4">

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Patient Access
                </p>

                <h1 className="mt-1 text-xl font-semibold text-neutral-900">
                  Unable to open patient
                </h1>

                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  {error ??
                    'The requested patient could not be loaded.'}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">

                <Button
                  type="button"
                  onClick={() =>
                    loadPatientDetails(true)
                  }
                >
                  Try Again
                </Button>

                <Button
                  type="button"
                  onClick={() =>
                    navigate(
                      '/doctor/patients/search'
                    )
                  }
                >
                  Back to Search
                </Button>

              </div>

            </div>
          </Card>

        </div>
      </AppShell>
    )
  }

  /*
   * ---------------------------------------------------------
   * Main page
   * ---------------------------------------------------------
   */

  return (
    <AppShell>
      <div className="flex flex-col gap-6">

        {/* =================================================
            Header
        ================================================= */}

        <section>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

            <div className="flex items-start gap-3">

              <Button
                type="button"
                onClick={() =>
                  navigate(
                    '/doctor/patients/search'
                  )
                }
              >
                Back
              </Button>

              <div>
                <p className="text-sm text-neutral-500">
                  Authorized Patient Access
                </p>

                <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
                  {patientName}
                </h1>

                <p className="mt-1 text-sm text-neutral-500">
                  Review the patient's authorized
                  medical information.
                </p>
              </div>

            </div>

            <div className="flex items-center gap-2">

              <Badge tone="trust">
                Consent Approved
              </Badge>

              <Button
                type="button"
                onClick={() =>
                  loadPatientDetails(true)
                }
                disabled={isRefreshing}
              >
                {isRefreshing
                  ? 'Refreshing...'
                  : 'Refresh'}
              </Button>

            </div>

          </div>

        </section>


        {/* =================================================
            Security Notice
        ================================================= */}

        <Card>

          <div className="flex gap-3">

            <Badge tone="trust">
              Secure
            </Badge>

            <div>

              <h2 className="text-sm font-semibold text-neutral-800">
                Authorized medical-record access
              </h2>

              <p className="mt-1 text-sm leading-6 text-neutral-500">
                You are viewing this patient's
                information because the patient has
                approved your access request. This
                access is recorded in the system audit
                trail.
              </p>

            </div>

          </div>

        </Card>


        {/* =================================================
            Patient Identity
        ================================================= */}

        <Card>

          <div className="flex flex-col gap-5">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-lg font-semibold text-white">
                  {patientName
                    .split(' ')
                    .map(
                      (part) => part[0]
                    )
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>

                <div>

                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Patient
                  </p>

                  <h2 className="mt-1 text-xl font-semibold text-neutral-900">
                    {patientName}
                  </h2>

                  <p className="mt-1 text-sm text-neutral-500">
                    Health ID:{' '}
                    <span className="font-mono">
                      {healthId}
                    </span>
                  </p>

                </div>

              </div>

              <Badge tone="trust">
                Authorized
              </Badge>

            </div>


            {/* Patient identifiers */}

            <div className="grid gap-3 sm:grid-cols-2">

              <InfoCard
                label="Health ID"
                value={healthId}
                mono
              />

              <InfoCard
                label="Patient ID"
                value={patientUuid}
                mono
              />

              <InfoCard
                label="Phone Number"
                value={
                  patient?.phoneNumber ??
                  'Not available'
                }
              />

              <InfoCard
                label="Blood Group"
                value={bloodGroup}
              />

            </div>

          </div>

        </Card>


        {/* =================================================
            Health Summary
        ================================================= */}

        <div className="grid gap-4 lg:grid-cols-2">

          {/* Allergies */}

          <Card>

            <div className="mb-4">

              <h2 className="text-lg font-semibold text-neutral-900">
                Allergies
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Known allergies recorded in the
                patient's profile.
              </p>

            </div>

            {allergies.length === 0 ? (

              <div className="rounded-lg border border-dashed border-neutral-300 p-5">

                <p className="text-sm text-neutral-500">
                  No known allergies recorded.
                </p>

              </div>

            ) : (

              <div className="flex flex-wrap gap-2">

                {allergies.map(
                  (item, index) => (

                    <Badge
                      key={index}
                      tone="neutral"
                    >
                      {formatListItem(item)}
                    </Badge>

                  )
                )}

              </div>

            )}

          </Card>


          {/* Chronic conditions */}

          <Card>

            <div className="mb-4">

              <h2 className="text-lg font-semibold text-neutral-900">
                Chronic Conditions
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Chronic conditions recorded in the
                patient's profile.
              </p>

            </div>

            {chronicConditions.length === 0 ? (

              <div className="rounded-lg border border-dashed border-neutral-300 p-5">

                <p className="text-sm text-neutral-500">
                  No chronic conditions recorded.
                </p>

              </div>

            ) : (

              <div className="flex flex-wrap gap-2">

                {chronicConditions.map(
                  (item, index) => (

                    <Badge
                      key={index}
                      tone="neutral"
                    >
                      {formatListItem(item)}
                    </Badge>

                  )
                )}

              </div>

            )}

          </Card>

        </div>


        {/* =================================================
            Medical Records
        ================================================= */}

        <Card>

          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-lg font-semibold text-neutral-900">
                Medical Records
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Authorized medical records belonging
                to this patient.
              </p>

            </div>

            <Badge tone="trust">
              {records.length} record
              {records.length === 1
                ? ''
                : 's'}
            </Badge>

          </div>


          {records.length === 0 ? (

            <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">

              <h3 className="font-medium text-neutral-700">
                No medical records available
              </h3>

              <p className="mt-1 text-sm text-neutral-500">
                No authorized medical records were
                found for this patient.
              </p>

            </div>

          ) : (

            <div className="flex flex-col divide-y divide-neutral-200">

              {records.map(
                (record, index) => (

                  <DoctorMedicalRecord
                    key={
                      record.id ??
                      record.recordId ??
                      record.versionId ??
                      index
                    }
                    record={record}
                  />

                )
              )}

            </div>

          )}

        </Card>


        {/* =================================================
            Access Information
        ================================================= */}

        <Card>

          <div className="flex flex-col gap-4">

            <div>

              <h2 className="text-sm font-semibold text-neutral-800">
                Access Information
              </h2>

              <p className="mt-1 text-sm leading-6 text-neutral-500">
                This patient granted access through the
                consent workflow. Only information
                permitted by the patient's authorization
                should be viewed or used.
              </p>

            </div>

            <div className="grid gap-3 sm:grid-cols-3">

              <AccessInfo
                label="Authorization"
                value="Approved"
              />

              <AccessInfo
                label="Records"
                value={`${records.length}`}
              />

              <AccessInfo
                label="Audit"
                value="Recorded"
              />

            </div>

          </div>

        </Card>


        {/* =================================================
            Bottom Actions
        ================================================= */}

        <div className="flex flex-col gap-2 sm:flex-row">

          <Button
            type="button"
            onClick={() =>
              navigate(
                '/doctor/patients/search'
              )
            }
          >
            Back to Patient Search
          </Button>

          <Button
            type="button"
            onClick={() =>
              navigate('/doctor/dashboard')
            }
          >
            Doctor Dashboard
          </Button>

        </div>

      </div>
    </AppShell>
  )
}


/* ============================================================
   Info Card
============================================================ */

function InfoCard({
  label,
  value,
  mono = false,
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">

      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>

      <p
        className={[
          'mt-1 text-sm font-medium text-neutral-900',
          mono
            ? 'break-all font-mono'
            : '',
        ].join(' ')}
      >
        {value}
      </p>

    </div>
  )
}


/* ============================================================
   Access Info
============================================================ */

function AccessInfo({
  label,
  value,
}) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">

      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>

      <div className="mt-2">

        <Badge tone="trust">
          {value}
        </Badge>

      </div>

    </div>
  )
}


/* ============================================================
   Medical Record
============================================================ */

function DoctorMedicalRecord({
  record,
}) {
  const resourceType =
    record.fhirResourceType ??
    record.resourceType ??
    record.type ??
    'Medical Record'

  const recordId =
    record.recordId ??
    record.id ??
    null

  const version =
    record.versionNumber ??
    record.currentVersion ??
    record.version ??
    1

  const date =
    record.updatedAt ??
    record.createdAt ??
    record.recordedAt ??
    null

  const formattedDate = date
    ? new Date(date).toLocaleString()
    : 'Date unavailable'

  return (
    <div className="py-5">

      <div className="flex flex-col gap-4">

        {/* Record header */}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

          <div>

            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              FHIR Resource
            </p>

            <h3 className="mt-1 text-base font-semibold text-neutral-900">
              {resourceType}
            </h3>

            <p className="mt-1 text-sm text-neutral-500">
              Version {version}
              {' · '}
              {formattedDate}
            </p>

          </div>

          <Badge tone="trust">
            Authorized
          </Badge>

        </div>


        {/* Record ID */}

        {recordId && (

          <div className="rounded-lg bg-neutral-50 p-3">

            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Record ID
            </p>

            <p className="mt-1 break-all font-mono text-xs text-neutral-600">
              {recordId}
            </p>

          </div>

        )}


        {/* Record content */}

        <RecordContent record={record} />

      </div>

    </div>
  )
}


/* ============================================================
   Record Content
============================================================ */

function RecordContent({
  record,
}) {
  /*
   * If the backend already provides structured
   * FHIR data, display it safely.
   */

  const data =
    record.fhirResource ??
    record.resource ??
    record.data ??
    null

  if (!data) {

    return (
      <div className="rounded-lg border border-neutral-200 p-4">

        <p className="text-sm text-neutral-500">
          Record details are available but no
          structured resource data was returned.
        </p>

      </div>
    )
  }

  /*
   * Basic readable FHIR information.
   */

  const resourceType =
    data.resourceType ??
    record.fhirResourceType ??
    record.resourceType

  const status =
    data.status ??
    data.clinicalStatus?.coding?.[0]?.display ??
    null

  const display =
    data.code?.text ??
    data.code?.coding?.[0]?.display ??
    data.medicationCodeableConcept?.text ??
    data.description ??
    null

  return (
    <div className="rounded-lg border border-neutral-200 p-4">

      <div className="grid gap-4 sm:grid-cols-2">

        {resourceType && (
          <RecordField
            label="Resource Type"
            value={resourceType}
          />
        )}

        {status && (
          <RecordField
            label="Status"
            value={status}
          />
        )}

        {display && (
          <RecordField
            label="Description"
            value={display}
          />
        )}

      </div>


      {/* Full structured resource */}

      <details className="mt-4">

        <summary className="cursor-pointer text-sm font-medium text-neutral-700">
          View structured record
        </summary>

        <pre className="mt-3 overflow-x-auto rounded-lg bg-neutral-50 p-4 text-xs leading-5 text-neutral-600">
          {JSON.stringify(
            data,
            null,
            2
          )}
        </pre>

      </details>

    </div>
  )
}


/* ============================================================
   Record Field
============================================================ */

function RecordField({
  label,
  value,
}) {
  return (
    <div>

      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>

      <p className="mt-1 text-sm text-neutral-800">
        {String(value)}
      </p>

    </div>
  )
}


/* ============================================================
   List Item Formatting
============================================================ */

function formatListItem(item) {
  if (typeof item === 'string') {
    return item
  }

  if (!item) {
    return 'Unknown'
  }

  return (
    item.allergen ??
    item.condition ??
    item.name ??
    item.display ??
    item.text ??
    JSON.stringify(item)
  )
}