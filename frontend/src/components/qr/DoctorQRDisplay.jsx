import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { apiClient } from '../../lib/apiClient'

export function DoctorQRDisplay({
  doctorId,
  displayName,
  specialization,
  onClose,
}) {
  const [qrUrl, setQrUrl] = useState('')
  const [expiresAt, setExpiresAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revoking, setRevoking] = useState(false)

  const generatedRef = useRef(false)

  useEffect(() => {
    if (generatedRef.current) {
      return
    }

    generatedRef.current = true

    const generateQr = async () => {
      try {
        setLoading(true)
        setError('')

        const result = await apiClient.generateDoctorQr()

        if (!result?.qrUrl) {
          throw new Error(
            'Doctor QR URL was not returned by the server.'
          )
        }

        setQrUrl(result.qrUrl)
        setExpiresAt(result.expiresAt)
      } catch (err) {
        console.error(
          'Failed to generate Doctor QR:',
          err
        )

        setError(
          err?.message ||
            'Could not generate Doctor QR code.'
        )
      } finally {
        setLoading(false)
      }
    }

    generateQr()
  }, [])

  const handleRevoke = async () => {
    setRevoking(true)
    setError('')

    try {
      await apiClient.revokeDoctorQr()

      onClose?.()
    } catch (err) {
      console.error(
        'Failed to revoke Doctor QR:',
        err
      )

      setError(
        err?.message ||
          'Could not revoke Doctor QR code.'
      )
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              My Doctor QR
            </h2>

            {displayName && (
              <p className="mt-1 text-sm text-neutral-600">
                {displayName}
              </p>
            )}

            {specialization && (
              <p className="text-sm text-neutral-500">
                {specialization}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ×
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900" />

            <p className="mt-4 text-sm text-neutral-600">
              Generating your QR code...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* QR */}
        {!loading && !error && qrUrl && (
          <div className="mt-6 flex flex-col items-center">

            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <QRCodeSVG
                value={qrUrl}
                size={250}
                level="M"
                includeMargin
              />
            </div>

            <p className="mt-4 text-center text-sm text-neutral-600">
              Ask the patient to scan this QR code
              to give you access to their authorized
              health records.
            </p>

            {expiresAt && (
              <p className="mt-2 text-xs text-neutral-400">
                Expires:{' '}
                {new Date(expiresAt).toLocaleString()}
              </p>
            )}

            <button
              type="button"
              disabled={revoking}
              onClick={handleRevoke}
              className="mt-5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {revoking ? 'Revoking...' : 'Revoke QR'}
            </button>

          </div>
        )}

      </div>
    </div>
  )
}