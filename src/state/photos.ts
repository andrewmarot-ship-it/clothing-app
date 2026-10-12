/**
 * Garment images live in IndexedDB: localStorage caps out around 5MB, which
 * is only a handful of photos. Every call fails soft (private browsing,
 * storage blocked): the app keeps working, the photo just won't survive a reload.
 */
const DB = 'clothesline'
const STORE = 'photos'

let dbPromise: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return db().then(
    (d) =>
      new Promise((resolve, reject) => {
        const tx = d.transaction(STORE, mode)
        const req = fn(tx.objectStore(STORE))
        tx.oncomplete = () => resolve(req ? req.result : undefined)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      }),
  )
}

export async function putPhoto(key: string, blob: Blob): Promise<boolean> {
  try {
    await run('readwrite', (s) => s.put(blob, key))
    return true
  } catch {
    return false
  }
}

export async function getPhoto(key: string): Promise<Blob | undefined> {
  try {
    const v = await run<unknown>('readonly', (s) => s.get(key))
    return v instanceof Blob ? v : undefined
  } catch {
    return undefined
  }
}

export async function deletePhotos(keys: string[]): Promise<void> {
  if (!keys.length) return
  try {
    await run('readwrite', (s) => {
      for (const k of keys) s.delete(k)
    })
  } catch {
    // Orphaned blobs are harmless; nothing to do.
  }
}
