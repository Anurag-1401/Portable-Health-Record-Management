import { STORES, openDb } from './offlineDb'

/**
 * Fields that must never be automatically conflict-resolved.
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
 * Add an offline write to the local sync queue.
 */
export async function queueWrite({
  deviceId,
  targetRecordId,
  operation,
  payload,
}) {
  const db = await openDb()

  const entry = {
    device_id: deviceId,
    target_record_id: targetRecordId ?? null,
    operation,
    payload,
    status: 'local_only',
    created_at_client: new Date().toISOString(),
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.syncQueue, 'readwrite')
    const store = tx.objectStore(STORES.syncQueue)

    const req = store.add(entry)

    req.onsuccess = () => {
      db.close()

      resolve({
        ...entry,
        queue_id: req.result,
      })
    }

    req.onerror = () => {
      db.close()
      reject(req.error)
    }

    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/**
 * Process all pending offline writes.
 */
export async function processSyncQueue(apiClient) {
  const db = await openDb()

  try {
    const pending = await getPendingEntries(db)
    const results = []

    // This DB connection is only used for reading the pending entries.
    db.close()

    for (const entry of pending) {
      try {
        const response = await apiClient.syncRecordWrite(entry)

        if (response?.conflict) {
          const fieldName = response.conflict.field_name

          if (isCriticalField(fieldName)) {
            const statusDb = await openDb()

            await updateEntryStatus(
              statusDb,
              entry.queue_id,
              'conflict'
            )

            statusDb.close()

            results.push({
              queue_id: entry.queue_id,
              resolved: false,
              reason: 'critical_conflict',
            })

            continue
          }
        }

        const statusDb = await openDb()

        await updateEntryStatus(
          statusDb,
          entry.queue_id,
          'synced'
        )

        statusDb.close()

        results.push({
          queue_id: entry.queue_id,
          resolved: true,
        })
      } catch (err) {
        results.push({
          queue_id: entry.queue_id,
          resolved: false,
          reason: 'network_error',
          err,
        })
      }
    }

    return results
  } catch (error) {
    // Make sure DB connection doesn't remain open.
    try {
      db.close()
    } catch {
      // Ignore close errors.
    }

    throw error
  }
}

// ---------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------

function getPendingEntries(db) {
  return new Promise((resolve, reject) => {
    try {
      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        reject(
          new Error(
            `IndexedDB object store "${STORES.syncQueue}" does not exist`
          )
        )
        return
      }

      const tx = db.transaction(
        STORES.syncQueue,
        'readonly'
      )

      const store = tx.objectStore(STORES.syncQueue)

      if (!store.indexNames.contains('status')) {
        reject(
          new Error(
            `IndexedDB index "status" does not exist on "${STORES.syncQueue}"`
          )
        )
        return
      }

      const index = store.index('status')
      const req = index.getAll('local_only')

      req.onsuccess = () => {
        resolve(req.result ?? [])
      }

      req.onerror = () => {
        reject(req.error)
      }

      tx.onerror = () => {
        reject(tx.error)
      }
    } catch (error) {
      reject(error)
    }
  })
}

function updateEntryStatus(db, queueId, status) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(
        STORES.syncQueue,
        'readwrite'
      )

      const store = tx.objectStore(STORES.syncQueue)

      const getReq = store.get(queueId)

      getReq.onsuccess = () => {
        const entry = getReq.result

        if (!entry) {
          resolve(null)
          return
        }

        entry.status = status

        if (status === 'synced') {
          entry.synced_at = new Date().toISOString()
        }

        const putReq = store.put(entry)

        putReq.onsuccess = () => {
          resolve(entry)
        }

        putReq.onerror = () => {
          reject(putReq.error)
        }
      }

      getReq.onerror = () => {
        reject(getReq.error)
      }

      tx.onerror = () => {
        reject(tx.error)
      }
    } catch (error) {
      reject(error)
    }
  })
}