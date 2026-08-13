import { QRCodeSVG } from 'qrcode.react'
import { Card } from '../ui/Card'

/**
 * Renders a patient's Health ID as a scannable QR code. The payload is a
 * JSON string of { healthId, payloadHash } — payloadHash is the SHA-256
 * from patients.qr_code_payload_hash (schema.sql), which is what lets the
 * server detect a cloned/altered physical card at scan time, independent
 * of whatever the printed card looks like.
 */
export function QRDisplay({ healthId, payloadHash, displayName }) {
  const payload = JSON.stringify({ healthId, payloadHash })

  return (
    <Card className="flex flex-col items-center gap-3 text-center">
      <QRCodeSVG value={payload} size={220} level="M" includeMargin />
      <div>
        <p className="font-semibold text-neutral-900">{displayName}</p>
        <p className="font-mono text-sm text-neutral-600">{healthId}</p>
      </div>
      <p className="text-xs text-neutral-400">
        Also available as a printed card for patients without a smartphone.
      </p>
    </Card>
  )
}
