/**
 * Thin IndexedDB wrapper for offline-first local storage.
 *
 * This scaffold uses raw IndexedDB rather than pulling in PouchDB yet, so
 * the project builds and runs with zero extra native dependencies out of
 * the gate. When you implement the full sync engine (Request Set B, item
 * 5 — "offline-first sync layer"), you have two paths:
 *
 *   1. Swap this file's internals for PouchDB (`npm install pouchdb-browser`)
 *      if you want built-in replication with a CouchDB backend for free.
 *   2. Keep raw IndexedDB and write the sync loop yourself against
 *      src/lib/syncQueue.js — more code, but no dependency on running a
 *      CouchDB instance, which is often simpler for a college-project
 *      deployment on a single Postgres-backed server.
 *
 * Either way, every other file in the app should only ever call the
 * functions exported here (or from syncQueue.js) — never `indexedDB.*`
 * directly — so that swap is a one-file change.
 */

const DB_NAME = 'health_record_offline'
const DB_VERSION = 1

const STORES = {
  records: 'records', // local copies of medical_records rows, keyed by record_id
  syncQueue: 'sync_queue', // pending writes not yet confirmed by the server
  patientCache: 'patient_cache', // last-known patient profile + critical info, for offline lookup
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORES.records)) {
        db.createObjectStore(STORES.records, { keyPath: 'record_id' })
      }
      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        const store = db.createObjectStore(STORES.syncQueue, {
          keyPath: 'queue_id',
          autoIncrement: true,
        })
        store.createIndex('status', 'status', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.patientCache)) {
        db.createObjectStore(STORES.patientCache, { keyPath: 'patient_id' })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore(storeName, mode, callback) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const result = callback(store)
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
  })
}

export async function putRecord(record) {
  return withStore(STORES.records, 'readwrite', (store) => store.put(record))
}

export async function getRecordsByPatient(patientId) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.records, 'readonly')
    const store = tx.objectStore(STORES.records)
    const results = []
    const cursorReq = store.openCursor()
    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result
      if (!cursor) return resolve(results)
      if (cursor.value.patient_id === patientId) results.push(cursor.value)
      cursor.continue()
    }
    cursorReq.onerror = () => reject(cursorReq.error)
  })
}

export async function cachePatientProfile(profile) {
  return withStore(STORES.patientCache, 'readwrite', (store) => store.put(profile))
}

export async function getCachedPatientProfile(patientId) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.patientCache, 'readonly')
    const req = tx.objectStore(STORES.patientCache).get(patientId)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export { STORES }
