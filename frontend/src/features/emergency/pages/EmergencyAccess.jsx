import { useState } from 'react'
import { AppShell } from '../../../components/layout/AppShell'
import { QRScanner } from '../../../components/qr/QRScanner'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { apiClient } from '../../../lib/apiClient'
import { getCachedPatientProfile } from '../../../lib/offlineDb'

/**
 * The one screen in the app that deliberately skips the consent flow —
 * matches access_grants rows with source_request_id = NULL in the schema.
 * Every load of this screen must still write an access_logs entry
 * server-side with was_emergency_override = true; that happens inside
 * apiClient.getCriticalInfo, not here, so it can't be skipped by mistake.
 */
export default function EmergencyAccess() {
  const [criticalInfo, setCriticalInfo] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | error | offline-cache

  async function handleScan(decodedText) {
    setStatus('loading')
    let healthId
    try {
      healthId = JSON.parse(decodedText).healthId
    } catch {
      healthId = decodedText
    }

    try {
      const info = await apiClient.getCriticalInfo(healthId)
      setCriticalInfo(info)
      setStatus('idle')
    } catch {
      // Offline fallback: last-synced critical info cached on this device,
      // if this patient was ever seen here before. Better than nothing in
      // a genuine emergency with no signal.
      const cached = await getCachedPatientProfile(healthId)
      if (cached) {
        setCriticalInfo(cached)
        setStatus('offline-cache')
      } else {
        setStatus('error')
      }
    }
  }

  return (
    <AppShell>
      <Card className="mb-4 border-emergency-200 bg-emergency-50">
        <p className="text-sm text-emergency-800">
          Emergency access mode — no patient consent required. This lookup is logged.
        </p>
      </Card>

      {!criticalInfo && <QRScanner onScan={handleScan} onError={() => setStatus('error')} />}

      {status === 'loading' && <p className="text-sm text-neutral-500">Looking up critical info…</p>}
      {status === 'error' && <p className="text-sm text-emergency-600">Could not retrieve records.</p>}

      {criticalInfo && (
        <Card>
          {status === 'offline-cache' && (
            <Badge tone="warning">Showing last-synced data — offline</Badge>
          )}
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div>
              <dt className="text-neutral-500">Blood group</dt>
              <dd className="text-lg font-semibold text-neutral-900">{criticalInfo.blood_group ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Allergies</dt>
              <dd className="flex flex-wrap gap-1">
                {(criticalInfo.allergies ?? []).map((a, i) => (
                  <Badge key={i} tone="critical">{a.allergen} ({a.severity})</Badge>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Chronic conditions</dt>
              <dd className="flex flex-wrap gap-1">
                {(criticalInfo.chronic_conditions ?? []).map((c, i) => (
                  <Badge key={i} tone="warning">{c.condition}</Badge>
                ))}
              </dd>
            </div>
          </dl>
        </Card>
      )}
    </AppShell>
  )
}
