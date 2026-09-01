import { useState } from 'react'

import { AppShell } from '../../../components/layout/AppShell'
import { QRScanner } from '../../../components/qr/QRScanner'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'

import { apiClient } from '../../../lib/apiClient'


export default function ScanPatientQR() {

  /*
   * scannedPayload:
   *
   * {
   *   healthId: "...",
   *   payloadHash: "..."
   * }
   */
  const [scannedPayload, setScannedPayload] = useState(null)

  /*
   * idle
   * sending
   * pending
   * error
   */
  const [requestStatus, setRequestStatus] = useState('idle')

  const [error, setError] = useState(null)


  /*
   * ---------------------------------------------
   * Handle QR scan
   * ---------------------------------------------
   */
  function handleScan(decodedText) {

    setError(null)

    if (!decodedText || !decodedText.trim()) {
      setError('The QR code does not contain any data.')
      return
    }

    try {

      /*
       * Expected QR payload:
       *
       * {
       *   "healthId": "PHR-123456",
       *   "payloadHash": "..."
       * }
       */
      const payload = JSON.parse(decodedText)

      if (!payload.healthId) {
        throw new Error(
          'This QR code does not contain a valid Health ID.'
        )
      }

      setScannedPayload({
        healthId: payload.healthId,
        payloadHash: payload.payloadHash ?? null,
      })

      setRequestStatus('idle')

    } catch (err) {

      /*
       * If your QR generator sometimes contains
       * only the Health ID as plain text, support
       * that format as a fallback.
       */
      const rawHealthId = decodedText.trim()

      if (!rawHealthId) {
        setError('Invalid QR code.')
        return
      }

      setScannedPayload({
        healthId: rawHealthId,
        payloadHash: null,
      })

      setRequestStatus('idle')
    }
  }


  /*
   * ---------------------------------------------
   * Request patient consent
   * ---------------------------------------------
   */
  async function handleRequestAccess() {

    if (!scannedPayload?.healthId) {
      setError('No valid Health ID has been scanned.')
      return
    }

    setRequestStatus('sending')
    setError(null)

    try {

      /*
       * IMPORTANT:
       *
       * Send HEALTH ID, not internal patient UUID.
       *
       * Backend should resolve:
       *
       * healthId -> Patient -> patientId
       */
      await apiClient.requestConsent(
        scannedPayload.healthId,
        'Clinical consultation'
      )

      setRequestStatus('pending')

    } catch (err) {

      console.error(
        'Failed to request patient consent:',
        err
      )

      setError(
        err?.message ??
        'Could not send the consent request.'
      )

      setRequestStatus('error')
    }
  }


  /*
   * ---------------------------------------------
   * Scan another patient
   * ---------------------------------------------
   */
  function handleScanAgain() {

    setScannedPayload(null)
    setRequestStatus('idle')
    setError(null)
  }


  /*
   * ---------------------------------------------
   * Render
   * ---------------------------------------------
   */
  return (
    <AppShell>

      <div className="flex flex-col gap-4">

        {/* ========================================= */}
        {/* Scanner / Patient Identification */}
        {/* ========================================= */}

        <Card>

          <div className="mb-4">

            <h1 className="text-lg font-semibold text-neutral-900">
              Scan Patient Health ID
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Scan the patient's Health ID QR code to
              identify the patient and request access to
              their medical records.
            </p>

          </div>


          {/* ======================================= */}
          {/* QR Scanner */}
          {/* ======================================= */}

          {!scannedPayload && (

            <div>

              <QRScanner
                onScan={handleScan}
                onError={(scannerError) => {

                  console.error(
                    'QR scanner error:',
                    scannerError
                  )

                  setError(
                    'Unable to scan the QR code. Please try again.'
                  )
                }}
              />

              {error && (

                <p className="mt-3 text-sm text-emergency-600">
                  {error}
                </p>

              )}

            </div>

          )}


          {/* ======================================= */}
          {/* Scanned Patient */}
          {/* ======================================= */}

          {scannedPayload && (

            <div className="flex flex-col gap-4">

              {/* ----------------------------------- */}
              {/* Health ID */}
              {/* ----------------------------------- */}

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">

                <div className="flex items-center justify-between gap-3">

                  <div>

                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Health ID
                    </p>

                    <p className="mt-1 font-mono text-sm font-medium text-neutral-900">
                      {scannedPayload.healthId}
                    </p>

                  </div>

                  <Badge tone="trust">
                    QR scanned
                  </Badge>

                </div>

              </div>


              {/* ----------------------------------- */}
              {/* Payload verification information */}
              {/* ----------------------------------- */}

              {scannedPayload.payloadHash && (

                <div className="rounded-lg border border-neutral-200 p-4">

                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    QR Integrity
                  </p>

                  <p className="mt-1 break-all font-mono text-xs text-neutral-600">
                    {scannedPayload.payloadHash}
                  </p>

                </div>

              )}


              {/* ================================= */}
              {/* IDLE */}
              {/* ================================= */}

              {requestStatus === 'idle' && (

                <div className="flex flex-col gap-3">

                  <div className="rounded-lg border border-neutral-200 p-4">

                    <p className="text-sm font-medium text-neutral-800">
                      Patient consent is required
                    </p>

                    <p className="mt-1 text-sm leading-5 text-neutral-500">
                      Requesting access will notify the patient
                      and allow them to approve or deny access
                      to their protected medical records.
                    </p>

                  </div>


                  <div className="flex flex-col gap-2 sm:flex-row">

                    <Button
                      type="button"
                      onClick={handleRequestAccess}
                    >
                      Request Access
                    </Button>

                    <Button
                      type="button"
                      onClick={handleScanAgain}
                    >
                      Scan Again
                    </Button>

                  </div>

                </div>

              )}


              {/* ================================= */}
              {/* SENDING */}
              {/* ================================= */}

              {requestStatus === 'sending' && (

                <div className="rounded-lg border border-neutral-200 p-4">

                  <p className="text-sm font-medium text-neutral-800">
                    Sending consent request...
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    Please wait while the patient's consent
                    request is being created.
                  </p>

                </div>

              )}


              {/* ================================= */}
              {/* PENDING */}
              {/* ================================= */}

              {requestStatus === 'pending' && (

                <div className="rounded-lg border border-neutral-200 p-4">

                  <div className="flex items-center gap-2">

                    <Badge tone="trust">
                      Pending
                    </Badge>

                    <p className="text-sm font-medium text-neutral-800">
                      Consent request sent
                    </p>

                  </div>

                  <p className="mt-2 text-sm leading-5 text-neutral-500">
                    The patient has been notified and must
                    approve the request before you can access
                    their medical records.
                  </p>

                  <div className="mt-4">

                    <Button
                      type="button"
                      onClick={handleScanAgain}
                    >
                      Scan Another Patient
                    </Button>

                  </div>

                </div>

              )}


              {/* ================================= */}
              {/* ERROR */}
              {/* ================================= */}

              {requestStatus === 'error' && (

                <div className="rounded-lg border border-emergency-200 p-4">

                  <p className="text-sm font-medium text-emergency-600">
                    {error ??
                      'Could not send the consent request.'}
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    Check your connection and try again.
                  </p>


                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">

                    <Button
                      type="button"
                      onClick={handleRequestAccess}
                    >
                      Try Again
                    </Button>

                    <Button
                      type="button"
                      onClick={handleScanAgain}
                    >
                      Scan Again
                    </Button>

                  </div>

                </div>

              )}

            </div>

          )}

        </Card>


        {/* ========================================= */}
        {/* Privacy / Security Information */}
        {/* ========================================= */}

        <Card>

          <div className="flex flex-col gap-3">

            <div className="flex items-center gap-2">

              <Badge tone="trust">
                Secure
              </Badge>

              <h2 className="text-sm font-semibold text-neutral-800">
                Patient privacy
              </h2>

            </div>

            <p className="text-sm leading-6 text-neutral-500">
              Scanning a Health ID does not automatically
              grant access to a patient's medical records.
              Patient consent is required before protected
              health information can be accessed.
            </p>

            <p className="text-sm leading-6 text-neutral-500">
              Every authorized access to medical records is
              recorded in the system audit trail.
            </p>

          </div>

        </Card>


        {/* ========================================= */}
        {/* Workflow Information */}
        {/* ========================================= */}

        <Card>

          <h2 className="text-sm font-semibold text-neutral-800">
            How patient access works
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <WorkflowStep
              number="1"
              title="Scan"
              description="Scan the patient's Health ID QR."
            />

            <WorkflowStep
              number="2"
              title="Request"
              description="Send a request for access to the patient's records."
            />

            <WorkflowStep
              number="3"
              title="Consent"
              description="The patient approves or denies the request."
            />

            <WorkflowStep
              number="4"
              title="Access"
              description="View medical records only after authorization."
            />

          </div>

        </Card>

      </div>

    </AppShell>
  )
}


/*
 * =============================================
 * Workflow Step
 * =============================================
 */

function WorkflowStep({
  number,
  title,
  description,
}) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">

      <div className="flex items-center gap-3">

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700">
          {number}
        </div>

        <h3 className="text-sm font-semibold text-neutral-800">
          {title}
        </h3>

      </div>

      <p className="mt-2 text-xs leading-5 text-neutral-500">
        {description}
      </p>

    </div>
  )
}