// src/shared/Flag.tsx
export const Flag = ({ code, size = 24 }: { code: string; size?: number }) => {
  const cc = (code || '').toUpperCase();
  if (cc.length !== 2) return null;

  const A = 0x1F1E6;
  const emoji =
    String.fromCodePoint(A + cc.charCodeAt(0) - 65) +
    String.fromCodePoint(A + cc.charCodeAt(1) - 65);

  return (
    <span
      role="img"
      aria-label={cc}
      style={{
        fontSize: size,
        lineHeight: '1',
        display: 'inline-block',
        fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
      }}
    >
      {emoji}
    </span>
  );
};