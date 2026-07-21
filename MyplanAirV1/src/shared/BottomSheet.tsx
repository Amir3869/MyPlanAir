import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export const BottomSheet = ({
  open, onClose, title, children, maxWidth = 560,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: number;
}) => {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onCloseRef.current();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className="relative w-full glass-strong rounded-t-[28px] sm:rounded-[24px] max-h-[88vh] overflow-y-auto pb-safe"
            style={{ maxWidth }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-3 pb-3 backdrop-blur-xl bg-[rgba(20,20,28,0.45)] border-b border-white/5">
              <div className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-white/25 sm:hidden" />
              <h3 id={title ? titleId : undefined} className="text-lg font-semibold tracking-tight font-display">{title}</h3>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center tap"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 pt-5 pb-28">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
