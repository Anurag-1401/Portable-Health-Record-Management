/**
 * Cryptographic helpers used by:
 *
 * 1. Medical-record hash chains
 * 2. Patient QR payload integrity
 *
 * Web Crypto is used so the same code works in the browser/PWA and
 * inside the Capacitor WebView without another hashing dependency.
 */


/**
 * Calculates a SHA-256 digest and returns it as a lowercase
 * hexadecimal string.
 *
 * Example:
 *
 *   await sha256Hex('PHR-IN-000001')
 *
 * returns a 64-character hexadecimal string.
 */
export async function sha256Hex(message) {
  if (message === null || message === undefined) {
    throw new Error('Cannot hash an empty value')
  }

  const encoder = new TextEncoder()

  const data = encoder.encode(
    String(message)
  )

  const hashBuffer =
    await crypto.subtle.digest(
      'SHA-256',
      data
    )

  return Array
    .from(new Uint8Array(hashBuffer))
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, '0')
    )
    .join('')
}


/**
 * Creates the hash used inside a patient's QR payload.
 *
 * IMPORTANT:
 * The backend must use exactly the same formula.
 *
 * QR hash formula:
 *
 *   SHA256(trimmed healthId)
 *
 * Example QR:
 *
 * {
 *   "healthId": "PHR-IN-000001",
 *   "payloadHash": "64-character-sha256..."
 * }
 */
export async function computeQrPayloadHash(healthId) {
  if (
    !healthId ||
    !String(healthId).trim()
  ) {
    throw new Error(
      'Health ID is required to generate QR hash'
    )
  }

  return sha256Hex(
    String(healthId).trim()
  )
}


/**
 * Validates a QR payload locally.
 *
 * This only checks that:
 *
 * payloadHash === SHA256(healthId)
 *
 * Server-side authorization is still required before
 * exposing patient medical information.
 */
export async function verifyQrPayload({
  healthId,
  payloadHash,
}) {
  if (!healthId || !payloadHash) {
    return false
  }

  const expectedHash =
    await computeQrPayloadHash(healthId)

  return (
    expectedHash.toLowerCase() ===
    String(payloadHash).toLowerCase()
  )
}


/**
 * Deterministic JSON serialization.
 *
 * Object key order must not affect a record hash.
 */
export function canonicalize(value) {
  if (
    value === null ||
    typeof value !== 'object'
  ) {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value
      .map(canonicalize)
      .join(',')}]`
  }

  const sortedKeys =
    Object.keys(value).sort()

  const parts =
    sortedKeys.map(
      (key) =>
        `${JSON.stringify(key)}:${canonicalize(
          value[key]
        )}`
    )

  return `{${parts.join(',')}}`
}


/**
 * Computes the hash for one medical-record version.
 *
 * Formula:
 *
 * SHA256(
 *   previous_hash
 *   +
 *   canonicalize(resource_data)
 *   +
 *   created_at
 * )
 */
export async function computeRecordHash({
  previousHash,
  resourceData,
  createdAt,
}) {
  if (!createdAt) {
    throw new Error(
      'createdAt is required to compute record hash'
    )
  }

  const payload =
    `${previousHash ?? ''}` +
    `${canonicalize(resourceData)}` +
    `${createdAt}`

  return sha256Hex(payload)
}


/**
 * Verifies an ordered medical-record hash chain.
 *
 * Records MUST be sorted:
 *
 * oldest -> newest
 */
export async function verifyChain(records) {
  if (!Array.isArray(records)) {
    return {
      valid: false,
      brokenAtIndex: null,
      reason: 'invalid_records',
    }
  }

  let expectedPreviousHash = null

  for (
    let i = 0;
    i < records.length;
    i++
  ) {
    const record = records[i]

    if (
      record.previous_record_hash !==
      expectedPreviousHash
    ) {
      return {
        valid: false,
        brokenAtIndex: i,
        reason: 'previous_hash_mismatch',
      }
    }

    const recomputed =
      await computeRecordHash({
        previousHash:
          record.previous_record_hash,

        resourceData:
          record.resource_data,

        createdAt:
          record.created_at,
      })

    if (
      recomputed !==
      record.current_record_hash
    ) {
      return {
        valid: false,
        brokenAtIndex: i,
        reason: 'hash_mismatch',
      }
    }

    expectedPreviousHash =
      record.current_record_hash
  }

  return {
    valid: true,
  }
}