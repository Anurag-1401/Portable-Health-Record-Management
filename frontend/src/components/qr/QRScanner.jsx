import { useEffect, useRef, useState } from 'react'
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode'
import { isNativePlatform } from '../../lib/platform'
import { LoadingSpinner } from '../ui/LoadingSpinner'

const SCANNER_ELEMENT_ID = 'qr-scanner-region'

export function QRScanner({ onScan, onError }) {
  const [isNative] = useState(() => isNativePlatform())

  const scannerRef = useRef(null)
  const scanHandledRef = useRef(false)

  const onScanRef = useRef(onScan)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    if (isNative) {
      return
    }

    const element = document.getElementById(
      SCANNER_ELEMENT_ID
    )

    if (!element) {
      console.error(
        `QR scanner element #${SCANNER_ELEMENT_ID} was not found.`
      )
      return
    }

    let mounted = true

    const scanner = new Html5Qrcode(
      SCANNER_ELEMENT_ID,
      {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      }
    )

    scannerRef.current = scanner
    scanHandledRef.current = false

    const startScanner = async () => {
      try {
        await scanner.start(
          {
            // IMPORTANT:
            // Do not use { exact: 'environment' }.
            // Some computers/browsers don't expose an
            // environment camera and will throw
            // OverconstrainedError.
            facingMode: 'environment',
          },
          {
            fps: 15,

            qrbox: {
              width: 280,
              height: 280,
            },

            aspectRatio: 1.0,

            disableFlip: false,
          },

          async (decodedText,decodedResult) => {
            if (!mounted) {
              return
            }

            if (scanHandledRef.current) {
              return
            }

            if (!decodedText || !decodedText.trim()) {
              return
            }

            scanHandledRef.current = true

            try {
              await onScanRef.current?.(
                decodedText.trim()
              )
            } catch (error) {
              console.error(
                'QR scan handler failed:',
                error
              )

              if (mounted) {
                onErrorRef.current?.(error)
              }
            }
          },

          () => {
            // Normal decode failures are ignored.
            // html5-qrcode calls this continuously while
            // looking for a QR code.
          }
        )
      } catch (error) {
        console.error(
          '❌ Failed to start QR scanner:',
          error
        )

        if (mounted) {
          onErrorRef.current?.(error)
        }
      }
    }

    startScanner()

    return () => {
      mounted = false

      const cleanup = async () => {
        try {
          if (scanner.isScanning) {
            await scanner.stop()
          }
        } catch (error) {
          console.warn(
            'Scanner cleanup failed:',
            error
          )
        }

        try {
          scanner.clear()
        } catch (error) {
          console.warn(
            'Scanner clear failed:',
            error
          )
        }

        if (scannerRef.current === scanner) {
          scannerRef.current = null
        }
      }

      cleanup()
    }
  }, [isNative])

  if (isNative) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-600">
        <LoadingSpinner label="Native scanner not yet wired up" />

        <p className="mt-2">
          Native scanner is not configured yet.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div
        id={SCANNER_ELEMENT_ID}
        className="mx-auto w-full max-w-sm overflow-hidden rounded-lg"
      />

      <p className="mt-3 text-center text-xs text-neutral-500">
        Position the doctor QR code inside the scanning area.
      </p>
    </div>
  )
}