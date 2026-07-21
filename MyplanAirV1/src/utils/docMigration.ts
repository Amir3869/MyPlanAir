// src/utils/docMigration.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Migration des documents base64 (localStorage) vers IndexedDB
// Exécuté UNE SEULE FOIS au démarrage de l'app
// Flag : localStorage "mytrip-docs-migrated-v3"
// ═══════════════════════════════════════════════════════════════════════════════

import { DocStorage } from './docStorage';

const MIGRATION_FLAG = 'mytrip-docs-migrated-v3';

/**
 * Convertit une data URL base64 en Blob natif.
 * data:image/png;base64,iVBOR... → Blob(image/png)
 */
const dataUrlToBlob = (dataUrl: string): Blob | null => {
  try {
    const [meta, base64] = dataUrl.split(',');
    if (!meta || !base64) return null;

    // Extraire le MIME type : "data:image/png;base64" → "image/png"
    const mimeMatch = meta.match(/data:([^;]+)/);
    const mime = mimeMatch?.[1] ?? 'application/octet-stream';

    // Décoder le base64 en binaire
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
};

/**
 * Migre les documents base64 du store Zustand vers IndexedDB.
 * À appeler au démarrage de l'app (dans App.tsx).
 *
 * Processus sécurisé :
 * 1. Vérifier le flag de migration
 * 2. Vérifier que IndexedDB peut réellement être ouvert
 * 3. Pour chaque document avec `url` en base64 :
 *    a. Convertir le base64 en Blob
 *    b. Sauvegarder dans IndexedDB avec `await`
 *    c. Supprimer `url` seulement si la sauvegarde a réussi
 * 4. Garder `url` si la sauvegarde échoue, pour éviter toute perte de fichier
 * 5. Poser le flag seulement si aucune migration base64 n'a échoué
 */
export const migrateDocsToIndexedDB = async (): Promise<void> => {
  // Déjà migré ?
  if (localStorage.getItem(MIGRATION_FLAG) === 'done') return;

  // IndexedDB disponible et ouvrable ?
  if (!DocStorage.isAvailable() || !(await DocStorage.canOpen())) {
    console.warn('⚠️ [Migration] IndexedDB non disponible — migration reportée');
    return;
  }

  console.log('🔄 [Migration] Début migration documents base64 → IndexedDB...');

  try {
    // Import dynamique pour éviter les cycles
    const { useTripStore } = await import('../store/tripStore');

    const state = useTripStore.getState();
    const trips = state.trips;
    let migratedCount = 0;
    let errorCount = 0;
    let cleanedCount = 0;
    let changedTrips = 0;
    let hasBlockingFailure = false;

    for (const trip of trips) {
      const docs = trip.documents ?? [];
      let needsUpdate = false;
      const updatedDocs: typeof docs = [];

      for (const doc of docs) {
        const legacyUrl = doc.url;

        // Pas de champ url → rien à migrer.
        if (legacyUrl === undefined) {
          updatedDocs.push(doc);
          continue;
        }

        // Url vide → nettoyage sûr des métadonnées.
        if (legacyUrl.trim() === '') {
          const { url, ...rest } = doc;
          void url;
          updatedDocs.push(rest as typeof doc);
          needsUpdate = true;
          cleanedCount++;
          continue;
        }

        // Url non-base64 : on la conserve par prudence.
        // La migration concerne uniquement les anciennes data URLs.
        if (!legacyUrl.startsWith('data:')) {
          updatedDocs.push(doc);
          continue;
        }

        const blob = dataUrlToBlob(legacyUrl);
        if (!blob) {
          errorCount++;
          hasBlockingFailure = true;
          updatedDocs.push(doc); // On garde le base64 pour retenter plus tard.
          console.warn(`❌ [Migration] Impossible de convertir base64: ${doc.name}`);
          continue;
        }

        try {
          await DocStorage.save(trip.id, doc.id, blob);
          const { url, ...rest } = doc;
          void url;
          updatedDocs.push(rest as typeof doc);
          needsUpdate = true;
          migratedCount++;
          console.log(`✅ [Migration] Doc migré: ${doc.name} (${trip.id})`);
        } catch (err) {
          errorCount++;
          hasBlockingFailure = true;
          updatedDocs.push(doc); // Surtout : ne pas supprimer le base64 si IndexedDB échoue.
          console.warn(`❌ [Migration] Erreur IndexedDB pour ${doc.name}:`, err);
        }
      }

      // Mettre à jour le trip uniquement après les sauvegardes réussies.
      if (needsUpdate) {
        state.updateTrip(trip.id, { documents: updatedDocs });
        changedTrips++;
      }
    }

    if (hasBlockingFailure) {
      console.warn(
        `⚠️ [Migration] Partielle : ${migratedCount} document(s) migré(s), ${errorCount} erreur(s). ` +
        'Le flag final n’est pas posé pour retenter plus tard.',
      );
      return;
    }

    // Poser le flag seulement quand toutes les migrations base64 ont réussi.
    localStorage.setItem(MIGRATION_FLAG, 'done');
    console.log(
      `✅ [Migration] Terminée : ${migratedCount} document(s) migré(s), ` +
      `${cleanedCount} url vide(s) nettoyée(s), ${changedTrips} voyage(s) mis à jour`,
    );
  } catch (err) {
    console.error('❌ [Migration] Erreur critique:', err);
    // Ne pas poser le flag → la migration sera retentée au prochain démarrage.
  }
};
