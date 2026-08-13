import { AppShell } from '../../../components/layout/AppShell'
import { Card } from '../../../components/ui/Card'

export default function PatientRecords() {
  return (
    <AppShell>
      <Card>
        <h1 className="mb-2 text-lg font-semibold text-neutral-900">Medical history</h1>
        <p className="text-sm text-neutral-500">
          TODO: render the patient's FHIR-aligned record timeline (Condition / Observation /
          MedicationRequest), grouped by clinic visit, sourced from
          <code className="mx-1 rounded bg-neutral-100 px-1">getPatientRecords()</code> with an
          offline-cache fallback via <code className="mx-1 rounded bg-neutral-100 px-1">getRecordsByPatient()</code>.
        </p>
      </Card>
    </AppShell>
  )
}
