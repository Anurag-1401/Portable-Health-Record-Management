/**
 * Client-side hash-chain helpers, mirroring the server-side chain described
 * in schema_design_notes.md (section 5). Records are created offline, so
 * the hash has to be computable on-device with only the Web Crypto API —
 * no server round-trip required to produce a valid chained record.
 *
 * Chain formula (must match server-side verification exactly):
 *   current_hash = SHA256(previous_hash + canonicalize(resource_data) + created_at)
 *
 * "blockchain-inspired, not a blockchain": this is a per-patient linked
 * list of hashes, not a distributed ledger. It proves a record wasn't
 * silently altered after creation; it does not provide consensus across
 * multiple untrusted parties. Say this explicitly in your report — it's a
 * more honest and more defensible claim than "blockchain-based."
 */

async function sha256Hex(message) {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Deterministic JSON stringify — object key order must not affect the
 * hash, otherwise the same logical record could hash differently on two
 * devices. Sorts keys recursively before stringifying.
 */
function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  const sortedKeys = Object.keys(value).sort()
  const parts = sortedKeys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`)
  return `{${parts.join(',')}}`
}

/**
 * Computes the hash for a new record given the previous record's hash
 * (null for a patient's very first record).
 */
export async function computeRecordHash({ previousHash, resourceData, createdAt }) {
  const payload = `${previousHash ?? ''}${canonicalize(resourceData)}${createdAt}`
  return sha256Hex(payload)
}

/**
 * Verifies a full ordered chain of records for one patient. Returns
 * { valid: true } or { valid: false, brokenAtIndex } so the UI can flag
 * exactly where tampering (or a bug) was detected.
 */
export async function verifyChain(records) {
  // records must already be sorted oldest -> newest
  let expectedPreviousHash = null
  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    if (record.previous_record_hash !== expectedPreviousHash) {
      return { valid: false, brokenAtIndex: i, reason: 'previous_hash_mismatch' }
    }
    const recomputed = await computeRecordHash({
      previousHash: record.previous_record_hash,
      resourceData: record.resource_data,
      createdAt: record.created_at,
    })
    if (recomputed !== record.current_record_hash) {
      return { valid: false, brokenAtIndex: i, reason: 'hash_mismatch' }
    }
    expectedPreviousHash = record.current_record_hash
  }
  return { valid: true }
}
