// src/utils/docStorage.ts
// ═══════════════════════════════════════════════════════════════════════════════
// IndexedDB — Stockage binaire des documents de voyage
// Avantages vs base64 localStorage :
//   - Pas de base64 (+33% overhead) → stockage binaire natif
//   - Quota navigateur : 500 MB → illimité (vs 5-10 MB localStorage)
//   - Performance : Blob natif, pas de string géante
//   - Freemium : on bloque par NOMBRE de documents, pas par taille
// ═══════════════════════════════════════════════════════════════════════════════

const DB_NAME    = 'mytrip-docs';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

// ─── Ouvrir la base IndexedDB ───────────────────────────────────────────────

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
        db.createObjectStore(STORE_NAME); // clé = tripId_docId
      }
    };
  });

const closeDB = (db: IDBDatabase) => {
  try { db.close(); } catch { /* noop */ }
};

const getTxError = (tx: IDBTransaction, fallback: string) =>
  tx.error ?? new Error(fallback);

// ─── Helpers privés ─────────────────────────────────────────────────────────

/** Clé de stockage pour un document */
const docKey = (tripId: string, docId: string) => `${tripId}_${docId}`;

/** Exécuter une transaction d'écriture robuste */
const writeTx = async (
  storeName: string,
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
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = fn(store);

      request.onerror = () => {
        // La transaction sera normalement abort/error ensuite : on laisse tx gérer
        // pour garder une source d'erreur cohérente.
      };

      tx.oncomplete = () => finish(resolve);
      tx.onerror = () => finish(() => reject(getTxError(tx, 'Erreur transaction IndexedDB')));
      tx.onabort = () => finish(() => reject(getTxError(tx, 'Transaction IndexedDB annulée')));
    } catch (err) {
      finish(() => reject(err));
    }
  });
};

/** Exécuter une transaction de lecture robuste et retourner le résultat */
const readTx = async <T>(
  storeName: string,
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
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
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

// ═══════════════════════════════════════════════════════════════════════════════
// API PUBLIQUE
// ═══════════════════════════════════════════════════════════════════════════════

export const DocStorage = {
  /**
   * Sauvegarder un fichier (Blob ou File) dans IndexedDB.
   * Le fichier est stocké en binaire natif — pas de base64 !
   */
  async save(tripId: string, docId: string, blob: Blob): Promise<void> {
    await writeTx(STORE_NAME, 'readwrite', (store) =>
      store.put(blob, docKey(tripId, docId))
    );
  },

  /**
   * Récupérer un fichier depuis IndexedDB.
   * Retourne un Blob natif (pour URL.createObjectURL ou autre).
   */
  async get(tripId: string, docId: string): Promise<Blob | null> {
    return readTx<Blob>(STORE_NAME, (store) =>
      store.get(docKey(tripId, docId))
    );
  },

  /**
   * Supprimer un fichier d'IndexedDB.
   */
  async remove(tripId: string, docId: string): Promise<void> {
    await writeTx(STORE_NAME, 'readwrite', (store) =>
      store.delete(docKey(tripId, docId))
    );
  },

  /**
   * Supprimer TOUS les fichiers d'un voyage (quand le voyage est supprimé).
   * Itère sur toutes les clés commençant par `tripId_`.
   */
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
            if (key.startsWith(prefix)) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
        cursorReq.onerror = () => {
          // La transaction remontera l'erreur via tx.onerror/tx.onabort.
        };

        tx.oncomplete = () => finish(resolve);
        tx.onerror = () => finish(() => reject(getTxError(tx, 'Erreur purge documents IndexedDB')));
        tx.onabort = () => finish(() => reject(getTxError(tx, 'Purge documents IndexedDB annulée')));
      } catch (err) {
        finish(() => reject(err));
      }
    });
  },

  /**
   * Vérifier rapidement si IndexedDB existe (certains modes privés peuvent encore bloquer à l'ouverture).
   */
  isAvailable(): boolean {
    try {
      return typeof indexedDB !== 'undefined';
    } catch {
      return false;
    }
  },

  /**
   * Vérifier réellement que la base peut être ouverte.
   * Utile pour les migrations avant de modifier le store persistant.
   */
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
