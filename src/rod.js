// Shared rod geometry — used by the local cursor and by remote peers so every
// rod (and its charging/cast animation) looks identical.
export const ROD_LEN = 78
export const MIN_DIST = 90
export const MAX_DIST = 920
export const MAX_CHARGE_MS = 1400
export const MAX_PULLBACK = 62 // wind-back angle at full charge (deg)
export const CATCH_MARGIN = 44 // how far outside a target still counts as a catch (px)

export function rotateVec(v, deg) {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c }
}

export function castDistFor(charge) {
  return MIN_DIST + (MAX_DIST - MIN_DIST) * charge
}

// Quadratic cast arc from `from` to `to`, lifted upward like a real cast.
export function bezier(from, to) {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
  const dist = Math.hypot(to.x - from.x, to.y - from.y)
  const ctrl = { x: mid.x, y: mid.y - dist * 0.32 }
  return { ctrl, d: `M ${from.x} ${from.y} Q ${ctrl.x} ${ctrl.y} ${to.x} ${to.y}` }
}

export function pointOnBezier(p0, p1, p2, t) {
  const mt = 1 - t
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  }
}
