// src/App.tsx
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useTripStore } from './store/tripStore';
import { ErrorBoundary } from './shared/ErrorBoundary';
import { AuthPage } from './features/auth/AuthPage';
import { SSOCallback } from './features/auth/SSOCallback';
import { NavTabBar } from './shared/NavTabBar';
import { motion } from 'framer-motion';
import { migrateDocsToIndexedDB } from './utils/docMigration';


// ─────────────────────────────────────────────────────────────────────────────
// Lazy loading — les pages ne sont chargées QUE si l'utilisateur y accède
// ─────────────────────────────────────────────────────────────────────────────
const Dashboard       = lazy(() => import('./features/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const TripsHub        = lazy(() => import('./features/trips/TripsHub').then(m => ({ default: m.TripsHub })));
const Decouvrir       = lazy(() => import('./features/decouvrir/Decouvrir').then(m => ({ default: m.Decouvrir })));
const Profil          = lazy(() => import('./features/profil/Profil').then(m => ({ default: m.Profil })));
const TripCockpit     = lazy(() => import('./features/cockpit/TripCockpit').then(m => ({ default: m.TripCockpit })));
const Overview        = lazy(() => import('./features/overview/Overview').then(m => ({ default: m.Overview })));
const Parcours        = lazy(() => import('./features/parcours/Parcours').then(m => ({ default: m.Parcours })));
const Budget          = lazy(() => import('./features/budget/Budget').then(m => ({ default: m.Budget })));
const Essentials      = lazy(() => import('./features/essentials/Essentials').then(m => ({ default: m.Essentials })));
const TeamTab         = lazy(() => import('./features/collaboration/TeamTab').then(m => ({ default: m.TeamTab })));
const ShareView       = lazy(() => import('./features/share/ShareView').then(m => ({ default: m.ShareView })));
const WorldMap        = lazy(() => import('./features/world/WorldMap').then(m => ({ default: m.WorldMap })));
const TripChat        = lazy(() => import('./features/chat/TripChat').then(m => ({ default: m.TripChat })));
const Documents       = lazy(() => import('./features/documents/Documents').then(m => ({ default: m.Documents })));
const Weather         = lazy(() => import('./features/weather/Weather').then(m => ({ default: m.Weather })));
const UsageConsole    = lazy(() => import('./features/admin/UsageConsole').then(m => ({ default: m.UsageConsole })));

// ─────────────────────────────────────────────────────────────────────────────
// Loader
// ─────────────────────────────────────────────────────────────────────────────
const ClerkLoader = () => (
  <div
    className="fixed inset-0 flex items-center justify-center"
    style={{ background: '#07070b' }}
  >
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="w-20 h-20 rounded-[26px] flex items-center justify-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(124,140,255,0.26) 0%, rgba(236,72,153,0.22) 48%, rgba(56,189,248,0.20) 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow:  '0 0 70px rgba(124,140,255,0.34)',
          backdropFilter: 'blur(24px)',
        }}
        animate={{
          boxShadow: [
            '0 0 70px rgba(124,140,255,0.34)',
            '0 0 105px rgba(236,72,153,0.40)',
            '0 0 78px rgba(56,189,248,0.34)',
            '0 0 70px rgba(124,140,255,0.34)',
          ],
        }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div
          className="absolute inset-0 opacity-50"
          style={{ background: 'radial-gradient(circle at 35% 20%, rgba(255,255,255,0.18), transparent 45%)' }}
          animate={{ opacity: [0.35, 0.62, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.img
          src="/brand/logo-splash.svg"
          alt="MyTrip"
          className="relative z-10 max-w-none object-contain"
          style={{ width: 172, height: 480 }}
          animate={{ y: [0, -3, 0], scale: [1, 1.035, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
      <div
        className="w-28 h-0.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.1)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #7c8cff, #ec4899, #38bdf8)' }}
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 1.15, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Layout avec NavTabBar — utilisé par les 4 pages principales
// ─────────────────────────────────────────────────────────────────────────────
const MainLayout = () => (
  <>
    <Suspense fallback={<ClerkLoader />}>
      <Outlet />
    </Suspense>
    <NavTabBar />
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
// Routes protégées
// ─────────────────────────────────────────────────────────────────────────────
const ProtectedRoutes = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const onboardingDone = useTripStore((s) => s.onboardingDone);

  // ── Migration documents base64 → IndexedDB
  // Lancée uniquement une fois que l’utilisateur est réellement dans l’app.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !onboardingDone) return;
    migrateDocsToIndexedDB();
  }, [isLoaded, isSignedIn, onboardingDone]);

  if (!isLoaded) return <ClerkLoader />;
  if (!isSignedIn) return <AuthPage />;
  if (!onboardingDone) return <AuthPage />;

  return (
    <Routes>
      {/* ── Pages principales avec NavTabBar ── */}
      <Route element={<MainLayout />}>
        <Route path="/"           element={<Dashboard />} />
        <Route path="/voyages"    element={<TripsHub />} />
        <Route path="/decouvrir"  element={<Decouvrir />} />
        <Route path="/profil"     element={<Profil />} />
      </Route>

      {/* ── Pages secondaires SANS NavTabBar ── */}
      <Route path="/world" element={<WorldMap />} />
      <Route path="/admin-test" element={<UsageConsole />} />

      {/* Cockpit voyage — nav interne au cockpit */}
      <Route path="/trip/:id" element={<TripCockpit />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview"   element={<Overview />} />
        <Route path="parcours"   element={<Parcours />} />
        <Route path="budget"     element={<Budget />} />
        <Route path="essentials" element={<Essentials />} />
        <Route path="team"       element={<TeamTab />} />
        <Route path="chat"       element={<TripChat />} />
        <Route path="documents"  element={<Documents />} />
        <Route path="weather"    element={<Weather />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// App principale
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/sso-callback" element={<SSOCallback />} />
          <Route path="/share/:id" element={
            <Suspense fallback={<ClerkLoader />}>
              <ShareView />
            </Suspense>
          } />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
