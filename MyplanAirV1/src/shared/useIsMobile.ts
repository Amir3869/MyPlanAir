import { useEffect, useState } from 'react';

export const useIsMobile = (breakpoint = 768) => {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint);
  useEffect(() => {
    const onR = () => setM(window.innerWidth < breakpoint);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, [breakpoint]);
  return m;
};
