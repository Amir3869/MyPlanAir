// src/shared/FAB.tsx
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export const FAB = ({
  children,
  onClick,
  label,
  hidden,
}: {
  children: ReactNode;
  onClick:  () => void;
  label?:   string;
  hidden?:  boolean;
}) => (
  <motion.button
    initial={{ scale: 0, opacity: 0 }}
    animate={{
      scale:   hidden ? 0 : 1,
      opacity: hidden ? 0 : 1,
    }}
    transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.15 }}
    whileTap={{ scale: 0.92 }}
    onClick={onClick}
    aria-label={label || 'Action'}
    aria-hidden={hidden}
    tabIndex={hidden ? -1 : undefined}
    // ✅ Bouton rond, décalé à droite, safe-area-aware
    // iPhone safe-area: 34px + 7.5rem = 34+120 = 154px
    // Desktop: 0+120 = 120px → bien au-dessus de la NavTabBar (~76px)
    className="fixed right-8 z-[60] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl"
    style={{
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 7.5rem)',
      background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
      boxShadow:  '0 12px 40px rgba(var(--accent-from-rgb, 124,140,255), 0.45), 0 0 0 1px rgba(255,255,255,0.18) inset',
      pointerEvents: hidden ? 'none' : 'auto',
    }}
  >
    {children}
  </motion.button>
);
