import { Component, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; errorMessage?: string; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('💥 [ErrorBoundary] React crash:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div
          className="rounded-3xl p-8 max-w-sm w-full text-center"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(239,68,68,0.15)' }}
          >
            <AlertTriangle size={26} style={{ color: '#ef4444' }} />
          </div>

          <h2 className="text-xl font-bold tracking-tight mb-2">
            Une erreur est survenue
          </h2>
          <p className="text-sm text-white/55 mb-6 leading-relaxed">
            L&apos;application a rencontré un problème inattendu.
            Vos données sont en sécurité dans votre appareil.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 mx-auto px-5 py-3 rounded-2xl font-semibold text-sm"
            style={{
              background: 'rgba(124,140,255,0.25)',
              color: '#7c8cff',
              border: '1px solid rgba(124,140,255,0.3)',
            }}
          >
            <RefreshCw size={15} />
            Recharger l&apos;application
          </button>

          {import.meta.env.DEV && this.state.errorMessage && (
            <p className="mt-5 text-xs text-white/30 font-mono break-all">
              {this.state.errorMessage}
            </p>
          )}
        </div>
      </div>
    );
  }
}