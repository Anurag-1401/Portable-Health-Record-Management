import {
  STORES,
  openDb,
  putRecord,
} from './offlineDb'

export const CRITICAL_FIELDS = new Set([
  'allergies',
  'chronic_conditions',
  'blood_group',
])

function isCriticalField(fieldName) {
  return CRITICAL_FIELDS.has(fieldName)
}

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
    const tx = db.transaction(
      STORES.syncQueue,
      'readwrite'
    )

    const store =
      tx.objectStore(STORES.syncQueue)

    const request =
      store.add(entry)

    request.onsuccess = () => {
      entry.queue_id = request.result
    }

    tx.oncomplete = () => {
      db.close()
      resolve(entry)
    }

    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }

    tx.onabort = () => {
      db.close()
      reject(
        tx.error ||
        new Error('Failed to queue sync operation')
      )
    }
  })
}


/*
 * =========================================================
 * PROCESS SYNC QUEUE
 * =========================================================
 */
export async function processSyncQueue(apiClient) {
  console.log(
  '🔄 processSyncQueue() CALLED'
)
  const db = await openDb()

  try {
    const pending =
      await getPendingEntries(db)

    db.close()

    const results = []

    for (const entry of pending) {
      try {
        console.log(
          'Syncing queue entry:',
          entry.queue_id
        )

        const response =
          await apiClient.syncRecordWrite(entry)

        /*
         * ================================================
         * CRITICAL CONFLICT
         * ================================================
         */
        if (response?.conflict) {
          const fieldName =
            response.conflict.field_name

          if (isCriticalField(fieldName)) {
            const statusDb =
              await openDb()

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

        /*
         * ================================================
         * SUCCESS
         * ================================================
         */

        const statusDb =
          await openDb()

        await updateEntryStatus(
          statusDb,
          entry.queue_id,
          'synced'
        )

        statusDb.close()

        /*
         * Mark the corresponding local record
         * as SYNCED.
         */
        const localRecordId =
          entry.payload?.local_record_id

        if (localRecordId) {
          await markLocalRecordSynced(
            localRecordId
          )
        }

        results.push({
          queue_id: entry.queue_id,
          resolved: true,
        })

      } catch (err) {
        /*
         * ================================================
         * SYNC FAILED
         * ================================================
         *
         * IMPORTANT:
         *
         * Do NOT mark the queue entry as synced.
         *
         * It remains:
         *
         *     local_only
         *
         * and will be retried the next time
         * processSyncQueue() runs.
         */
        console.error(
          `Sync failed for queue ${entry.queue_id}:`,
          err
        )

        results.push({
          queue_id: entry.queue_id,
          resolved: false,
          reason: 'network_or_server_error',
          err,
        })
      }
    }

    return results

  } catch (error) {
    try {
      db.close()
    } catch {}

    throw error
  }
}


/*
 * =========================================================
 * GET PENDING QUEUE ENTRIES
 * =========================================================
 */
function getPendingEntries(db) {
  return new Promise((resolve, reject) => {
    const tx =
      db.transaction(
        STORES.syncQueue,
        'readonly'
      )

    const store =
      tx.objectStore(STORES.syncQueue)

    const index =
      store.index('status')

    const request =
      index.getAll('local_only')

    request.onsuccess = () => {
      resolve(request.result || [])
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}


/*
 * =========================================================
 * UPDATE QUEUE STATUS
 * =========================================================
 */
function updateEntryStatus(
  db,
  queueId,
  status
) {
  return new Promise((resolve, reject) => {
    const tx =
      db.transaction(
        STORES.syncQueue,
        'readwrite'
      )

    const store =
      tx.objectStore(STORES.syncQueue)

    const request =
      store.get(queueId)

    request.onsuccess = () => {
      const entry = request.result

      if (!entry) {
        reject(
          new Error(
            `Queue entry ${queueId} not found`
          )
        )
        return
      }

      entry.status = status

      if (status === 'synced') {
        entry.synced_at =
          new Date().toISOString()
      }

      store.put(entry)
    }

    request.onerror = () => {
      reject(request.error)
    }

    tx.oncomplete = () => {
      resolve()
    }

    tx.onerror = () => {
      reject(tx.error)
    }
  })
}


/*
 * =========================================================
 * MARK LOCAL RECORD AS SYNCED
 * =========================================================
 */
async function markLocalRecordSynced(
  localRecordId
) {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const tx =
      db.transaction(
        STORES.records,
        'readwrite'
      )

    const store =
      tx.objectStore(STORES.records)

    const request =
      store.get(localRecordId)

    request.onsuccess = () => {
      const record = request.result

      if (!record) {
        return
      }

      record.sync_status = 'SYNCED'

      /*
       * Keep the local record for now.
       * We will reconcile it with the real server
       * record in Step 11.
       */
      record.local_only = false

      store.put(record)
    }

    request.onerror = () => {
      reject(request.error)
    }

    tx.oncomplete = () => {
      db.close()
      resolve()
    }

    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}