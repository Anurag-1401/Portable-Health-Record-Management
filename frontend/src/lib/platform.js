import { Capacitor } from '@capacitor/core'

/**
 * Central place for every "native vs web" branch in the app.
 *
 * Capacitor.getPlatform() returns 'ios' | 'android' | 'web'. We collapse
 * that into a single isNative boolean almost everywhere, because most of
 * the app's adaptive code doesn't care WHICH native platform it's on — it
 * cares whether native device plugins (camera, push, secure storage) are
 * available at all. Keep iOS/Android-specific branches rare and localized;
 * if you find yourself checking `getPlatform() === 'ios'` in a feature
 * file, that's usually a sign the logic belongs in this file instead.
 */

export function getPlatform() {
  return Capacitor.getPlatform() // 'ios' | 'android' | 'web'
}

export function isNativePlatform() {
  return Capacitor.isNativePlatform()
}

export function isIOS() {
  return getPlatform() === 'ios'
}

export function isAndroid() {
  return getPlatform() === 'android'
}

/**
 * Example of the adaptive pattern this file exists to centralize: QR
 * scanning uses a native camera plugin when running as an installed app,
 * and falls back to the browser's getUserMedia (via html5-qrcode) when
 * running in a plain browser tab. See src/components/qr/QRScanner.jsx for
 * the consumer of this — it just calls scanQrCode() and never has to know
 * which underlying implementation ran.
 */
export async function scanQrCode() {
  if (isNativePlatform()) {
    // Native path: requires a barcode scanner Capacitor plugin, e.g.
    // @capacitor-community/barcode-scanner or @capacitor-mlkit/barcode-scanning.
    // Not installed by default in this scaffold — add it when you build the
    // actual scanner screen, since it needs platform-specific setup
    // (camera permission strings in Info.plist / AndroidManifest.xml).
    throw new Error(
      'Native QR scanning plugin not yet installed — see src/components/qr/QRScanner.jsx TODO.'
    )
  }
  // Web path: browser camera via getUserMedia, handled by html5-qrcode in
  // the QRScanner component itself (kept there since it's tied to DOM
  // elements, not just a platform capability check).
  return null
}
