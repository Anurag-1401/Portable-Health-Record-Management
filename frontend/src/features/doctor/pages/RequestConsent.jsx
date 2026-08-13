import { useState } from 'react'
import { AppShell } from '../../../components/layout/AppShell'
import { QRScanner } from '../../../components/qr/QRScanner'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { apiClient } from '../../../lib/apiClient'

export default function ScanPatientQR() {
  const [scannedPayload, setScannedPayload] = useState(null)
  const [requestStatus, setRequestStatus] = useState('idle') // idle | sending | pending | error

  function handleScan(decodedText) {
    try {
      setScannedPayload(JSON.parse(decodedText))
    } catch {
      setScannedPayload({ healthId: decodedText, payloadHash: null }) // fallback: raw text QR
    }
  }

  async function handleRequestAccess() {
    setRequestStatus('sending')
    try {
      // TODO: resolve healthId -> patientId server-side before this call —
      // stubbed here since the Identity Service isn't implemented yet
      // (Request Set B, item 3).
      await apiClient.requestConsent(scannedPayload.healthId, 'Clinical consultation')
      setRequestStatus('pending')
    } catch {
      setRequestStatus('error')
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <Card>
          <h1 className="mb-3 text-lg font-semibold text-neutral-900">Scan patient QR</h1>
          {!scannedPayload && <QRScanner onScan={handleScan} onError={() => {}} />}
          {scannedPayload && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-neutral-700">
                Scanned Health ID: <span className="font-mono">{scannedPayload.healthId}</span>
              </p>
              {requestStatus === 'idle' && (
                <Button onClick={handleRequestAccess}>Request access (sends OTP to patient)</Button>
              )}
              {requestStatus === 'sending' && <p className="text-sm text-neutral-500">Sending request…</p>}
              {requestStatus === 'pending' && (
                <p className="text-sm text-trust-600">
                  Consent request sent. Waiting for the patient to approve via OTP.
                </p>
              )}
              {requestStatus === 'error' && (
                <p className="text-sm text-emergency-600">Could not send request. Try again once online.</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  )
}
