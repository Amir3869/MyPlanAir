import type { KeyboardEvent, ReactNode, CSSProperties } from 'react';
import { cn } from '../utils/cn';

export const GlassCard = ({
  children, className, style, onClick, strong = false,
}: { children: ReactNode; className?: string; style?: CSSProperties; onClick?: () => void; strong?: boolean }) => {
  const interactiveProps = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
          if (event.currentTarget !== event.target) return;
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onClick();
        },
      }
    : {};

  return (
    <div
      onClick={onClick}
      className={cn(strong ? 'glass-strong' : 'glass', className, onClick && 'tap cursor-pointer')}
      style={style}
      {...interactiveProps}
    >
      {children}
    </div>
  );
};
