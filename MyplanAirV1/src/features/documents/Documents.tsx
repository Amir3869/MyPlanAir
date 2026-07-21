// src/features/documents/Documents.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Page Documents — Classeur de voyage intelligent
// Route : /trip/:id/documents (enfant du Cockpit, PAS de header propre)
// V5.2 : IndexedDB au lieu de base64 + Freemium par nombre de documents
//   - Fichiers stockés en binaire natif dans IndexedDB (pas de base64 !)
//   - Quota navigateur : 500 MB → illimité
//   - Phase de test : 10 documents par voyage
//   - Plan Free / Pro définitif à remettre en place plus tard
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X, AlertTriangle, FileUp, FileText, Crown, Camera } from 'lucide-react';
import { useTripContext } from '../cockpit/useTripContext';
import { useTripStore } from '../../store/tripStore';
import { GlassCard } from '../../shared/GlassCard';
import { BottomSheet } from '../../shared/BottomSheet';
import { useToast } from '../../shared/Toast';
import { haptic } from '../../utils/haptic';
import { DocStorage } from '../../utils/docStorage';
import {
  type DocCategory,
  type TripDocument,
  DOC_CATEGORIES,
  FILE_ICONS,
  detectFileType,
  formatFileSize,
  MAX_DOC_SIZE,
  FREE_DOC_LIMIT,
} from '../../store/types';

// ─── Types locaux ───────────────────────────────────────────────────────────

type FilterKey = 'all' | DocCategory;

// ─── Helper : date relative en français ─────────────────────────────────────

const formatDateRelative = (iso: string): string => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.round((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
};

const IMAGE_OPTIMIZE_MAX_EDGE = 2200;
const IMAGE_OPTIMIZE_QUALITY = 0.84;
const IMAGE_OPTIMIZE_MIN_SIZE = 900 * 1024;

const isOptimizableImage = (file: File) => (
  file.type.startsWith('image/')
  && file.type !== 'image/gif'
  && file.type !== 'image/svg+xml'
);

const imageFileNameToJpeg = (name: string) => {
  const base = name.replace(/\.[^.]+$/, '').trim() || 'document-photo';
  return `${base}.jpg`;
};

const loadImage = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    resolve(img);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('image_load_failed'));
  };
  img.src = url;
});

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> => new Promise((resolve) => {
  canvas.toBlob((blob) => resolve(blob), type, quality);
});

const optimizeImageFile = async (file: File): Promise<File> => {
  if (!isOptimizableImage(file) || file.size < IMAGE_OPTIMIZE_MIN_SIZE) return file;

  try {
    const img = await loadImage(file);
    const sourceWidth = img.naturalWidth || img.width;
    const sourceHeight = img.naturalHeight || img.height;
    if (!sourceWidth || !sourceHeight) return file;

    const scale = Math.min(1, IMAGE_OPTIMIZE_MAX_EDGE / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    // Fond blanc volontaire : les documents scannés/photos doivent rester propres,
    // même si la source est un PNG avec transparence.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, 'image/jpeg', IMAGE_OPTIMIZE_QUALITY);
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], imageFileNameToJpeg(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    // Si le navigateur ne sait pas décoder le format source, on garde l’original.
    return file;
  }
};

// ─── Composant : Carte Document ─────────────────────────────────────────────

const DocCard = ({
  doc,
  tripId,
  onDelete,
  onOpen,
  deleting,
  onCancelDelete,
  onConfirmDelete,
}: {
  doc: TripDocument;
  tripId: string;
  onDelete: () => void;
  onOpen: () => void;
  deleting: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) => {
  const catMeta = DOC_CATEGORIES.find((c) => c.key === doc.category) ?? DOC_CATEGORIES[3];
  const fileIcon = FILE_ICONS[doc.fileType] ?? FILE_ICONS.other;
  const isImage = doc.fileType === 'image';

  // Thumbnail chargée depuis IndexedDB (async)
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    DocStorage.get(tripId, doc.id).then((blob) => {
      if (blob && !cancelled) {
        objectUrl = URL.createObjectURL(blob);
        setThumbUrl(objectUrl);
      }
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [tripId, doc.id, isImage]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ type: 'spring', damping: 26 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderLeft: `3px solid ${catMeta.color}`,
      }}
    >
      {/* Corps cliquable → ouvrir le document */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer tap"
        onClick={onOpen}
      >
        {/* Icône / Thumbnail */}
        {isImage ? (
          <div
            className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: fileIcon.bg }}
          >
            {thumbUrl ? (
              <img
                src={thumbUrl}
                alt={doc.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl">{fileIcon.emoji}</span>
            )}
          </div>
        ) : (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: fileIcon.bg }}
          >
            <span className="text-2xl">{fileIcon.emoji}</span>
          </div>
        )}

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold tracking-tight truncate text-white/90">
            {doc.name}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: `${catMeta.color}20`,
                color: catMeta.color,
                border: `1px solid ${catMeta.color}35`,
              }}
            >
              {catMeta.emoji} {catMeta.label}
            </span>
            <span className="text-[11px] text-white/35">
              {formatFileSize(doc.size)}
            </span>
            <span className="text-[11px] text-white/25">
              · {formatDateRelative(doc.createdAt)}
            </span>
          </div>
        </div>

        {/* Bouton supprimer */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-8 h-8 rounded-xl flex items-center justify-center tap flex-shrink-0 transition-colors"
          style={{ background: 'rgba(239,68,68,0.08)' }}
          aria-label="Supprimer le document"
        >
          <Trash2 size={14} style={{ color: 'rgba(239,68,68,0.6)' }} />
        </button>
      </div>

      {/* Confirmation de suppression inline */}
      <AnimatePresence>
        {deleting && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="mx-4 mb-4 p-3 rounded-xl"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={13} style={{ color: '#ef4444' }} />
                <span className="text-xs font-semibold text-red-400">
                  Supprimer ce document ?
                </span>
              </div>
              <p className="text-[11px] text-white/40 mb-3">
                Cette action est irréversible.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={onCancelDelete}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold tap"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={onConfirmDelete}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold tap text-white"
                  style={{
                    background: 'rgba(239,68,68,0.2)',
                    border: '1px solid rgba(239,68,68,0.35)',
                  }}
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Composant : Barre de compteur (freemium) ──────────────────────────────

const CountBar = ({ count, totalSize }: { count: number; totalSize: number }) => {
  const pct = Math.min(100, Math.round((count / FREE_DOC_LIMIT) * 100));
  const isLimit = count >= FREE_DOC_LIMIT;
  const barColor = isLimit ? '#ef4444' : pct > 66 ? '#f0b24a' : 'var(--accent-from)';

  if (count === 0) return null;

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/45 font-medium">
          📄 {count}/{FREE_DOC_LIMIT} documents
        </span>
        <span className="text-xs font-semibold" style={{ color: barColor }}>
          {formatFileSize(totalSize)} au total
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${barColor}, ${isLimit ? '#ec4899' : 'var(--accent-to)'})`,
            boxShadow: `0 0 8px ${barColor}40`,
          }}
        />
      </div>
      {isLimit && (
        <div className="flex items-center gap-2 mt-3">
          <Crown size={13} style={{ color: '#f0b24a' }} />
          <span className="text-[11px] text-white/40">
            Limite atteinte — <span style={{ color: '#f0b24a' }}>Passe Pro</span> pour des documents illimités
          </span>
        </div>
      )}
    </GlassCard>
  );
};

// ─── Composant : Alerte taille dépassée ─────────────────────────────────────

const SizeAlert = ({ fileName, size, onClose }: { fileName: string; size: number; onClose: () => void }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative glass-strong rounded-[24px] p-6 max-w-sm w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.12)' }}
        >
          <AlertTriangle size={24} style={{ color: '#ef4444' }} />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold tracking-tight">Fichier trop volumineux</h3>
        </div>
      </div>
      <p className="text-sm text-white/60 mb-2 leading-relaxed">
        <span className="font-semibold text-white/80">{fileName}</span>{' '}
        ({formatFileSize(size)}) dépasse la limite de {formatFileSize(MAX_DOC_SIZE)}.
      </p>
      <p className="text-xs text-white/35 mb-5">
        Astuce : Compresse le fichier ou choisis un format plus léger (JPEG au lieu de PNG).
      </p>
      <button
        onClick={onClose}
        className="w-full py-3 rounded-2xl font-semibold text-white tap"
        style={{
          background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
        }}
      >
        Compris
      </button>
    </motion.div>
  </div>
);

// ─── Composant : Modal Freemium (limite atteinte) ──────────────────────────

const PremiumModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="relative glass-strong rounded-[24px] p-6 max-w-sm w-full text-center"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Icône couronne */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{
          background: 'linear-gradient(135deg, #f0b24a, #ec4899)',
          boxShadow: '0 8px 32px rgba(240,178,74,0.3)',
        }}
      >
        <Crown size={32} className="text-white" />
      </div>

      <h3 className="font-display text-xl font-bold tracking-tight mb-2">
        Limite atteinte
      </h3>
      <p className="text-sm text-white/55 leading-relaxed mb-1">
        {FREE_DOC_LIMIT} documents par voyage en version gratuite.
      </p>
      <p className="text-sm text-white/40 leading-relaxed mb-6">
        Passe au plan <span className="font-semibold" style={{ color: '#f0b24a' }}>Pro</span> pour
        des documents illimités et bien plus encore.
      </p>

      {/* Bouton Pro */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        className="w-full h-12 rounded-2xl font-semibold text-white inline-flex items-center justify-center gap-2 mb-3"
        style={{
          background: 'linear-gradient(135deg, #f0b24a, #ec4899)',
          boxShadow: '0 8px 32px rgba(240,178,74,0.3)',
        }}
      >
        <Crown size={16} /> Passer Pro — Bientôt
      </motion.button>

      <button
        onClick={onClose}
        className="w-full py-3 rounded-2xl font-semibold text-sm tap"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        Rester en gratuit
      </button>
    </motion.div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE DOCUMENTS — PRINCIPAL (pas de header, rendu dans le cockpit)
// ═══════════════════════════════════════════════════════════════════════════════

export const Documents = () => {
  const { trip } = useTripContext();
  const { success, error } = useToast();

  // ── Store ──────────────────────────────────────────────────────────────
  const addDocument    = useTripStore((s) => s.addDocument);
  const removeDocument = useTripStore((s) => s.removeDocument);

  // ── State ──────────────────────────────────────────────────────────────
  const [filter, setFilter]               = useState<FilterKey>('all');
  const [sheetOpen, setSheetOpen]         = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DocCategory>('ticket');
  const [docName, setDocName]             = useState('');
  const [selectedFile, setSelectedFile]   = useState<File | null>(null);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [sizeAlert, setSizeAlert]         = useState<{ name: string; size: number } | null>(null);
  const [premiumModal, setPremiumModal]   = useState(false);
  const [adding, setAdding]               = useState(false);
  const fileInputRef                      = useRef<HTMLInputElement>(null);
  const cameraInputRef                    = useRef<HTMLInputElement>(null);

  // ✅ V5.1 — Quick Add : input caché dédié + catégorie mémorisée
  const quickAddCategory                  = useRef<DocCategory>('ticket');
  const quickAddInputRef                  = useRef<HTMLInputElement>(null);

  // ── Données dérivées ───────────────────────────────────────────────────
  const documents = trip.documents ?? [];

  const filteredDocs = useMemo(() => {
    if (filter === 'all') return documents;
    return documents.filter((d) => d.category === filter);
  }, [documents, filter]);

  const groupedDocs = useMemo(() => {
    const groups: Record<string, TripDocument[]> = {};
    DOC_CATEGORIES.forEach((cat) => { groups[cat.key] = []; });
    filteredDocs.forEach((d) => {
      const cat = d.category ?? 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(d);
    });
    return groups;
  }, [filteredDocs]);

  const totalSize = useMemo(
    () => documents.reduce((sum, d) => sum + (d.size ?? 0), 0),
    [documents],
  );

  const docCount = documents.length;
  const isAtLimit = docCount >= FREE_DOC_LIMIT;

  // ── Compteurs pour les filtres ─────────────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: documents.length };
    DOC_CATEGORIES.forEach((cat) => {
      c[cat.key] = documents.filter((d) => d.category === cat.key).length;
    });
    return c;
  }, [documents]);

  // ── Helpers ────────────────────────────────────────────────────────────

  const openAddSheet = (prefillCategory?: DocCategory) => {
    if (isAtLimit) {
      haptic([5, 20, 5]);
      setPremiumModal(true);
      return;
    }
    setSelectedCategory(prefillCategory ?? 'ticket');
    setDocName('');
    setSelectedFile(null);
    setSheetOpen(true);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleCameraSelect = () => {
    cameraInputRef.current?.click();
  };

  const applyPickedFile = async (file: File, fallbackName?: string) => {
    const preparedFile = await optimizeImageFile(file);

    if (preparedFile.size > MAX_DOC_SIZE) {
      setSizeAlert({ name: preparedFile.name, size: preparedFile.size });
      return;
    }

    setSelectedFile(preparedFile);
    if (!docName.trim()) {
      const nameWithoutExt = preparedFile.name.replace(/\.[^.]+$/, '');
      setDocName(fallbackName ?? nameWithoutExt);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await applyPickedFile(file);
  };

  const handleCameraFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const dateLabel = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    await applyPickedFile(file, `Photo document — ${dateLabel}`);
  };

  // ── Ajout via bottom sheet ────────────────────────────────────────────

  const handleAddDocument = async () => {
    if (!trip || !selectedFile) return;

    if (selectedFile.size > MAX_DOC_SIZE) {
      setSizeAlert({ name: selectedFile.name, size: selectedFile.size });
      return;
    }

    if (documents.length >= FREE_DOC_LIMIT) {
      haptic([5, 20, 5]);
      setPremiumModal(true);
      return;
    }

    haptic([5, 20, 5]);
    setAdding(true);

    try {
      const docId = crypto.randomUUID();

      // Sauvegarder le fichier en binaire dans IndexedDB
      await DocStorage.save(trip.id, docId, selectedFile);

      // Ajouter uniquement les métadonnées au store Zustand
      const newDoc: TripDocument = {
        id:        docId,
        name:      docName.trim() || selectedFile.name,
        category:  selectedCategory,
        size:      selectedFile.size,
        fileType:  detectFileType(selectedFile.name),
        createdAt: new Date().toISOString(),
      };

      addDocument(trip.id, newDoc);
      setSheetOpen(false);
      success('✅ Document ajouté');
    } catch {
      error('Impossible d’ajouter ce document.');
    } finally {
      setAdding(false);
    }
  };

  // ── Quick Add : tap pill → ouvre DIRECTEMENT le sélecteur de fichier ──

  const handleQuickAdd = (category: DocCategory) => {
    if (isAtLimit) {
      haptic([5, 20, 5]);
      setPremiumModal(true);
      return;
    }
    quickAddCategory.current = category;
    quickAddInputRef.current?.click();
  };

  const handleQuickAddFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !trip) return;

    const preparedFile = await optimizeImageFile(file);

    // Vérification taille après optimisation image éventuelle
    if (preparedFile.size > MAX_DOC_SIZE) {
      setSizeAlert({ name: preparedFile.name, size: preparedFile.size });
      e.target.value = '';
      return;
    }

    // Vérification limite freemium
    if (documents.length >= FREE_DOC_LIMIT) {
      haptic([5, 20, 5]);
      setPremiumModal(true);
      e.target.value = '';
      return;
    }

    haptic([5, 20, 5]);

    const docId = crypto.randomUUID();
    const category = quickAddCategory.current;

    try {
      // Sauvegarder en binaire dans IndexedDB
      await DocStorage.save(trip.id, docId, preparedFile);

      // Métadonnées dans le store
      const newDoc: TripDocument = {
        id:        docId,
        name:      preparedFile.name.replace(/\.[^.]+$/, ''),
        category,
        size:      preparedFile.size,
        fileType:  detectFileType(preparedFile.name),
        createdAt: new Date().toISOString(),
      };

      addDocument(trip.id, newDoc);
      success('✅ Document ajouté');
    } catch {
      error('Impossible d’ajouter ce document.');
    }

    e.target.value = '';
  };

  // ── Suppression ───────────────────────────────────────────────────────

  const handleDelete = async (docId: string) => {
    if (!trip) return;
    haptic([5, 20, 5]);

    // Supprimer le fichier d'IndexedDB
    try {
      await DocStorage.remove(trip.id, docId);
    } catch {
      // Même si IndexedDB échoue, on supprime les métadonnées
    }

    // Supprimer les métadonnées du store
    removeDocument(trip.id, docId);
    setDeletingId(null);
    success('🗑️ Document supprimé');
  };

  // ── Ouvrir un document ────────────────────────────────────────────────

  const handleOpenDoc = async (doc: TripDocument) => {
    if (!trip) return;

    const win = window.open('', '_blank');

    // Legacy : doc.url contient encore du base64 (migration pas encore faite)
    if (doc.url && doc.url.startsWith('data:')) {
      if (win) win.location.href = doc.url;
      else window.open(doc.url, '_blank');
      return;
    }

    // Nouveau : récupérer le Blob depuis IndexedDB
    try {
      const blob = await DocStorage.get(trip.id, doc.id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        if (win) win.location.href = url;
        else window.open(url, '_blank');
        // Révoquer l'URL après 60s (laisse le temps au navigateur d'ouvrir l'onglet)
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        win?.close();
        error('Fichier introuvable sur cet appareil.');
      }
    } catch {
      win?.close();
      error('Impossible d’ouvrir ce document.');
    }
  };

  // ── Rendu ──────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* ── Titre de section + Bouton Ajouter (conditionnel) ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText size={18} style={{ color: 'var(--accent-label)' }} />
            <span className="font-display text-xl font-bold tracking-tighter">Documents</span>
          </div>
          <div className="text-sm text-white/50 mt-0.5">
            {docCount > 0
              ? `${docCount} fichier${docCount > 1 ? 's' : ''} · ${formatFileSize(totalSize)}`
              : 'Ajoute tes billets, réservations, visas'}
          </div>
        </div>
        {/* Bouton "+" visible UNIQUEMENT si au moins 1 document */}
        {docCount > 0 && (
          <button
            onClick={() => openAddSheet()}
            className="glass-strong pill px-3 py-2 flex items-center gap-1.5 tap text-xs font-semibold"
            style={{
              background: 'rgba(var(--accent-from-rgb), 0.12)',
              border: '1px solid rgba(var(--accent-from-rgb), 0.25)',
              color: 'var(--accent-label)',
            }}
            aria-label="Ajouter un document"
          >
            <Plus size={14} /> Ajouter
          </button>
        )}
      </div>

      {/* Filtres catégories */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setFilter('all')}
          className="pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap tap transition-all"
          style={{
            background: filter === 'all'
              ? 'rgba(var(--accent-from-rgb), 0.18)'
              : 'rgba(255,255,255,0.04)',
            border: filter === 'all'
              ? '1px solid rgba(var(--accent-from-rgb), 0.35)'
              : '1px solid rgba(255,255,255,0.08)',
            color: filter === 'all' ? 'var(--accent-label)' : 'rgba(255,255,255,0.55)',
          }}
        >
          📋 Tous{counts.all > 0 ? ` · ${counts.all}` : ''}
        </button>
        {DOC_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className="pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap tap transition-all"
            style={{
              background: filter === cat.key
                ? `${cat.color}25`
                : 'rgba(255,255,255,0.04)',
              border: filter === cat.key
                ? `1px solid ${cat.color}55`
                : '1px solid rgba(255,255,255,0.08)',
              color: filter === cat.key ? cat.color : 'rgba(255,255,255,0.55)',
            }}
          >
            {cat.emoji} {cat.label}{(counts[cat.key] ?? 0) > 0 ? ` · ${counts[cat.key]}` : ''}
          </button>
        ))}
      </div>

      {/* État vide global */}
      {docCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard className="p-10 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="font-display text-xl font-bold tracking-tight mb-2">
              Aucun document pour ce voyage
            </h3>
            <p className="text-white/50 text-sm mb-6 leading-relaxed">
              Ajoute tes billets, réservations,<br />
              visas et justificatifs
            </p>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => openAddSheet()}
              className="h-12 px-6 rounded-2xl font-semibold text-white inline-flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
                boxShadow: '0 6px 24px rgba(var(--accent-from-rgb), 0.35)',
              }}
            >
              <Plus size={16} /> Ajouter un document
            </motion.button>

            {/* Quick Add pills : tap → ouvre DIRECTEMENT le sélecteur de fichier */}
            <div className="flex items-center justify-center gap-2 mt-5">
              {DOC_CATEGORIES.slice(0, 4).map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => handleQuickAdd(cat.key)}
                  className="pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium tap"
                  style={{
                    background: `${cat.color}15`,
                    border: `1px solid ${cat.color}30`,
                    color: cat.color,
                  }}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* État vide filtre catégorie */}
      {docCount > 0 && filteredDocs.length === 0 && filter !== 'all' && (() => {
        const cat = DOC_CATEGORIES.find((item) => item.key === filter);
        if (!cat) return null;
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <GlassCard className="p-7 text-center">
              <div className="text-4xl mb-3">{cat.emoji}</div>
              <h3 className="font-display text-xl font-bold tracking-tight mb-2">
                Aucun {cat.label.toLowerCase()}
              </h3>
              <p className="text-sm text-white/50 leading-relaxed mb-5">
                Ajoute un document dans cette catégorie pour le retrouver rapidement pendant ton voyage.
              </p>
              <button
                onClick={() => openAddSheet(cat.key)}
                className="h-11 px-5 rounded-2xl font-semibold text-sm tap inline-flex items-center gap-2"
                style={{ background: `${cat.color}18`, border: `1px solid ${cat.color}35`, color: cat.color }}
              >
                <Plus size={14} /> Ajouter {cat.label.toLowerCase()}
              </button>
            </GlassCard>
          </motion.div>
        );
      })()}

      {/* Documents groupés par catégorie */}
      {docCount > 0 && (
        <div className="space-y-5">
          {DOC_CATEGORIES.map((cat) => {
            const catDocs = groupedDocs[cat.key];
            if (filter !== 'all' && filter !== cat.key) return null;
            if (catDocs.length === 0 && filter === 'all') {
              return (
                <div key={cat.key}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-sm">{cat.emoji}</span>
                    <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                      {cat.label}
                    </span>
                    <span className="text-xs text-white/25">0 fichier</span>
                  </div>
                  <GlassCard className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/30">
                        {cat.emoji} Aucun{cat.key === 'visa' ? ' visa' : ''} {cat.label.toLowerCase()} ajouté
                      </span>
                      <button
                        onClick={() => openAddSheet(cat.key)}
                        className="text-xs font-semibold tap flex items-center gap-1"
                        style={{ color: cat.color }}
                      >
                        <Plus size={12} /> Ajouter
                      </button>
                    </div>
                  </GlassCard>
                </div>
              );
            }
            if (catDocs.length === 0) return null;

            return (
              <div key={cat.key}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-sm">{cat.emoji}</span>
                  <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                    {cat.label}
                  </span>
                  <span className="text-xs text-white/25">
                    {catDocs.length} fichier{catDocs.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {catDocs.map((doc) => (
                      <DocCard
                        key={doc.id}
                        doc={doc}
                        tripId={trip.id}
                        onDelete={() => setDeletingId(doc.id)}
                        onOpen={() => handleOpenDoc(doc)}
                        deleting={deletingId === doc.id}
                        onCancelDelete={() => setDeletingId(null)}
                        onConfirmDelete={() => handleDelete(doc.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Barre de compteur freemium */}
      <CountBar count={docCount} totalSize={totalSize} />

      {/* ── Bottom Sheet : Ajouter un document ── */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="📄 Ajouter un document"
      >
        <div className="space-y-5">
          <p className="text-sm text-white/50">
            Choisis un fichier et une catégorie
          </p>

          {/* Accent line */}
          <div
            className="h-[2px] rounded-full"
            style={{
              background: 'linear-gradient(90deg, var(--accent-from), var(--accent-to))',
              opacity: 0.5,
            }}
          />

          {/* Catégorie selector */}
          <div>
            <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
              Catégorie
            </div>
            <div className="flex gap-2 flex-wrap">
              {DOC_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className="pill px-3 py-2 flex items-center gap-1.5 text-xs font-semibold tap transition-all"
                    style={{
                      background: active ? `${cat.color}25` : 'rgba(255,255,255,0.04)',
                      border: active ? `1px solid ${cat.color}55` : '1px solid rgba(255,255,255,0.08)',
                      color: active ? cat.color : 'rgba(255,255,255,0.55)',
                      boxShadow: active ? `0 0 12px ${cat.color}30` : 'none',
                    }}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nom du document */}
          <div>
            <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
              Nom du document
            </div>
            <div className="relative">
              <input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Nom du fichier..."
                className="w-full rounded-xl px-4 py-3 bg-transparent outline-none text-sm font-medium"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
              {docName && (
                <button
                  onClick={() => setDocName('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  aria-label="Effacer"
                >
                  <X size={12} className="text-white/40" />
                </button>
              )}
            </div>
          </div>

          {/* Sélecteur de fichier / appareil photo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleFileSelect}
              className="w-full p-4 rounded-xl text-left flex items-center gap-3 tap"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderStyle: 'dashed',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(var(--accent-from-rgb), 0.12)' }}
              >
                <FileUp size={18} style={{ color: 'var(--accent-label)' }} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--accent-label)' }}>
                  Choisir un fichier
                </div>
                <div className="text-[11px] text-white/35">
                  PDF, images, documents · {formatFileSize(MAX_DOC_SIZE)} max
                </div>
              </div>
            </button>

            <button
              onClick={handleCameraSelect}
              className="w-full p-4 rounded-xl text-left flex items-center gap-3 tap"
              style={{
                background: 'rgba(var(--accent-from-rgb), 0.08)',
                border: '1px solid rgba(var(--accent-from-rgb), 0.22)',
                borderStyle: 'dashed',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
              >
                <Camera size={18} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--accent-label)' }}>
                  Prendre une photo
                </div>
                <div className="text-[11px] text-white/35">
                  Appareil photo du téléphone
                </div>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraFileChange}
              className="hidden"
            />
          </div>

          {/* Fichier sélectionné */}
          <AnimatePresence>
            {selectedFile && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl p-3 flex items-center gap-3"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <span className="text-xl">
                  {FILE_ICONS[detectFileType(selectedFile.name)]?.emoji ?? '📄'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{selectedFile.name}</div>
                  <div className="text-[11px] text-white/35">
                    {formatFileSize(selectedFile.size)}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setDocName('');
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  aria-label="Retirer le fichier"
                >
                  <X size={12} className="text-white/40" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bouton Ajouter */}
          <button
            onClick={handleAddDocument}
            disabled={!selectedFile || adding}
            className="w-full h-12 rounded-2xl font-semibold text-white tap flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
            style={{
              background: selectedFile
                ? 'linear-gradient(135deg, var(--accent-from), var(--accent-to))'
                : 'rgba(255,255,255,0.06)',
            }}
          >
            {adding ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
                Ajout en cours...
              </>
            ) : (
              <>
                <Plus size={16} /> Ajouter le document
              </>
            )}
          </button>
        </div>
      </BottomSheet>

      {/* ── Alerte taille dépassée ── */}
      <AnimatePresence>
        {sizeAlert && (
          <SizeAlert
            fileName={sizeAlert.name}
            size={sizeAlert.size}
            onClose={() => setSizeAlert(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Modal Freemium (limite atteinte) ── */}
      <AnimatePresence>
        {premiumModal && (
          <PremiumModal onClose={() => setPremiumModal(false)} />
        )}
      </AnimatePresence>

      {/* ── Input caché pour Quick Add (pills empty state) ── */}
      <input
        ref={quickAddInputRef}
        type="file"
        accept="*/*"
        onChange={handleQuickAddFileChange}
        className="hidden"
      />
    </motion.div>
  );
};
