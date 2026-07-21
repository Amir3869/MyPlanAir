// src/features/auth/AuthPage.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { useTripStore } from '../../store/tripStore';
import { Mail, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// ICÔNES SVG
// ─────────────────────────────────────────────────────────────────────────────
const AppleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.365 1.43c0 1.14-.42 2.16-1.13 2.93-.74.78-1.95 1.39-3.06 1.3-.13-1.12.42-2.27 1.12-3.01.79-.83 2.13-1.46 3.07-1.49zM20.5 17.05c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.5-4.12 3.51-1.54.02-1.93-.99-4.02-.98-2.09.01-2.52 1-4.06.98-1.74-.02-3.06-1.78-4.05-3.34C-.04 16.32-.34 11.45 1.39 8.86c1.22-1.83 3.16-2.91 4.97-2.91 1.85 0 3.01 1.01 4.54 1.01 1.49 0 2.39-1.01 4.53-1.01 1.62 0 3.34.88 4.55 2.41-3.99 2.18-3.34 7.81 1.52 8.69z"/>
  </svg>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTH PAGE
// ─────────────────────────────────────────────────────────────────────────────
export const AuthPage = () => {
  // ✅ Hooks Clerk réels
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();

  // ✅ Store local — userName
  const userName       = useTripStore((s) => s.userName);
  const setAuthed      = useTripStore((s) => s.setAuthed);

  // ── États locaux ──────────────────────────────────────────────────────────
  const [showEmailForm,  setShowEmailForm]  = useState(false);
  const [email,          setEmail]          = useState('');
  const [password,       setPassword]       = useState('');
  const [showPassword,   setShowPassword]   = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [isSignUp,       setIsSignUp]       = useState(false);

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const continueWithGoogle = async () => {
    if (!signInLoaded || !signIn) return;
    setLoading(true);
    setError(null);
    try {
      await signIn.authenticateWithRedirect({
        strategy:            'oauth_google',
        redirectUrl:         `${window.location.origin}/sso-callback`,
        redirectUrlComplete: '/',
      });
    } catch (err) {
      setError('Erreur Google. Réessaie.');
      setLoading(false);
    }
  };

  // ── Apple OAuth ───────────────────────────────────────────────────────────
  const continueWithApple = async () => {
    if (!signInLoaded || !signIn) return;
    setLoading(true);
    setError(null);
    try {
      await signIn.authenticateWithRedirect({
        strategy:            'oauth_apple',
        redirectUrl:         `${window.location.origin}/sso-callback`,
        redirectUrlComplete: '/',
      });
    } catch (err) {
      setError('Erreur Apple. Réessaie.');
      setLoading(false);
    }
  };

  // ── Email + Password ──────────────────────────────────────────────────────
  const continueWithEmail = async () => {
    if (!email.trim() || !password.trim()) return;
    if (!signInLoaded || !signIn) return;
    if (!signUpLoaded || !signUp) return;

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // ── Inscription ──
        const result = await signUp.create({
          emailAddress: email.trim(),
          password,
        });
        if (result.status === 'complete') {
          // ✅ Connexion automatique après inscription
          setAuthed(true, userName);
        } else {
          // Vérification email requise
          setError('Vérifie ton email pour confirmer ton compte.');
        }
      } else {
        // ── Connexion ──
        const result = await signIn.create({
          identifier: email.trim(),
          password,
        });
        if (result.status === 'complete') {
          setAuthed(true, userName);
        } else {
          setError('Connexion incomplète. Réessaie.');
        }
      }
    } catch (err: unknown) {
      // ✅ Messages d'erreur Clerk traduits en français
      const clerkError = err as { errors?: { code: string }[] };
      const code = clerkError?.errors?.[0]?.code ?? '';

      if (code === 'form_password_incorrect') {
        setError('Mot de passe incorrect.');
      } else if (code === 'form_identifier_not_found') {
        setError('Aucun compte avec cet email. Crée un compte !');
        setIsSignUp(true);
      } else if (code === 'form_password_pwned') {
        setError('Mot de passe trop commun. Choisissez-en un autre.');
      } else if (code === 'form_identifier_exists') {
        setError('Email déjà utilisé. Connecte-toi !');
        setIsSignUp(false);
      } else {
        setError('Une erreur est survenue. Réessaie.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Page Auth ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">

      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80)',
          filter:          'blur(8px) brightness(0.35)',
          transform:       'scale(1.1)',
        }}
      />
      <div className="aurora opacity-50" />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(7,7,11,0.75) 60%, rgba(7,7,11,0.95) 100%)',
        }}
      />

      {/* Contenu */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative z-10 w-full max-w-md px-6 flex flex-col items-center"
      >

        {/* Logo marque */}
        <div className="relative mb-8 flex items-center justify-center w-full h-[220px] overflow-hidden">
          <img
            src="/brand/logo-auth.svg"
            alt="My Plan'Air"
            className="max-w-none object-contain"
            style={{ width: 1450, height: 600, transform: 'translateX(20px)' }}
          />
        </div>

        {/* Message d'erreur global */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="w-full mb-4 px-4 py-3 rounded-2xl flex items-center gap-3"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border:     '1px solid rgba(239,68,68,0.25)',
              }}
            >
              <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Boutons auth */}
        <AnimatePresence mode="wait">
          {!showEmailForm ? (

            // ── Boutons principaux ─────────────────────────────────────────
            <motion.div
              key="main-buttons"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.3 }}
              className="w-full space-y-3"
            >
              {/* Google */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={continueWithGoogle}
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-white text-black font-semibold flex items-center justify-center gap-3 tap disabled:opacity-60"
                style={{ boxShadow: '0 4px 24px rgba(255,255,255,0.15)' }}
              >
                <GoogleIcon />
                Continuer avec Google
              </motion.button>

              {/* Apple */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={continueWithApple}
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-black text-white font-semibold flex items-center justify-center gap-3 tap disabled:opacity-60"
                style={{ border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <AppleIcon />
                Continuer avec Apple
              </motion.button>

              {/* Email — reporté à la migration Supabase */}
              <motion.button
                whileTap={{ scale: 1 }}
                disabled
                className="w-full h-14 rounded-2xl font-semibold flex items-center justify-center gap-3 opacity-55 cursor-not-allowed"
                style={{
                  background: 'rgba(255,255,255,0.045)',
                  border:     '1px solid rgba(255,255,255,0.09)',
                  color:      'rgba(255,255,255,0.45)',
                }}
              >
                <Mail size={18} />
                Email bientôt disponible
              </motion.button>
            </motion.div>

          ) : (

            // ── Formulaire email ───────────────────────────────────────────
            <motion.div
              key="email-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full space-y-3"
            >
              {/* Toggle connexion / inscription */}
              <div
                className="flex rounded-2xl p-1 mb-2"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <button
                  onClick={() => { setIsSignUp(false); setError(null); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold tap transition-all"
                  style={{
                    background: !isSignUp ? 'rgba(255,255,255,0.12)' : 'transparent',
                    color:      !isSignUp ? 'white' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  Connexion
                </button>
                <button
                  onClick={() => { setIsSignUp(true); setError(null); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold tap transition-all"
                  style={{
                    background: isSignUp ? 'rgba(255,255,255,0.12)' : 'transparent',
                    color:      isSignUp ? 'white' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  Créer un compte
                </button>
              </div>

              {/* Input email */}
              <input
                autoFocus
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="ton@email.com"
                className="w-full h-14 rounded-2xl px-5 bg-transparent outline-none font-medium text-base"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border:     '1px solid rgba(255,255,255,0.15)',
                  color:      'white',
                }}
              />

              {/* Input password */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder={isSignUp ? 'Choisir un mot de passe' : 'Mot de passe'}
                  onKeyDown={(e) => { if (e.key === 'Enter') continueWithEmail(); }}
                  className="w-full h-14 rounded-2xl px-5 pr-12 bg-transparent outline-none font-medium text-base"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border:     '1px solid rgba(255,255,255,0.15)',
                    color:      'white',
                  }}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 tap"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Bouton submit */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={continueWithEmail}
                disabled={!email.trim() || !password.trim() || loading}
                className="w-full h-14 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 tap disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)',
                  boxShadow:  '0 8px 32px rgba(124,140,255,0.35)',
                }}
              >
                {loading ? (
                  <motion.div
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <>
                    {isSignUp ? 'Créer mon compte' : 'Se connecter'}
                    <ArrowRight size={16} />
                  </>
                )}
              </motion.button>

              {/* Retour */}
              <button
                onClick={() => {
                  setShowEmailForm(false);
                  setError(null);
                  setEmail('');
                  setPassword('');
                }}
                className="w-full text-center text-sm text-white/40 tap py-2"
              >
                ← Retour
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Légal */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-10 text-xs text-white/25 text-center leading-relaxed"
        >
          En continuant, tu acceptes nos{' '}
          <span className="underline cursor-pointer">Conditions d'utilisation</span>
          {' '}et notre{' '}
          <span className="underline cursor-pointer">Politique de confidentialité</span>
        </motion.p>
      </motion.div>
    </div>
  );
};
