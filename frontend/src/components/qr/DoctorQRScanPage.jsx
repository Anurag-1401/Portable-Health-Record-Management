import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRScanner } from '../../components/qr/QRScanner'
import { profileApi } from '../../features/auth/api/authApi'

export default function DoctorQRScanPage() {
  const navigate = useNavigate()

  const [message, setMessage] = useState('')
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(false)
  const [accessGranted, setAccessGranted] = useState(false)

  const handleScan = async (decodedText) => {
    if (!decodedText?.trim()) {
      return
    }

    const scannedText = decodedText.trim()

    setMessage('')
    setDoctor(null)
    setAccessGranted(false)
    setLoading(true)

    try {
      /*
       * ============================================================
       * NEW UNIVERSAL QR
       * ============================================================
       *
       * Doctor QR now contains:
       *
       * https://your-domain.com/qr/doctor/<token>
       *
       * Do NOT JSON.parse() this.
       */
      if (
        scannedText.startsWith('http://') ||
        scannedText.startsWith('https://')
      ) {
        const url = new URL(scannedText)

        /*
         * Only accept PHR doctor QR URLs.
         */
        if (!url.pathname.startsWith('/qr/doctor/')) {
          throw new Error(
            'This is not a Portable Health Record doctor QR code.'
          )
        }

        /*
         * Make sure a token actually exists.
         *
         * /qr/doctor/
         * is invalid.
         */
        const token = url.pathname
          .replace('/qr/doctor/', '')
          .split('/')[0]

        if (!token) {
          throw new Error('Doctor QR token is missing.')
        }

        /*
         * Send the user into the universal QR workflow.
         *
         * UniversalQRPage will resolve the token and show
         * the "Give Access" action.
         */
        navigate(
          `${url.pathname}${url.search}${url.hash}`,
          {
            replace: true,
          }
        )

        return
      }

      /*
       * ============================================================
       * LEGACY DOCTOR QR SUPPORT
       * ============================================================
       *
       * Old QR format:
       *
       * {
       *   "type": "DOCTOR_ACCESS",
       *   "doctorId": "..."
       * }
       *
       * Keep this temporarily for old generated QR codes.
       */
      let payload

      try {
        payload = JSON.parse(scannedText)
      } catch {
        throw new Error(
          'This is not a valid Portable Health Record doctor QR code.'
        )
      }

      if (payload.type !== 'DOCTOR_ACCESS') {
        throw new Error(
          'This is not a Portable Health Record doctor QR code.'
        )
      }

      if (!payload.doctorId) {
        throw new Error('Doctor ID is missing from the QR code.')
      }

      /*
       * Validate old doctor QR through the existing API.
       */
      const result = await profileApi.validateDoctorQR(
        payload.doctorId
      )

      if (!result?.id) {
        throw new Error('Unable to verify the doctor QR code.')
      }

      setDoctor(result)
    } catch (error) {
      console.error('Doctor QR scan failed:', error)

      setDoctor(null)

      setMessage(
        error?.message || 'Invalid doctor QR code.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleGiveAccess = async () => {
    if (!doctor?.id) {
      setMessage('Doctor information is missing.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      await profileApi.requestConsentByPatient(
        doctor.id,
        'Medical consultation'
      )

      setAccessGranted(true)
      setMessage('Access granted successfully.')
    } catch (error) {
      console.error(
        'Failed to give doctor access:',
        error
      )

      setMessage(
        error?.message ||
          'Could not give access to the doctor.'
      )
    } finally {
      setLoading(false)
    }
  }

  const scanAgain = () => {
    setDoctor(null)
    setMessage('')
    setAccessGranted(false)
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">
          Scan Doctor QR
        </h1>

        <p className="mt-1 text-sm text-neutral-500">
          Scan the QR displayed by your doctor to give
          them access to your health records.
        </p>
      </div>

      {/* Scanner */}
      {!doctor && !loading && !accessGranted && (
        <QRScanner
          onScan={handleScan}
          onError={(error) => {
            console.error(
              'QR scanner error:',
              error
            )

            setMessage(
              'Unable to access the camera. Please try again.'
            )
          }}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-lg border p-6 text-center">
          <p className="text-sm text-neutral-600">
            Verifying doctor QR...
          </p>
        </div>
      )}

      {/* Error / success message */}
      {message && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            accessGranted
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      {/* Legacy doctor verification result */}
      {doctor && !accessGranted && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">

          <div className="mb-4">
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              Doctor Verified
            </span>
          </div>

          <h2 className="text-xl font-semibold text-neutral-900">
            {doctor.displayName}
          </h2>

          {doctor.specialization && (
            <p className="mt-1 text-sm text-neutral-600">
              {doctor.specialization}
            </p>
          )}

          {doctor.hospitalName && (
            <p className="mt-1 text-sm text-neutral-600">
              {doctor.hospitalName}
            </p>
          )}

          <p className="mt-4 text-sm text-neutral-500">
            This doctor will be able to access your
            authorized medical records.
          </p>

          <div className="mt-6 flex gap-3">

            <button
              type="button"
              disabled={loading}
              onClick={handleGiveAccess}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Give Access
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={scanAgain}
              className="rounded-lg border px-4 py-2 text-sm font-medium"
            >
              Scan Again
            </button>

          </div>
        </div>
      )}

      {/* Access granted */}
      {accessGranted && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">

          <h2 className="font-semibold text-green-800">
            Access Granted
          </h2>

          <p className="mt-2 text-sm text-green-700">
            {doctor?.displayName} can now access your
            authorized health records.
          </p>

          <button
            type="button"
            onClick={scanAgain}
            className="mt-4 rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-800"
          >
            Scan Another Doctor
          </button>

        </div>
      )}

    </div>
  )
}