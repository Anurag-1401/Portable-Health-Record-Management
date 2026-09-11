import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { profileApi } from '../../features/auth/api/authApi'

export function QRDisplay({
  healthId,
  qrUrl,
  displayName,
  onRevoked,
}) {
  const [message, setMessage] = useState('')
  const [revoking, setRevoking] = useState(false)

  const handleRevokeQr = async () => {
    setRevoking(true)
    setMessage('')

    try {
      await profileApi.revokePatientQr()

      setMessage('QR code revoked successfully.')

      onRevoked?.()
    } catch (error) {
      console.error('Failed to revoke QR:', error)

      setMessage(
        error?.message ||
          'Could not revoke the QR code.'
      )
    } finally {
      setRevoking(false)
    }
  }

  return (
    <Card className="flex flex-col items-center gap-4 text-center">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          My Health QR
        </h2>

        <p className="mt-1 text-sm text-neutral-500">
          Scan this QR code to start the secure PHR workflow.
        </p>
      </div>

      {qrUrl ? (
        <QRCodeSVG
          value={qrUrl}
          size={220}
          level="M"
          includeMargin
        />
      ) : (
        <p className="text-sm text-red-600">
          QR URL is unavailable.
        </p>
      )}

      <div>
        <p className="font-semibold text-neutral-900">
          {displayName}
        </p>

        <p className="font-mono text-sm text-neutral-600">
          {healthId}
        </p>
      </div>

      {message && (
        <div className="w-full rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
          {message}
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        disabled={revoking}
        onClick={handleRevokeQr}
      >
        {revoking ? 'Revoking...' : 'Revoke QR'}
      </Button> 

      <p className="text-xs text-neutral-400">
        Revoking this QR immediately invalidates the current
        QR link. You can generate a new one later.
      </p>
    </Card>
  )
}