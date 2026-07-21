// src/features/collaboration/TeamTab.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Onglet [👥 Team] du Cockpit — Collaboration V1 (UI préparatoire)
// V1 = UI statique avec participants existants + bannière "bientôt"
// V2 = Supabase temps réel
// ═══════════════════════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { Users, UserPlus, Link2, Clock } from 'lucide-react';
import { useTripContext } from '../cockpit/useTripContext';
import { useTripStore } from '../../store/tripStore';
import { GlassCard } from '../../shared/GlassCard';
import { nameToHue, nameToInitials } from '../../store/types';
import { useToast } from '../../shared/Toast';
import { haptic } from '../../utils/haptic';

// ─── Rôles ──────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, { label: string; color: string }> = {
  owner:  { label: 'Propriétaire', color: '#7c8cff' },
  editor: { label: 'Éditeur',      color: '#56c5a4' },
  viewer: { label: 'Lecteur',      color: '#f0b24a' },
};

// ─── Composant Participant ──────────────────────────────────────────────────

const ParticipantRow = ({ name, role, initials, hue }: {
  name: string; role: string; initials: string; hue: number;
}) => {
  const roleInfo = ROLE_LABEL[role] ?? ROLE_LABEL.viewer;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Avatar initiales */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 70%, 40%))`,
        }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold tracking-tight truncate">{name}</div>
        <div className="text-[10px] text-white/35 mt-0.5">{roleInfo.label}</div>
      </div>
      <span
        className="pill px-2.5 py-1 text-[10px] font-semibold"
        style={{
          background: `${roleInfo.color}20`,
          border: `1px solid ${roleInfo.color}40`,
          color: roleInfo.color,
        }}
      >
        {roleInfo.label}
      </span>
    </div>
  );
};

// ─── TeamTab Principal ──────────────────────────────────────────────────────

export const TeamTab = () => {
  const { trip } = useTripContext();
  const participants = useTripStore((s) => s.participants[trip.id] ?? []);
  const { toast } = useToast();
  const userName = useTripStore((s) => s.userName);

  // Le propriétaire = toujours l'utilisateur actuel
  const ownerHue = nameToHue(userName);
  const ownerInitials = nameToInitials(userName);

  const handleShareLink = () => {
    haptic(5);
    try {
      const json = JSON.stringify(trip);
      const encoded = btoa(encodeURIComponent(json));
      const url = `${window.location.origin}/share/${trip.id}?v=${encoded}`;
      navigator.clipboard.writeText(url).then(() => {
        toast('Lien de partage copié !', 'success');
      }).catch(() => {
        toast('Lien prêt', 'info');
      });
    } catch {
      toast('Erreur lors de la copie', 'error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} style={{ color: 'var(--accent-label)' }} />
          <span className="text-sm font-semibold tracking-tight">
            {participants.length + 1} membre{participants.length + 1 > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Liste des participants */}
      <GlassCard className="divide-y divide-white/5 overflow-hidden">
        {/* Propriétaire (toujours en premier) */}
        <ParticipantRow
          name={userName}
          role="owner"
          initials={ownerInitials}
          hue={ownerHue}
        />
        {/* Participants ajoutés */}
        {participants.map((p) => (
          <ParticipantRow
            key={p.id}
            name={p.name}
            role={p.role}
            initials={p.initials}
            hue={p.gradientHue}
          />
        ))}
      </GlassCard>

      {/* Bouton ajouter */}
      <button
        onClick={handleShareLink}
        className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl tap"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(var(--accent-from-rgb), 0.15)' }}
        >
          <UserPlus size={18} style={{ color: 'var(--accent-label)' }} />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold tracking-tight">Ajouter un voyageur</div>
          <div className="text-[10px] text-white/35 mt-0.5">Partager un lien en lecture seule</div>
        </div>
        <Link2 size={14} className="text-white/25" />
      </button>

      {/* Bannière bientôt */}
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{
          background: 'rgba(var(--accent-from-rgb), 0.06)',
          border: '1px solid rgba(var(--accent-from-rgb), 0.15)',
        }}
      >
        <Clock size={18} style={{ color: 'var(--accent-from)' }} />
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--accent-from)' }}>
            Collaboration temps réel — Bientôt
          </div>
          <div className="text-xs text-white/40 mt-0.5">
            Plusieurs personnes pourront planifier et modifier le voyage ensemble.
          </div>
        </div>
      </div>
    </motion.div>
  );
};
