export const Donut = ({
  value, max, size = 180, stroke = 14, color = '#7c8cff', label, sublabel,
}: {
  value: number; max: number; size?: number; stroke?: number; color?: string;
  label?: string; sublabel?: string;
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const offset = c * (1 - pct);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" className="donut-track" />
        <circle
          cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold tracking-tight font-display">{label}</div>
        {sublabel && <div className="text-xs text-white/55 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
};
