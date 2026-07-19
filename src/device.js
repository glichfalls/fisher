// True on phones/tablets (no hover, coarse pointer). Used to swap the
// mouse-driven rod cast for a simple tap-to-catch on touch devices.
export const isTouch =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(hover: none) and (pointer: coarse)').matches
