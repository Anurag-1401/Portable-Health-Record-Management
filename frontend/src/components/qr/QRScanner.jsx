import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { isNativePlatform } from '../../lib/platform'
import { LoadingSpinner } from '../ui/LoadingSpinner'

const SCANNER_ELEMENT_ID = 'qr-scanner-region'

/**
 * This is the concrete example the project brief asks for: "QR scanning
 * using native camera plugin on mobile vs browser camera API on web,
 * using Capacitor.getPlatform()."
 *
 * Web path (implemented here): html5-qrcode drives getUserMedia directly
 * against a DOM element — works in any browser tab, no install required,
 * which matters because clinics without the app installed still need to
 * be able to scan a patient's printed QR card via a plain browser page.
 *
 * Native path (stubbed): when running as an installed Capacitor app,
 * swap in a native barcode plugin (e.g. @capacitor-mlkit/barcode-scanning)
 * for a faster, more reliable scan using the device's native camera APIs
 * instead of a WebView <video> element. Install that plugin and fill in
 * the marked block below when you build this screen for real — it needs
 * camera permission strings added to AndroidManifest.xml / Info.plist,
 * which is outside what a plain npm install can set up for you.
 */
export function QRScanner({ onScan, onError }) {
  const [isNative] = useState(isNativePlatform())
  const scannerRef = useRef(null)

  useEffect(() => {
    if (isNative) return // native path wires up in its own effect below, once the plugin is installed

    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => onScan(decodedText),
        () => {} // per-frame "no QR found" noise — intentionally ignored
      )
      .catch((err) => onError?.(err))

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [isNative, onScan, onError])

  if (isNative) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-600">
        <LoadingSpinner label="Native scanner not yet wired up" />
        <p className="mt-2">
          TODO: install a native barcode plugin (e.g. <code>@capacitor-mlkit/barcode-scanning</code>) and
          replace this block — see the comment at the top of this file.
        </p>
      </div>
    )
  }

  return <div id={SCANNER_ELEMENT_ID} className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-lg" />
}
