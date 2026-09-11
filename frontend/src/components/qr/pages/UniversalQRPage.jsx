import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../../../lib/apiClient'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { useAuth } from '../../../hooks/useAuth'

export default function UniversalQRPage() {
  const { type, token } = useParams()
  const navigate = useNavigate()

  const { session, isLoading: authLoading } = useAuth()

  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const qrType = type?.toLowerCase()

  /*
   * ============================================================
   * RESOLVE QR
   * ============================================================
   */
  useEffect(() => {
    if (!type || !token) {
      setError('Invalid QR link.')
      setLoading(false)
      return
    }

    if (qrType !== 'patient' && qrType !== 'doctor') {
      setError('Unsupported QR code type.')
      setLoading(false)
      return
    }

    const resolveQr = async () => {
      setLoading(true)
      setError(null)
      setQrData(null)

      try {
        const result = await apiClient.resolveUniversalQr(
          qrType,
          token
        )

        if (!result?.valid) {
          throw new Error(
            'This QR code is invalid or expired.'
          )
        }

        setQrData(result)
      } catch (err) {
        console.error(
          'QR resolution failed:',
          err
        )

        setError(
          err?.message ||
            'Unable to verify the QR code.'
        )
      } finally {
        setLoading(false)
      }
    }

    resolveQr()
  }, [type, token, qrType])

  /*
   * ============================================================
   * AUTHENTICATION REDIRECT
   * ============================================================
   *
   * IMPORTANT:
   * This hook must stay ABOVE every conditional return.
   */
  useEffect(() => {
    if (authLoading || session) {
      return
    }

    if (!type || !token) {
      return
    }

    navigate('/login', {
      replace: true,
      state: {
        returnTo: `/qr/${type}/${token}`,
      },
    })
  }, [
    authLoading,
    session,
    navigate,
    type,
    token,
  ])

  /*
   * ============================================================
   * DOCTOR → PATIENT
   * ============================================================
   */
  const handleDoctorAccess = async () => {
    if (!isAuthorizedForPatientQr) {
      setError(
        'Only doctors can request access to patient records.'
      )
      return
    }

    if (!qrData?.healthId) {
      setError('Patient information is missing.')
      return
    }

    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await apiClient.requestConsent(
        qrData.healthId,
        'Clinical consultation'
      )

      setSuccess(
        'Access request sent. Waiting for patient approval.'
      )
    } catch (err) {
      console.error(
        'Doctor access request failed:',
        err
      )

      setError(
        err?.message ||
          'Could not request patient access.'
      )
    } finally {
      setActionLoading(false)
    }
  }

  /*
   * ============================================================
   * PATIENT → DOCTOR
   * ============================================================
   */
  const handlePatientAccess = async () => {
    if (!isAuthorizedForDoctorQr) {
      setError(
        'Only patients can give access to doctors.'
      )
      return
    }

    if (!qrData?.doctorId) {
      setError('Doctor information is missing.')
      return
    }

    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await apiClient.requestConsentByPatient(
        qrData.doctorId,
        'Medical consultation'
      )

      setSuccess(
        `Access granted to Dr. ${qrData.displayName}.`
      )
    } catch (err) {
      console.error(
        'Patient access request failed:',
        err
      )

      setError(
        err?.message ||
          'Could not give access to the doctor.'
      )
    } finally {
      setActionLoading(false)
    }
  }

  /*
   * ============================================================
   * LOADING AUTH
   * ============================================================
   */
  if (authLoading) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Card>
          <div className="py-10 text-center">
            <p className="text-sm text-neutral-600">
              Restoring your session...
            </p>
          </div>
        </Card>
      </div>
    )
  }

  /*
   * ============================================================
   * WAITING FOR LOGIN
   * ============================================================
   *
   * Don't render the QR action screen before authentication.
   */
  if (!session) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Card>
          <div className="py-10 text-center">
            <p className="text-sm text-neutral-600">
              Redirecting to login...
            </p>
          </div>
        </Card>
      </div>
    )
  }

  /*
   * ============================================================
   * LOADING QR
   * ============================================================
   */
  if (loading) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Card>
          <div className="py-10 text-center">
            <p className="text-sm text-neutral-600">
              Verifying QR code...
            </p>
          </div>
        </Card>
      </div>
    )
  }

  /*
   * ============================================================
   * INVALID QR
   * ============================================================
   */
  if (error && !qrData) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Card>
          <div className="py-10 text-center">
            <h1 className="text-lg font-semibold text-red-700">
              Invalid QR Code
            </h1>

            <p className="mt-2 text-sm text-neutral-600">
              {error}
            </p>

            <Button
              type="button"
              className="mt-5"
              onClick={() => navigate('/')}
            >
              Go to PHR
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!qrData) {
    return null
  }

  /*
   * ============================================================
   * QR TYPE + ROLE
   * ============================================================
   */
  const isPatientQr =
    qrData.type === 'PATIENT'

  const isDoctorQr =
    qrData.type === 'DOCTOR'

  const userRole =
    String(session?.role ?? '').toUpperCase()

  const isAuthorizedForPatientQr =
    isPatientQr && userRole === 'DOCTOR'

  const isAuthorizedForDoctorQr =
    isDoctorQr && userRole === 'PATIENT'

  const isAuthorized =
    isAuthorizedForPatientQr ||
    isAuthorizedForDoctorQr

  /*
   * ============================================================
   * UI
   * ============================================================
   */
  return (
    <div className="mx-auto max-w-xl p-6">
      <Card>
        <div className="space-y-6">

          {/* Header */}
          <div>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              QR Verified
            </span>

            <h1 className="mt-4 text-2xl font-semibold text-neutral-900">
              {isPatientQr
                ? 'Patient Access'
                : 'Doctor Access'}
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Portable Health Record System
            </p>
          </div>

          {/* Patient QR */}
          {isPatientQr && (
            <div className="rounded-lg border bg-neutral-50 p-4">
              <p className="text-sm text-neutral-500">
                Patient
              </p>

              <p className="mt-1 font-semibold text-neutral-900">
                {qrData.displayName}
              </p>

              {qrData.healthId && (
                <p className="mt-1 font-mono text-sm text-neutral-600">
                  {qrData.healthId}
                </p>
              )}
            </div>
          )}

          {/* Doctor QR */}
          {isDoctorQr && (
            <div className="rounded-lg border bg-neutral-50 p-4">
              <p className="text-sm text-neutral-500">
                Doctor
              </p>

              <p className="mt-1 font-semibold text-neutral-900">
                {qrData.displayName}
              </p>

              {qrData.specialization && (
                <p className="mt-1 text-sm text-neutral-600">
                  {qrData.specialization}
                </p>
              )}

              {qrData.hospitalName && (
                <p className="mt-1 text-sm text-neutral-600">
                  {qrData.hospitalName}
                </p>
              )}
            </div>
          )}

          {/* Wrong role */}
          {!isAuthorized && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">
                This QR code is not intended for your
                account type.
              </p>

              <p className="mt-1 text-sm text-amber-700">
                {isPatientQr
                  ? 'Only a doctor can request access to this patient.'
                  : 'Only a patient can give access to this doctor.'}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="font-medium text-green-800">
                Success
              </p>

              <p className="mt-1 text-sm text-green-700">
                {success}
              </p>
            </div>
          )}

          {/* Doctor → Patient */}
          {isAuthorizedForPatientQr &&
            !success && (
              <div>
                <p className="mb-3 text-sm text-neutral-500">
                  Request permission from this patient
                  to access their authorized medical
                  records.
                </p>

                <Button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleDoctorAccess}
                  className="w-full"
                >
                  {actionLoading
                    ? 'Sending Request...'
                    : 'Request Access'}
                </Button>
              </div>
            )}

          {/* Patient → Doctor */}
          {isAuthorizedForDoctorQr &&
            !success && (
              <div>
                <p className="mb-3 text-sm text-neutral-500">
                  Give this doctor permission to access
                  your authorized health records.
                </p>

                <Button
                  type="button"
                  disabled={actionLoading}
                  onClick={handlePatientAccess}
                  className="w-full"
                >
                  {actionLoading
                    ? 'Granting Access...'
                    : 'Give Access'}
                </Button>
              </div>
            )}

          {/* Back */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/',{replace:true})}
            className="w-full"
          >
            Go Back
          </Button>

        </div>
      </Card>
    </div>
  )
}