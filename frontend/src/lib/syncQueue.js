import { STORES } from './offlineDb'

/**
 * Sync queue: every offline write goes here first, gets pushed to the
 * server on reconnect, and is only removed once the server confirms it.
 *
 * This mirrors the `sync_queue` table in the Postgres schema — the client
 * and server sides of the same idea. Fields here should stay in sync with
 * that table's shape (see schema.sql / schema_design_notes.md, section 8).
 *
 * CRITICAL_FIELDS below implements the "manual-flag-for-review on critical
 * fields" rule directly: this is the single source of truth the sync
 * engine consults before deciding whether a conflict can be auto-resolved.
 * Keep it in sync with the `field_criticality` values you actually use
 * server-side.
 */

export const CRITICAL_FIELDS = new Set([
  'allergies',
  'chronic_conditions',
  'blood_group',
])

function isCriticalField(fieldName) {
  return CRITICAL_FIELDS.has(fieldName)
}

/**
 * Queue an offline write. Called from feature code (e.g. a doctor adding
 * an allergy at a clinic with no signal) instead of calling the API
 * directly. Returns the local queue entry so the UI can show "pending sync".
 */
export async function queueWrite({ deviceId, targetRecordId, operation, payload }) {
  const db = await openQueueDb()
  const entry = {
    device_id: deviceId,
    target_record_id: targetRecordId ?? null,
    operation, // 'insert' | 'update'
    payload,
    status: 'local_only',
    created_at_client: new Date().toISOString(),
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.syncQueue, 'readwrite')
    const req = tx.objectStore(STORES.syncQueue).add(entry)
    req.onsuccess = () => resolve({ ...entry, queue_id: req.result })
    req.onerror = () => reject(req.error)
  })
}

/**
 * Called when connectivity returns. Walks the local queue, pushes each
 * entry to the server, and applies the conflict-resolution rule:
 *   - non-critical field, no conflict            -> apply immediately
 *   - non-critical field, conflicting edit exists -> last-write-wins by
 *                                                     created_at_client
 *   - critical field, ANY conflicting edit exists -> do NOT auto-resolve;
 *                                                     create a
 *                                                     conflict_flags row
 *                                                     server-side and
 *                                                     surface it in the
 *                                                     doctor/clinic UI for
 *                                                     manual review
 *
 * `apiClient` is passed in rather than imported, so this function stays
 * easy to unit-test with a mock.
 */
export async function processSyncQueue(apiClient) {
  const db = await openQueueDb()
  const pending = await getPendingEntries(db)
  const results = []

  for (const entry of pending) {
    try {
      const response = await apiClient.syncRecordWrite(entry)

      if (response.conflict) {
        const fieldName = response.conflict.field_name
        if (isCriticalField(fieldName)) {
          // Leave the local entry as 'conflict' — do not overwrite either
          // side. The server has already created a conflict_flags row;
          // the UI (see src/features/doctor/pages) should show a banner
          // pointing the clinic at pending conflicts for this patient.
          await updateEntryStatus(db, entry.queue_id, 'conflict')
          results.push({ queue_id: entry.queue_id, resolved: false, reason: 'critical_conflict' })
          continue
        }
        // Non-critical: server already applied last-write-wins by
        // comparing created_at_client server-side. Just mark synced.
      }

      await updateEntryStatus(db, entry.queue_id, 'synced')
      results.push({ queue_id: entry.queue_id, resolved: true })
    } catch (err) {
      // Network dropped again mid-sync — leave as local_only, retry next
      // time processSyncQueue() runs (e.g. on the next 'online' event).
      results.push({ queue_id: entry.queue_id, resolved: false, reason: 'network_error', err })
    }
  }

  return results
}

// --- internal helpers --------------------------------------------------

function openQueueDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('health_record_offline', 1)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function getPendingEntries(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.syncQueue, 'readonly')
    const index = tx.objectStore(STORES.syncQueue).index('status')
    const req = index.getAll('local_only')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function updateEntryStatus(db, queueId, status) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.syncQueue, 'readwrite')
    const store = tx.objectStore(STORES.syncQueue)
    const getReq = store.get(queueId)
    getReq.onsuccess = () => {
      const entry = getReq.result
      if (!entry) return resolve(null)
      entry.status = status
      entry.synced_at = status === 'synced' ? new Date().toISOString() : entry.synced_at
      const putReq = store.put(entry)
      putReq.onsuccess = () => resolve(entry)
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}
