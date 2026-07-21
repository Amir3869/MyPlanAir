export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', opts);
  } catch {
    return iso;
  }
};

export const fmtRange = (start: string, end: string) => {
  if (!start || !end) return '';
  const s = new Date(start);
  const e = new Date(end);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${s.getDate()} – ${e.getDate()} ${e.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
  }
  return `${fmtDate(start, { day: '2-digit', month: 'short' })} – ${fmtDate(end, { day: '2-digit', month: 'short', year: 'numeric' })}`;
};

export const daysBetween = (a: string, b: string) => {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / 86400000)) + 1;
};

export const tripStatus = (start: string, end: string): 'upcoming' | 'ongoing' | 'finished' => {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const s = new Date(start); s.setHours(0, 0, 0, 0);
  const e = new Date(end); e.setHours(0, 0, 0, 0);
  if (now < s) return 'upcoming';
  if (now > e) return 'finished';
  return 'ongoing';
};

export const dayCounter = (start: string, end: string) => {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const s = new Date(start); s.setHours(0, 0, 0, 0);
  const e = new Date(end); e.setHours(0, 0, 0, 0);
  const diffStart = Math.round((s.getTime() - now.getTime()) / 86400000);
  if (diffStart > 0) return `J-${diffStart}`;
  if (now > e) {
    const diffEnd = Math.round((now.getTime() - e.getTime()) / 86400000);
    return `Terminé · J+${diffEnd}`;
  }
  const dayIdx = Math.round((now.getTime() - s.getTime()) / 86400000) + 1;
  return `Jour ${dayIdx}`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const addDaysISO = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const getTimeOfDay = (): 'morning' | 'afternoon' | 'night' => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 19) return 'afternoon';
  return 'night';
};

export const bgOpacityForTime = () => {
  const h = new Date().getHours();
  if (h >= 20 || h < 7) return 0.35;
  if (h < 9 || h >= 18) return 0.55;
  return 0.7;
};

/** Pourcentage d'avancement d'un voyage (0-100), null si pas "ongoing" */
export const getTripProgress = (startDate: string, endDate: string): number | null => {
  const status = tripStatus(startDate, endDate);
  if (status !== 'ongoing') return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setHours(0, 0, 0, 0);
  const total = end.getTime() - start.getTime();
  if (total <= 0) return null;
  const elapsed = now.getTime() - start.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
};
