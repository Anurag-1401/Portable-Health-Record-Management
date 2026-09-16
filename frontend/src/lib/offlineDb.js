/**
 * Thin IndexedDB wrapper for offline-first local storage.
 */

const DB_NAME = 'health_record_offline'
const DB_VERSION = 4

const STORES = {
  records: 'records',
  syncQueue: 'sync_queue',
  patientCache: 'patient_cache',
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (event) => {
  const db = event.target.result
  const transaction = event.target.transaction

  console.log(
    'IndexedDB upgrade:',
    event.oldVersion,
    '→',
    event.newVersion
  )

  /*
   * ============================================
   * RECORDS
   * ============================================
   */
  if (!db.objectStoreNames.contains(STORES.records)) {
    console.log('Creating records store')

    db.createObjectStore(STORES.records, {
      keyPath: 'record_id',
    })
  }

  /*
   * ============================================
   * SYNC QUEUE
   * ============================================
   */
  if (!db.objectStoreNames.contains(STORES.syncQueue)) {
    console.log('Creating sync_queue store')

    const store =
      db.createObjectStore(
        STORES.syncQueue,
        {
          keyPath: 'queue_id',
          autoIncrement: true,
        }
      )

    store.createIndex(
      'status',
      'status',
      {
        unique: false,
      }
    )
  } else {
    const store =
      transaction.objectStore(
        STORES.syncQueue
      )

    if (
      !store.indexNames.contains('status')
    ) {
      console.log(
        'Creating sync_queue.status index'
      )

      store.createIndex(
        'status',
        'status',
        {
          unique: false,
        }
      )
    }
  }

  /*
   * ============================================
   * PATIENT CACHE
   * ============================================
   */
  if (
    !db.objectStoreNames.contains(
      STORES.patientCache
    )
  ) {
    console.log(
      'Creating patient_cache store'
    )

    db.createObjectStore(
      STORES.patientCache,
      {
        keyPath: 'patient_id',
      }
    )
  }
}
    req.onsuccess = () => {
      const db = req.result

      // If another tab upgrades the DB, close this connection.
      db.onversionchange = () => {
        db.close()
      }

      resolve(db)
    }

    req.onerror = () => {
      reject(req.error)
    }
  })
}

async function withStore(storeName, mode, callback) {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    let result

    try {
      const tx = db.transaction(storeName, mode)
      const store = tx.objectStore(storeName)

      result = callback(store)

      tx.oncomplete = () => {
        db.close()
        resolve(result)
      }

      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }

      tx.onabort = () => {
        db.close()
        reject(tx.error || new Error('IndexedDB transaction aborted'))
      }
    } catch (error) {
      db.close()
      reject(error)
    }
  })
}

export async function putRecord(record) {
  return withStore(STORES.records, 'readwrite', (store) =>
    store.put(record)
  )
}

export async function getRecordsByPatient(patientId) {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.records, 'readonly')
    const store = tx.objectStore(STORES.records)
    const results = []

    const cursorReq = store.openCursor()

    cursorReq.onsuccess = (event) => {
      const cursor = event.target.result

      if (!cursor) {
        db.close()
        resolve(results)
        return
      }

      if (cursor.value.health_id === patientId) {
        results.push(cursor.value) 
      }

      cursor.continue()
    }

    cursorReq.onerror = () => {
      db.close()
      reject(cursorReq.error)
    }
  })
}

export async function cachePatientProfile(profile) {
  return withStore(STORES.patientCache, 'readwrite', (store) =>
    store.put(profile)
  )
}

export async function getCachedPatientProfile(patientId) {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.patientCache, 'readonly')
    const req = tx.objectStore(STORES.patientCache).get(patientId)

    req.onsuccess = () => {
      db.close()
      resolve(req.result ?? null)
    }

    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

export { STORES, openDb }