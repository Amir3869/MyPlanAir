// src/shared/DatePickerSheet.tsx
import { useState, useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Calendar } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internes
// ─────────────────────────────────────────────────────────────────────────────
const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];
const DAYS_FR = ['Lu','Ma','Me','Je','Ve','Sa','Di'];

const parseISO = (iso: string): { year: number; month: number; day: number } | null => {
  if (!iso || iso.length < 10) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
};

const toISO = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const daysInMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

const firstWeekday = (year: number, month: number): number => {
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
};

const isoCompare = (a: string, b: string): number => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

const todayISO = (): string => {
  const date = new Date();
  return toISO(date.getFullYear(), date.getMonth() + 1, date.getDate());
};

// ─────────────────────────────────────────────────────────────────────────────
// DateTrigger
// ─────────────────────────────────────────────────────────────────────────────
export const DateTrigger = ({
  value,
  label,
  placeholder = 'Choisir une date',
  onClick,
  disabled = false,
  variant = 'default',
}: {
  value:        string;
  label?:       string;
  placeholder?: string;
  onClick:      () => void;
  disabled?:    boolean;
  variant?:     'default' | 'compact';
}) => {
  const parsed = parseISO(value);
  const date = parsed ? new Date(value + 'T12:00:00') : null;
  const compactDate = date
    ? date.toLocaleDateString('fr-FR', {
        day:   'numeric',
        month: 'short',
        year:  'numeric',
      }).replace('.', '')
    : placeholder;
  const isToday = value === todayISO();
  const defaultDisplay = date
    ? date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day:     'numeric',
        month:   'long',
        year:    'numeric',
      })
    : placeholder;
  const display = variant === 'compact'
    ? (isToday ? 'Aujourd’hui' : compactDate)
    : defaultDisplay;

  return (
    <div className="block w-full">
      {label && (
        <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
          {label}
        </div>
      )}
      <motion.button
        type="button"
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={`w-full glass-strong rounded-2xl flex items-center text-left tap transition-all ${
          variant === 'compact' ? 'px-3.5 py-3 gap-3' : 'px-5 py-4 gap-4'
        }`}
        style={{
          opacity: disabled ? 0.4 : 1,
          cursor:  disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <div
          className={`${variant === 'compact' ? 'w-8 h-8' : 'w-9 h-9'} rounded-xl flex items-center justify-center flex-shrink-0`}
          style={{ background: 'rgba(124,140,255,0.15)', border: '1px solid rgba(124,140,255,0.25)' }}
        >
          <Calendar size={variant === 'compact' ? 14 : 16} style={{ color: '#7c8cff' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`${variant === 'compact' ? 'text-sm' : 'text-base'} font-semibold tracking-tight truncate capitalize`}
            style={{ color: parsed ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.3)' }}
          >
            {display}
          </div>
          {parsed && variant === 'default' && (
            <div className="text-xs text-white/35 mt-0.5">
              {value}
            </div>
          )}
          {parsed && variant === 'compact' && isToday && (
            <div className="text-[11px] text-white/35 mt-0.5">
              {compactDate}
            </div>
          )}
        </div>
        <ChevronRight size={16} className="text-white/25 flex-shrink-0" />
      </motion.button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DatePickerSheet
// ─────────────────────────────────────────────────────────────────────────────
export const DatePickerSheet = ({
  open,
  onClose,
  value,
  onChange,
  min,
  max,
  title = 'Choisir une date',
}: {
  open:     boolean;
  onClose:  () => void;
  value:    string;
  onChange: (iso: string) => void;
  min?:     string;
  max?:     string;
  title?:   string;
}) => {
  const initialView = parseISO(value) ?? parseISO(todayISO())!;
  const [viewYear,  setViewYear]  = useState<number>(initialView.year);
  const [viewMonth, setViewMonth] = useState<number>(initialView.month);
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
      event.stopImmediatePropagation();
      onCloseRef.current();
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const parsed = parseISO(value);
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    } else {
      const t = parseISO(todayISO())!;
      setViewYear(t.year);
      setViewMonth(t.month);
    }
  }, [open, value]);

  const prevMonth = () => {
    setViewMonth((m) => {
      if (m === 1) { setViewYear((y) => y - 1); return 12; }
      return m - 1;
    });
  };
  const nextMonth = () => {
    setViewMonth((m) => {
      if (m === 12) { setViewYear((y) => y + 1); return 1; }
      return m + 1;
    });
  };

  const selectDay = (day: number) => {
    const iso = toISO(viewYear, viewMonth, day);
    if (min && isoCompare(iso, min) < 0) return;
    if (max && isoCompare(iso, max) > 0) return;
    onChange(iso);
    onClose();
  };

  const totalDays   = daysInMonth(viewYear, viewMonth);
  const startOffset = firstWeekday(viewYear, viewMonth);
  const today       = todayISO();
  const parsedValue = parseISO(value);

  const previousYear = viewMonth === 1 ? viewYear - 1 : viewYear;
  const previousMonth = viewMonth === 1 ? 12 : viewMonth - 1;
  const previousMonthLastDay = daysInMonth(previousYear, previousMonth);
  const previousMonthLastISO = toISO(previousYear, previousMonth, previousMonthLastDay);
  const canPrev = !min || isoCompare(previousMonthLastISO, min) >= 0;

  const nextYear = viewMonth === 12 ? viewYear + 1 : viewYear;
  const nextMonthValue = viewMonth === 12 ? 1 : viewMonth + 1;
  const nextMonthFirstISO = toISO(nextYear, nextMonthValue, 1);
  const canNext = !max || isoCompare(nextMonthFirstISO, max) <= 0;

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full rounded-t-[28px] sm:rounded-[28px] overflow-hidden pb-safe"
            style={{ 
              maxWidth:       '420px',
              background:     'rgba(14,14,20,0.96)',
              border:         '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(40px)',
              boxShadow:      '0 40px 120px rgba(0,0,0,0.6)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <h3 id={titleId} className="text-base font-semibold tracking-tight">{title}</h3>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center tap"
                style={{ background: 'rgba(255,255,255,0.08)' }}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center justify-between px-5 py-4">
              <motion.button
                whileTap={{ scale: canPrev ? 0.88 : 1 }}
                onClick={canPrev ? prevMonth : undefined}
                disabled={!canPrev}
                className="w-10 h-10 rounded-2xl flex items-center justify-center tap transition-all"
                style={{
                  background: canPrev ? 'rgba(124,140,255,0.12)' : 'rgba(255,255,255,0.04)',
                  border:     canPrev ? '1px solid rgba(124,140,255,0.25)' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <ChevronLeft size={18} style={{ color: canPrev ? '#a5b4fc' : 'rgba(255,255,255,0.2)' }} />
              </motion.button>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${viewYear}-${viewMonth}`}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                  className="text-center"
                >
                  <div className="text-lg font-bold tracking-tight capitalize">
                    {MONTHS_FR[viewMonth - 1]}
                  </div>
                  <div className="text-xs text-white/40">{viewYear}</div>
                </motion.div>
              </AnimatePresence>

              <motion.button
                whileTap={{ scale: canNext ? 0.88 : 1 }}
                onClick={canNext ? nextMonth : undefined}
                disabled={!canNext}
                className="w-10 h-10 rounded-2xl flex items-center justify-center tap transition-all"
                style={{
                  background: canNext ? 'rgba(124,140,255,0.12)' : 'rgba(255,255,255,0.04)',
                  border:     canNext ? '1px solid rgba(124,140,255,0.25)' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <ChevronRight size={18} style={{ color: canNext ? '#a5b4fc' : 'rgba(255,255,255,0.2)' }} />
              </motion.button>
            </div>

            <div className="grid grid-cols-7 px-4 mb-2">
              {DAYS_FR.map((d) => (
                <div
                  key={d}
                  className="text-center text-[11px] font-semibold uppercase tracking-wider py-1"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 px-4 pb-6 gap-y-1">
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} />;
                }

                const iso        = toISO(viewYear, viewMonth, day);
                const isSelected = parsedValue
                  ? parsedValue.year === viewYear &&
                    parsedValue.month === viewMonth &&
                    parsedValue.day === day
                  : false;
                const isToday    = iso === today;
                const isDisabled =
                  (!!min && isoCompare(iso, min) < 0) ||
                  (!!max && isoCompare(iso, max) > 0);
                const isWeekend  = (startOffset + day - 1) % 7 >= 5;

                return (
                  <div key={`day-${day}`} className="flex items-center justify-center py-0.5">
                    <motion.button
                      whileTap={{ scale: isDisabled ? 1 : 0.85 }}
                      onClick={() => selectDay(day)}
                      disabled={isDisabled}
                      className="w-10 h-10 rounded-2xl flex items-center justify-center relative tap transition-all"
                      style={{
                        background: isSelected
                          ? 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)'
                          : isToday
                          ? 'rgba(255,255,255,0.08)'
                          : 'transparent',
                        border: isToday && !isSelected
                          ? '1px solid rgba(255,255,255,0.2)'
                          : isSelected
                          ? 'none'
                          : '1px solid transparent',
                        opacity:  isDisabled ? 0.22 : 1,
                        cursor:   isDisabled ? 'not-allowed' : 'pointer',
                        boxShadow: isSelected
                          ? '0 4px 16px rgba(124,140,255,0.4)'
                          : 'none',
                      }}
                    >
                      <span
                        className="text-sm font-semibold"
                        style={{
                          color: isSelected
                            ? '#ffffff'
                            : isToday
                            ? 'rgba(255,255,255,0.9)'
                            : isWeekend && !isDisabled
                            ? 'rgba(165,180,252,0.8)'
                            : isDisabled
                            ? 'rgba(255,255,255,0.2)'
                            : 'rgba(255,255,255,0.85)',
                          fontWeight: isSelected || isToday ? 700 : 500,
                        }}
                      >
                        {day}
                      </span>

                      {isToday && isSelected && (
                        <div
                          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/60"
                        />
                      )}
                    </motion.button>
                  </div>
                );
              })}
            </div>

            {parsedValue && (
              <div
                className="flex items-center justify-between px-5 py-4 mx-4 mb-4 rounded-2xl"
                style={{
                  background: 'rgba(124,140,255,0.08)',
                  border:     '1px solid rgba(124,140,255,0.18)',
                }}
              >
                <span className="text-sm text-white/55">Sélectionné</span>
                <span className="text-sm font-semibold capitalize" style={{ color: '#a5b4fc' }}>
                  {new Date(value + 'T12:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day:     'numeric',
                    month:   'long',
                    year:    'numeric',
                  })}
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};