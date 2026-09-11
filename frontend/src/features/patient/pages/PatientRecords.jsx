import { useEffect, useState } from 'react'
import { AppShell } from '../../../components/layout/AppShell'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { apiClient } from '../../../lib/apiClient'
import { useAuth } from '../../../hooks/useAuth'

const FHIR_TYPES = [
  'Condition',
  'Observation',
  'MedicationRequest',
]

function normalizeRecord(record) {
  return {
    id:
      record.record_id ??
      record.recordId ??
      record.id,

    patientId:
      record.patient_id ??
      record.patientId,

    fhirResourceType:
      record.fhir_resource_type ??
      record.fhirResourceType ??
      record.resourceType ??
      record.type,

    versionNumber:
      record.version_number ??
      record.versionNumber ??
      record.currentVersion,

    resourceData:
      record.resource_data ??
      record.resourceData ??
      {},

    previousHash:
      record.previous_record_hash ??
      record.previousRecordHash,

    currentHash:
      record.current_record_hash ??
      record.currentRecordHash,

    createdAt:
      record.created_at ??
      record.createdAt,

    updatedAt:
      record.updated_at ??
      record.updatedAt,
  }
}

function formatDate(value) {
  if (!value) return 'Unknown date'

  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatResourceData(data) {
  if (!data) return '{}'

  if (typeof data === 'string') {
    return data
  }

  return JSON.stringify(data, null, 2)
}

export default function PatientRecords() {
  const { session } = useAuth()

  const [records, setRecords] = useState([])
  const [documents, setDocuments] = useState({})

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)

  const [form, setForm] = useState({
  fhirResourceType: 'Observation',

  observationName: '',
  observationValue: '',
  observationUnit: '',
  observationDate: '',
  conditionName: '',
  conditionStatus: 'active',
  medicationName: '',
  medicationDosage: '',
  medicationFrequency: '',
  medicationDuration: '',
  notes: '',
})

const [selectedFile, setSelectedFile] = useState(null)

  const patientId =
    session?.patientId ??
    session?.healthId

  async function loadRecords() {
    try {
      setLoading(true)
      setError('')

      const result = await apiClient.getMyRecords()

      const normalized = Array.isArray(result)
        ? result.map(normalizeRecord)
        : []

      setRecords(normalized)

      // Load attachments for every record
      const documentMap = {}

      await Promise.all(
        normalized.map(async (record) => {
          try {
            const docs = await apiClient.getRecordDocuments(record.id)
            documentMap[record.id] = Array.isArray(docs) ? docs : []
          } catch {
            documentMap[record.id] = []
          }
        })
      )

      setDocuments(documentMap)
    } catch (err) {
      setError(err.message || 'Failed to load medical records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [])

 function openCreateForm() {
  setEditingRecord(null)

  setForm({
    fhirResourceType: 'Observation',

    observationName: '',
    observationValue: '',
    observationUnit: '',
    observationDate: '',

    conditionName: '',
    conditionStatus: 'active',

    medicationName: '',
    medicationDosage: '',
    medicationFrequency: '',
    medicationDuration: '',

    notes: '',
  })

  setSelectedFile(null)

  setError('')
  setSuccess('')
  setShowForm(true)
}

 function openEditForm(record) {
  const data =
    record.resource_data ??
    record.resourceData ??
    {}

  setEditingRecord(record)

  setForm({
    fhirResourceType:
      record.fhir_resource_type ??
      record.fhirResourceType ??
      'Observation',

    observationName:
      data.code?.text ??
      data.name ??
      '',

    observationValue:
      data.valueQuantity?.value ??
      data.value ??
      '',

    observationUnit:
      data.valueQuantity?.unit ??
      data.unit ??
      '',

    observationDate:
      data.effectiveDateTime ??
      '',

    conditionName:
      data.code?.text ??
      data.name ??
      '',

    conditionStatus:
      data.clinicalStatus?.coding?.[0]?.code ??
      'active',

    medicationName:
      data.medicationCodeableConcept?.text ??
      data.medication ??
      '',

    medicationDosage:
      data.dosageInstruction?.[0]?.text ??
      '',

    medicationFrequency:
      data.frequency ??
      '',

    medicationDuration:
      data.duration ??
      '',

    notes:
      data.note?.[0]?.text ??
      data.notes ??
      '',
  })

  setSelectedFile(null)
  setError('')
  setSuccess('')
  setShowForm(true)
}

  function closeForm() {
    if (saving) return

    setShowForm(false)
    setEditingRecord(null)
  }

  async function handleSave(event) {
  event.preventDefault()

  setSaving(true)
  setError('')
  setSuccess('')

  try {
    let resourceData = {}

    if (form.fhirResourceType === 'Observation') {
      resourceData = {
        resourceType: 'Observation',

        status: 'final',

        code: {
          text: form.observationName,
        },

        ...(form.observationValue && {
          valueQuantity: {
            value: Number(form.observationValue),
            ...(form.observationUnit && {
              unit: form.observationUnit,
            }),
          },
        }),

        ...(form.observationDate && {
          effectiveDateTime: form.observationDate,
        }),

        ...(form.notes && {
          note: [
            {
              text: form.notes,
            },
          ],
        }),
      }
    }

    if (form.fhirResourceType === 'Condition') {
      resourceData = {
        resourceType: 'Condition',

        clinicalStatus: {
          coding: [
            {
              code: form.conditionStatus,
            },
          ],
        },

        code: {
          text: form.conditionName,
        },

        ...(form.notes && {
          note: [
            {
              text: form.notes,
            },
          ],
        }),
      }
    }

    if (
      form.fhirResourceType ===
      'MedicationRequest'
    ) {
      resourceData = {
        resourceType: 'MedicationRequest',

        status: 'active',

        medicationCodeableConcept: {
          text: form.medicationName,
        },

        ...(form.medicationDosage && {
          dosageInstruction: [
            {
              text: form.medicationDosage,
            },
          ],
        }),

        ...(form.medicationFrequency && {
          frequency: form.medicationFrequency,
        }),

        ...(form.medicationDuration && {
          duration: form.medicationDuration,
        }),

        ...(form.notes && {
          note: [
            {
              text: form.notes,
            },
          ],
        }),
      }
    }

    let savedRecord

    if (editingRecord) {
      savedRecord =
        await apiClient.updateRecord(
          editingRecord.id,
          {
            patientId:
              editingRecord.patientId ??
              editingRecord.patient_id,

            fhirResourceType:
              form.fhirResourceType,

            resourceData,

            expectedVersion:
              editingRecord.versionNumber ??
              editingRecord.version_number,
          }
        )

      setSuccess(
        'Medical record updated successfully.'
      )
    } else {
      savedRecord =
        await apiClient.createRecord({
          patientId:
            session?.patientId ?? null,

          healthId:
            session?.healthId ?? null,

          fhirResourceType:
            form.fhirResourceType,

          resourceData,
        })

      setSuccess(
        'Medical record created successfully.'
      )
    }

    /*
     * Upload attachment AFTER the record has
     * been successfully created.
     */
    if (selectedFile) {
      const saved =
        normalizeRecord(savedRecord)

      await apiClient.uploadDocument(
        saved.id,
        selectedFile
      )
    }

    setShowForm(false)
    setEditingRecord(null)
    setSelectedFile(null)

    await loadRecords()

  } catch (err) {
    setError(
      err.message ||
        'Failed to save medical record.'
    )
  } finally {
    setSaving(false)
  }
}

  async function handleDelete(record) {
    const confirmed = window.confirm(
      'Delete this medical record? A deletion entry will be added to the record history.'
    )

    if (!confirmed) return

    try {
      setError('')
      setSuccess('')

      await apiClient.deleteRecord(record.id)

      setSuccess('Medical record deleted successfully.')

      await loadRecords()
    } catch (err) {
      setError(err.message || 'Failed to delete record.')
    }
  }

  async function handleUpload(recordId, event) {
    const file = event.target.files?.[0]

    if (!file) return

    try {
      setError('')
      setSuccess('')

      await apiClient.uploadDocument(recordId, file)

      setSuccess(`${file.name} uploaded successfully.`)

      const docs =
        await apiClient.getRecordDocuments(recordId)

      setDocuments((current) => ({
        ...current,
        [recordId]: docs,
      }))
    } catch (err) {
      setError(err.message || 'Failed to upload file.')
    } finally {
      event.target.value = ''
    }
  }

  async function handleDownload(document) {
    try {
      const blob =
        await apiClient.downloadDocument(
          document.documentId
        )

      const url = URL.createObjectURL(blob)

      const anchor = window.document.createElement('a')
      anchor.href = url
      anchor.download = document.fileName
      anchor.click()

      URL.revokeObjectURL(url)
    } catch (err) {
      setError(
        err.message || 'Failed to download file.'
      )
    }
  }

  async function handleDeleteDocument(document, recordId) {
    const confirmed = window.confirm(
      `Delete "${document.fileName}"?`
    )

    if (!confirmed) return

    try {
      await apiClient.deleteDocument(
        document.documentId
      )

      setDocuments((current) => ({
        ...current,
        [recordId]: (
          current[recordId] || []
        ).filter(
          (item) =>
            item.documentId !== document.documentId
        ),
      }))

      setSuccess('File deleted successfully.')
    } catch (err) {
      setError(
        err.message || 'Failed to delete file.'
      )
    }
  }

  async function verifyHashChain() {
    try {
      setError('')
      setSuccess('')

      if (!patientId) {
        throw new Error(
          'Patient ID is not available.'
        )
      }

      const result =
        await apiClient.verifyHashChain(patientId)

      if (result.valid) {
        setSuccess(
          'Hash chain verified successfully. No tampering detected.'
        )
      } else {
        setError(
          `Hash chain verification failed${
            result.brokenAtIndex != null
              ? ` at record ${result.brokenAtIndex + 1}`
              : ''
          }. Reason: ${result.reason || 'unknown'}`
        )
      }
    } catch (err) {
      setError(
        err.message ||
          'Failed to verify hash chain.'
      )
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">
              Medical Records
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              View and manage your complete medical history.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={verifyHashChain}
            >
              Verify Integrity
            </Button>

            <Button
              type="button"
              onClick={openCreateForm}
            >
              + Add Record
            </Button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Create / Edit */}
       {showForm && (
  <Card>

    <div className="mb-5 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          {editingRecord
            ? 'Edit Medical Record'
            : 'Add Medical Record'}
        </h2>

        <p className="mt-1 text-sm text-neutral-500">
          Enter your health information using the form below.
        </p>
      </div>

      <button
        type="button"
        onClick={closeForm}
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        Cancel
      </button>
    </div>

    <form
      onSubmit={handleSave}
      className="space-y-5"
    >

      {/* Record Type */}

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Record Type
        </label>

        <select
          value={form.fhirResourceType}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              fhirResourceType:
                event.target.value,
            }))
          }
          disabled={Boolean(editingRecord)}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm"
        >
          <option value="Observation">
            Observation / Test Result
          </option>

          <option value="Condition">
            Condition / Diagnosis
          </option>

          <option value="MedicationRequest">
            Medication / Prescription
          </option>
        </select>
      </div>


      {/* ================= OBSERVATION ================= */}

      {form.fhirResourceType ===
        'Observation' && (
        <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">

          <h3 className="font-medium text-neutral-900">
            Test / Observation
          </h3>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Test or Observation Name
            </label>

            <input
              type="text"
              value={form.observationName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  observationName:
                    event.target.value,
                }))
              }
              placeholder="e.g. Blood Pressure"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Value
              </label>

              <input
                type="number"
                value={form.observationValue}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    observationValue:
                      event.target.value,
                  }))
                }
                placeholder="e.g. 120"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Unit
              </label>

              <input
                type="text"
                value={form.observationUnit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    observationUnit:
                      event.target.value,
                  }))
                }
                placeholder="e.g. mmHg"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm"
              />
            </div>

          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Date
            </label>

            <input
              type="date"
              value={form.observationDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  observationDate:
                    event.target.value,
                }))
              }
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm"
            />
          </div>

        </div>
      )}


      {/* ================= CONDITION ================= */}

      {form.fhirResourceType ===
        'Condition' && (
        <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">

          <h3 className="font-medium text-neutral-900">
            Condition / Diagnosis
          </h3>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Condition or Diagnosis
            </label>

            <input
              type="text"
              value={form.conditionName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  conditionName:
                    event.target.value,
                }))
              }
              placeholder="e.g. Hypertension"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Status
            </label>

            <select
              value={form.conditionStatus}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  conditionStatus:
                    event.target.value,
                }))
              }
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm"
            >
              <option value="active">
                Active
              </option>

              <option value="resolved">
                Resolved
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>
          </div>

        </div>
      )}


      {/* ================= MEDICATION ================= */}

      {form.fhirResourceType ===
        'MedicationRequest' && (
        <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">

          <h3 className="font-medium text-neutral-900">
            Medication
          </h3>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Medicine Name
            </label>

            <input
              type="text"
              value={form.medicationName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  medicationName:
                    event.target.value,
                }))
              }
              placeholder="e.g. Paracetamol"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Dosage
              </label>

              <input
                type="text"
                value={form.medicationDosage}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    medicationDosage:
                      event.target.value,
                  }))
                }
                placeholder="e.g. 500 mg"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Frequency
              </label>

              <input
                type="text"
                value={form.medicationFrequency}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    medicationFrequency:
                      event.target.value,
                  }))
                }
                placeholder="e.g. Twice daily"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm"
              />
            </div>

          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Duration
            </label>

            <input
              type="text"
              value={form.medicationDuration}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  medicationDuration:
                    event.target.value,
                }))
              }
              placeholder="e.g. 5 days"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm"
            />
          </div>

        </div>
      )}


      {/* ================= NOTES ================= */}

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Notes
        </label>

        <textarea
          value={form.notes}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              notes: event.target.value,
            }))
          }
          rows={4}
          placeholder="Additional information..."
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm"
        />
      </div>


      {/* ================= ATTACHMENT ================= */}

      <div className="rounded-lg border border-neutral-200 bg-white p-4">

        <h3 className="text-sm font-semibold text-neutral-900">
          Attachment
        </h3>

        <p className="mt-1 text-xs text-neutral-500">
          Attach a medical report, prescription, scan,
          image or other supporting document.
        </p>

        <input
          type="file"
          onChange={(event) =>
            setSelectedFile(
              event.target.files?.[0] ?? null
            )
          }
          className="mt-3 block w-full text-sm text-neutral-600"
        />

        {selectedFile && (
          <p className="mt-2 text-xs text-neutral-500">
            Selected: {selectedFile.name}
          </p>
        )}

      </div>


      {/* ================= ACTIONS ================= */}

      <div className="flex flex-col gap-2 sm:flex-row">

        <Button
          type="submit"
          disabled={saving}
        >
          {saving
            ? 'Saving...'
            : editingRecord
              ? 'Update Record'
              : 'Save Medical Record'}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={closeForm}
          disabled={saving}
        >
          Cancel
        </Button>

      </div>

    </form>

  </Card>
)}

        {/* Records */}
        {loading ? (
          <Card>
            <p className="text-sm text-neutral-500">
              Loading medical records...
            </p>
          </Card>
        ) : !showForm && records.length === 0 ? (
          <Card>
            <div className="py-8 text-center">
              <h2 className="font-medium text-neutral-900">
                No medical records yet
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Add your first medical record to start building your history.
              </p>

              <div className="mt-4">
        <Button
          type="button"
          onClick={openCreateForm}
        >
          Add Medical Record
        </Button>
      </div>
            </div>
          </Card>
        ) : !showForm ? (
          <div className="space-y-4">
            {records.map((record) => {
              const recordDocuments =
                documents[record.id] || []

              return (
                <Card key={record.id}>
                  {/* Record header */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                          {record.fhirResourceType}
                        </span>

                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                          Version {record.versionNumber}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-neutral-500">
                        Created {formatDate(record.createdAt)}
                      </p>

                      {record.updatedAt && (
                        <p className="text-xs text-neutral-400">
                          Updated {formatDate(record.updatedAt)}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          openEditForm(record)
                        }
                      >
                        Edit
                      </Button>

                      <Button
                        type="button"
                        variant="danger"
                        onClick={() =>
                          handleDelete(record)
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Resource JSON */}
                  {/* Record Details */}
<div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">

  <h3 className="mb-3 text-sm font-semibold text-neutral-800">
    Record Details
  </h3>

  {record.fhirResourceType === 'Observation' && (
    <div className="grid gap-3 sm:grid-cols-2">

      <div>
        <p className="text-xs text-neutral-500">
          Test / Observation
        </p>

        <p className="mt-1 text-sm font-medium text-neutral-900">
          {record.resourceData?.code?.text ||
            'Not specified'}
        </p>
      </div>

      <div>
        <p className="text-xs text-neutral-500">
          Result
        </p>

        <p className="mt-1 text-sm font-medium text-neutral-900">
          {record.resourceData?.valueQuantity?.value ??
            'Not specified'}{' '}
          {record.resourceData?.valueQuantity?.unit ?? ''}
        </p>
      </div>

    </div>
  )}

  {record.fhirResourceType === 'Condition' && (
    <div className="grid gap-3 sm:grid-cols-2">

      <div>
        <p className="text-xs text-neutral-500">
          Diagnosis
        </p>

        <p className="mt-1 text-sm font-medium text-neutral-900">
          {record.resourceData?.code?.text ||
            'Not specified'}
        </p>
      </div>

      <div>
        <p className="text-xs text-neutral-500">
          Status
        </p>

        <p className="mt-1 text-sm font-medium text-neutral-900">
          {record.resourceData?.clinicalStatus
            ?.coding?.[0]?.code ||
            'Not specified'}
        </p>
      </div>

    </div>
  )}

  {record.fhirResourceType === 'MedicationRequest' && (
    <div className="grid gap-3 sm:grid-cols-2">

      <div>
        <p className="text-xs text-neutral-500">
          Medicine
        </p>

        <p className="mt-1 text-sm font-medium text-neutral-900">
          {record.resourceData
            ?.medicationCodeableConcept?.text ||
            'Not specified'}
        </p>
      </div>

      <div>
        <p className="text-xs text-neutral-500">
          Dosage
        </p>

        <p className="mt-1 text-sm font-medium text-neutral-900">
          {record.resourceData
            ?.dosageInstruction?.[0]?.text ||
            'Not specified'}
        </p>
      </div>

    </div>
  )}

  {record.resourceData?.note?.[0]?.text && (
    <div className="mt-3 border-t border-neutral-200 pt-3">
      <p className="text-xs text-neutral-500">
        Notes
      </p>

      <p className="mt-1 text-sm text-neutral-700">
        {record.resourceData.note[0].text}
      </p>
    </div>
  )}

</div>

                  {/* Hash information */}
                  <div className="mt-4 rounded-lg bg-neutral-50 p-3">
                    <p className="text-xs font-medium text-neutral-700">
                      Record Integrity
                    </p>

                    <div className="mt-2 space-y-1 text-xs text-neutral-500">
                      <p>
                        Previous hash:{' '}
                        <span className="font-mono">
                          {record.previousHash ||
                            'GENESIS'}
                        </span>
                      </p>

                      <p className="break-all">
                        Current hash:{' '}
                        <span className="font-mono">
                          {record.currentHash}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Attachments */}
                  <div className="mt-5 border-t border-neutral-200 pt-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-900">
                          Attachments
                        </h3>

                        <p className="text-xs text-neutral-500">
                          PDFs, images, reports and other medical files.
                        </p>
                      </div>

                      <label className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                        + Upload File

                        <input
                          type="file"
                          className="hidden"
                          onChange={(event) =>
                            handleUpload(
                              record.id,
                              event
                            )
                          }
                        />
                      </label>
                    </div>

                    {recordDocuments.length === 0 ? (
                      <p className="mt-3 text-xs text-neutral-400">
                        No attachments.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {recordDocuments.map(
                          (document) => (
                            <div
                              key={document.documentId}
                              className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-neutral-800">
                                  {document.fileName}
                                </p>

                                <p className="text-xs text-neutral-500">
                                  {document.contentType ||
                                    'Unknown type'}{' '}
                                  ·{' '}
                                  {Math.ceil(
                                    document.fileSize /
                                      1024
                                  )}{' '}
                                  KB
                                </p>

                                <p className="mt-1 break-all font-mono text-[10px] text-neutral-400">
                                  SHA-256: {document.sha256}
                                </p>
                              </div>

                              <div className="flex shrink-0 gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    handleDownload(
                                      document
                                    )
                                  }
                                >
                                  Download
                                </Button>

                                <Button
                                  type="button"
                                  variant="danger"
                                  onClick={() =>
                                    handleDeleteDocument(
                                      document,
                                      record.id
                                    )
                                  }
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        ) : null }
      </div>
    </AppShell>
  )
}