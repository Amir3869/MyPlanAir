import {
  useEffect, useRef, createContext, useContext,
  useState, useCallback, ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────
type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string) => void;
  error:   (message: string) => void;
  info:    (message: string) => void;
}

// ── Context ────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

// ── Config ────────────────────────────────────────────────────────
const MAX_TOASTS = 4;

const createToastId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

// ── Config visuelle ────────────────────────────────────────────────
const VARIANT_CONFIG: Record<ToastVariant, {
  icon: React.ElementType;
  iconColor: string;
  bg: string;
  border: string;
}> = {
  success: {
    icon: CheckCircle2,
    iconColor: '#56c5a4',
    bg: 'rgba(86,197,164,0.12)',
    border: 'rgba(86,197,164,0.25)',
  },
  error: {
    icon: XCircle,
    iconColor: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.25)',
  },
  info: {
    icon: Info,
    iconColor: '#7c8cff',
    bg: 'rgba(124,140,255,0.12)',
    border: 'rgba(124,140,255,0.25)',
  },
};

// ── Toast Card (un seul toast) ─────────────────────────────────────
const ToastCard = ({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) => {
  const config = VARIANT_CONFIG[item.variant];
  const Icon = config.icon;
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(item.id), item.duration ?? 3500);
    return () => clearTimeout(timerRef.current);
  }, [item.id, item.duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.88 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl max-w-xs w-full"
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        backdropFilter: 'blur(24px)',
      }}
    >
      <Icon size={17} style={{ color: config.iconColor, flexShrink: 0 }} />
      <span className="text-sm font-medium leading-snug flex-1 text-white">
        {item.message}
      </span>
      <button
        onClick={() => onDismiss(item.id)}
        className="text-white/35 hover:text-white/70 transition-colors"
        aria-label="Fermer"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
};

// ── Provider ───────────────────────────────────────────────────────
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((
    message: string,
    variant: ToastVariant = 'info',
    duration?: number,
  ) => {
    const id = createToastId();
    setToasts(prev => [...prev.slice(-(MAX_TOASTS - 1)), { id, message, variant, duration }]);
  }, []);

  const value: ToastContextValue = {
    toast,
    success: (msg) => toast(msg, 'success'),
    error:   (msg) => toast(msg, 'error'),
    info:    (msg) => toast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-24 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4"
        aria-live="polite"
      >
        <AnimatePresence mode="sync">
          {toasts.map(item => (
            <div key={item.id} className="pointer-events-auto w-full flex justify-center">
              <ToastCard item={item} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// ── Hook ───────────────────────────────────────────────────────────
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>');
  return ctx;
};