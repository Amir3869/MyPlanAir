// src/utils/memoryStorage.ts
// ═══════════════════════════════════════════════════════════════════════════════
// IndexedDB — Stockage local des photos souvenirs MyTrip
// Photos stockées uniquement sur l'appareil / navigateur utilisateur.
// Aucune donnée n'est envoyée au cloud.
// ═══════════════════════════════════════════════════════════════════════════════

const DB_NAME = 'mytrip-memories';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponible'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error('Erreur ouverture IndexedDB'));
    request.onblocked = () => reject(new Error('Ouverture IndexedDB bloquée'));
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });

const closeDB = (db: IDBDatabase) => {
  try { db.close(); } catch { /* noop */ }
};

const getTxError = (tx: IDBTransaction, fallback: string) =>
  tx.error ?? new Error(fallback);

const photoKey = (tripId: string, photoId: string) => `${tripId}_${photoId}`;

const writeTx = async (
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest,
): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (cb: () => void) => {
      if (settled) return;
      settled = true;
      closeDB(db);
      cb();
    };

    try {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const request = fn(store);

      request.onerror = () => {
        // La transaction remontera l'erreur via tx.onerror/tx.onabort.
      };

      tx.oncomplete = () => finish(resolve);
      tx.onerror = () => finish(() => reject(getTxError(tx, 'Erreur transaction IndexedDB')));
      tx.onabort = () => finish(() => reject(getTxError(tx, 'Transaction IndexedDB annulée')));
    } catch (err) {
      finish(() => reject(err));
    }
  });
};

const readTx = async <T>(
  fn: (store: IDBObjectStore) => IDBRequest,
): Promise<T | null> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    let settled = false;
    let result: T | null = null;

    const finish = (cb: () => void) => {
      if (settled) return;
      settled = true;
      closeDB(db);
      cb();
    };

    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = fn(store);

      request.onsuccess = () => {
        result = (request.result ?? null) as T | null;
      };
      request.onerror = () => {
        // La transaction remontera l'erreur via tx.onerror/tx.onabort.
      };

      tx.oncomplete = () => finish(() => resolve(result));
      tx.onerror = () => finish(() => reject(getTxError(tx, 'Erreur lecture IndexedDB')));
      tx.onabort = () => finish(() => reject(getTxError(tx, 'Lecture IndexedDB annulée')));
    } catch (err) {
      finish(() => reject(err));
    }
  });
};

export const MemoryStorage = {
  async savePhoto(tripId: string, photoId: string, blob: Blob): Promise<void> {
    await writeTx('readwrite', (store) => store.put(blob, photoKey(tripId, photoId)));
  },

  async getPhoto(tripId: string, photoId: string): Promise<Blob | null> {
    return readTx<Blob>((store) => store.get(photoKey(tripId, photoId)));
  },

  async removePhoto(tripId: string, photoId: string): Promise<void> {
    await writeTx('readwrite', (store) => store.delete(photoKey(tripId, photoId)));
  },

  async clearTrip(tripId: string): Promise<void> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (cb: () => void) => {
        if (settled) return;
        settled = true;
        closeDB(db);
        cb();
      };

      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const prefix = `${tripId}_`;
        const cursorReq = store.openCursor();

        cursorReq.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
          if (cursor) {
            const key = String(cursor.key);
            if (key.startsWith(prefix)) cursor.delete();
            cursor.continue();
          }
        };
        cursorReq.onerror = () => {
          // La transaction remontera l'erreur via tx.onerror/tx.onabort.
        };

        tx.oncomplete = () => finish(resolve);
        tx.onerror = () => finish(() => reject(getTxError(tx, 'Erreur purge souvenirs IndexedDB')));
        tx.onabort = () => finish(() => reject(getTxError(tx, 'Purge souvenirs IndexedDB annulée')));
      } catch (err) {
        finish(() => reject(err));
      }
    });
  },

  isAvailable(): boolean {
    try {
      return typeof indexedDB !== 'undefined';
    } catch {
      return false;
    }
  },

  async canOpen(): Promise<boolean> {
    try {
      const db = await openDB();
      closeDB(db);
      return true;
    } catch {
      return false;
    }
  },
};
