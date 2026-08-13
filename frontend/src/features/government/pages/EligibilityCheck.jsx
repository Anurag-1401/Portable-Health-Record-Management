import { AppShell } from '../../../components/layout/AppShell'
import { Card } from '../../../components/ui/Card'

export default function EligibilityCheck() {
  return (
    <AppShell>
      <Card>
        <h1 className="mb-2 text-lg font-semibold text-neutral-900">Scheme eligibility check</h1>
        <p className="text-sm text-neutral-500">
          TODO: scan a Health ID and call an endpoint that returns ONLY
          scheme_eligibility rows (eligibility_status) — never medical data. Mirrors
          access_level = 'eligibility_only' in schema.sql.
        </p>
      </Card>
    </AppShell>
  )
}
