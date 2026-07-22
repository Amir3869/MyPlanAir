import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, RotateCcw, X } from 'lucide-react';
import { haptic } from '../utils/haptic';

const PREVIEW_SIZE = 240;
const OUTPUT_SIZE = 512;
const JPEG_QUALITY = 0.88;

type Offset = { x: number; y: number };

type ImageCropSheetProps = {
  open: boolean;
  imageUrl: string | null;
  onClose: () => void;
  onConfirm: (croppedDataUrl: string) => void;
  title?: string;
};

const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('image_load_failed'));
  img.src = src;
});

export const ImageCropSheet = ({
  open,
  imageUrl,
  onClose,
  onConfirm,
  title = 'Ajuster ta photo',
}: ImageCropSheetProps) => {
  const [zoom, setZoom] = useState(1.08);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; offset: Offset } | null>(null);

  useEffect(() => {
    if (!open) return;
    setZoom(1.08);
    setOffset({ x: 0, y: 0 });
  }, [open, imageUrl]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const reset = () => {
    haptic(4);
    setZoom(1.08);
    setOffset({ x: 0, y: 0 });
  };

  const confirm = async () => {
    if (!imageUrl) return;
    haptic([6, 18, 6]);

    try {
      const img = await loadImage(imageUrl);
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const sourceWidth = img.naturalWidth || img.width;
      const sourceHeight = img.naturalHeight || img.height;
      const baseScale = Math.max(PREVIEW_SIZE / sourceWidth, PREVIEW_SIZE / sourceHeight);
      const drawWidthPreview = sourceWidth * baseScale * zoom;
      const drawHeightPreview = sourceHeight * baseScale * zoom;
      const drawXPreview = (PREVIEW_SIZE - drawWidthPreview) / 2 + offset.x;
      const drawYPreview = (PREVIEW_SIZE - drawHeightPreview) / 2 + offset.y;
      const scale = OUTPUT_SIZE / PREVIEW_SIZE;

      ctx.drawImage(
        img,
        drawXPreview * scale,
        drawYPreview * scale,
        drawWidthPreview * scale,
        drawHeightPreview * scale,
      );

      onConfirm(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      onClose();
    } catch {
      // Si le crop échoue, on laisse l’utilisateur revenir sans casser l’app.
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && imageUrl && (
        <motion.div
          className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-sm rounded-t-[30px] sm:rounded-[30px] overflow-hidden pb-safe"
            style={{
              background: 'rgba(14,14,22,0.98)',
              border: '1px solid rgba(255,255,255,0.11)',
              backdropFilter: 'blur(40px)',
              boxShadow: '0 34px 110px rgba(0,0,0,0.62)',
            }}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-5 pb-4 pt-1 flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-xl font-bold tracking-tight">{title}</div>
                <div className="text-xs text-white/40 mt-1">Glisse pour centrer · ajuste le zoom</div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center tap flex-shrink-0"
                aria-label="Fermer"
              >
                <X size={17} className="text-white/65" />
              </button>
            </div>

            <div className="px-5 pb-5 flex flex-col items-center">
              <div
                className="relative rounded-full overflow-hidden select-none touch-none"
                style={{
                  width: PREVIEW_SIZE,
                  height: PREVIEW_SIZE,
                  border: '1px solid rgba(255,255,255,0.18)',
                  boxShadow: '0 18px 60px rgba(124,58,237,0.24), inset 0 0 0 1px rgba(255,255,255,0.06)',
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.20), rgba(255,122,0,0.12))',
                  cursor: dragging ? 'grabbing' : 'grab',
                }}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDragging(true);
                  dragStartRef.current = {
                    pointerX: event.clientX,
                    pointerY: event.clientY,
                    offset,
                  };
                }}
                onPointerMove={(event) => {
                  if (!dragStartRef.current) return;
                  const dx = event.clientX - dragStartRef.current.pointerX;
                  const dy = event.clientY - dragStartRef.current.pointerY;
                  setOffset({
                    x: dragStartRef.current.offset.x + dx,
                    y: dragStartRef.current.offset.y + dy,
                  });
                }}
                onPointerUp={(event) => {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                  setDragging(false);
                  dragStartRef.current = null;
                }}
                onPointerCancel={() => {
                  setDragging(false);
                  dragStartRef.current = null;
                }}
              >
                <img
                  src={imageUrl}
                  alt="Photo à ajuster"
                  draggable={false}
                  className="absolute left-1/2 top-1/2 max-w-none pointer-events-none"
                  style={{
                    width: PREVIEW_SIZE,
                    height: PREVIEW_SIZE,
                    objectFit: 'cover',
                    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
                    transformOrigin: 'center',
                    userSelect: 'none',
                  }}
                />
                <div className="absolute inset-0 rounded-full pointer-events-none" style={{ boxShadow: 'inset 0 0 0 999px rgba(0,0,0,0.02)' }} />
              </div>

              <div className="w-full mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white/45">Zoom</span>
                  <span className="text-[11px] text-white/30">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="2.4"
                  step="0.01"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-full accent-[var(--accent-label)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 w-full mt-5">
                <button
                  onClick={reset}
                  className="h-12 rounded-2xl text-sm font-semibold tap flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.68)' }}
                >
                  <RotateCcw size={15} /> Réinitialiser
                </button>
                <button
                  onClick={confirm}
                  className="h-12 rounded-2xl text-sm font-semibold tap flex items-center justify-center gap-2 text-white"
                  style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', boxShadow: '0 10px 30px rgba(var(--accent-from-rgb),0.28)' }}
                >
                  <Check size={16} /> Valider
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
