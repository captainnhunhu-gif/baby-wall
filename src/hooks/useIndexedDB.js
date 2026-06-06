const DB_NAME = 'BabyWallDB';
const DB_VERSION = 3; // bumped to add goodnight-voices store
const STORES = ['photos', 'voices', 'custom-songs', 'goodnight-voices'];

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      STORES.forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store);
        }
      });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => {
      dbPromise = null;
      reject(e.target.error);
    };
  });
  return dbPromise;
}

export async function saveBlob(storeName, id, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

export async function getBlob(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = (e) => resolve(e.target.result || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function deleteBlob(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}
