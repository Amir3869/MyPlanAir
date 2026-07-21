// src/features/auth/SSOCallback.tsx
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { motion } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// Page intermédiaire — Clerk finalise le OAuth Google/Apple
// Elle s'affiche ~500ms pendant que Clerk échange le token
// ─────────────────────────────────────────────────────────────────────────────
export const SSOCallback = () => {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: '#07070b' }}
    >
      {/* Loader visuel pendant l'échange OAuth */}
      <motion.div
        className="flex flex-col items-center gap-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo animé */}
        <motion.div
          className="w-20 h-20 rounded-[28px] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)',
            boxShadow:  '0 0 80px rgba(124,140,255,0.5)',
          }}
          animate={{
            boxShadow: [
              '0 0 60px rgba(124,140,255,0.4)',
              '0 0 100px rgba(124,140,255,0.7)',
              '0 0 60px rgba(124,140,255,0.4)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            className="text-4xl"
            animate={{ y: [0, -4, 0], rotate: [-8, -12, -8] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            ✈️
          </motion.span>
        </motion.div>

        {/* Texte */}
        <div className="text-center">
          <p
            className="text-lg font-semibold tracking-tight"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            Connexion en cours...
          </p>
          <p
            className="text-sm mt-1"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            Finalisation de ton authentification
          </p>
        </div>

        {/* Barre de progression */}
        <div
          className="w-32 h-0.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #7c8cff, #ec4899)',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              duration:   1,
              repeat:     Infinity,
              ease:       'easeInOut',
            }}
          />
        </div>
      </motion.div>

      {/* ✅ Clerk gère le callback OAuth en arrière-plan */}
      <AuthenticateWithRedirectCallback />
    </div>
  );
};