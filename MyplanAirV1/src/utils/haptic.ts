export const haptic = (pattern: number | number[] = 10) => {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch {}
};
