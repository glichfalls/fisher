<script setup>
import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue'

/* ------------------------------------------------------------------ *
 * Tuning
 * ------------------------------------------------------------------ */
const MAX_CHARGE_MS = 1400
const MIN_DIST = 90
const MAX_DIST = 920
const ROD_LEN = 78
const CATCH_MARGIN = 44         // how far outside a target still counts as a catch (px)
const MAX_PULLBACK = 62         // wind-back angle at full charge (deg)
const IDLE_AIM = { x: 0.55, y: -0.83 }

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */
const mouse = reactive({ x: -100, y: -100 })
const anchor = reactive({ x: 0, y: 0 })
const charging = ref(false)
const charge = ref(0)
const rodBend = ref(0)
const clock = ref(0)
const cast = reactive({ active: false, t: 0, from: null, ctrl: null, to: null, reeling: false, caughtEl: null })
const splash = reactive({ show: false, x: 0, y: 0, hit: false })

let raf = 0
let chargeStartedAt = 0

/* ------------------------------------------------------------------ *
 * Geometry
 * ------------------------------------------------------------------ */
const aimDir = computed(() => {
  const dx = mouse.x - anchor.x
  const dy = mouse.y - anchor.y
  const len = Math.hypot(dx, dy)
  if (len < 8) return { x: 0, y: -1 }
  return { x: dx / len, y: dy / len }
})

const currentAim = computed(() => {
  if (charging.value) return aimDir.value
  if (cast.active) return aimDirStable.value
  return IDLE_AIM
})
const aimDirStable = ref(IDLE_AIM)

const base = computed(() => (charging.value || cast.active ? anchor : mouse))

function rotateVec(v, deg) {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c }
}
const bentAim = computed(() => rotateVec(currentAim.value, rodBend.value))

const tip = computed(() => ({
  x: base.value.x + currentAim.value.x * ROD_LEN,
  y: base.value.y + currentAim.value.y * ROD_LEN,
}))

const castDist = computed(() => MIN_DIST + (MAX_DIST - MIN_DIST) * charge.value)

const rodAngle = computed(
  () => (Math.atan2(bentAim.value.y, bentAim.value.x) * 180) / Math.PI + 90,
)

const landing = computed(() => ({
  x: tip.value.x + currentAim.value.x * castDist.value,
  y: tip.value.y + currentAim.value.y * castDist.value,
}))

function bezier(from, to, ctrlOut) {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
  const dist = Math.hypot(to.x - from.x, to.y - from.y)
  const ctrl = { x: mid.x, y: mid.y - dist * 0.32 }
  if (ctrlOut) { ctrlOut.x = ctrl.x; ctrlOut.y = ctrl.y }
  return `M ${from.x} ${from.y} Q ${ctrl.x} ${ctrl.y} ${to.x} ${to.y}`
}
function pointOnBezier(p0, p1, p2, t) {
  const mt = 1 - t
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  }
}

const previewPath = computed(() => (charging.value ? bezier(tip.value, landing.value) : ''))

// Hook position: flying mid-cast, else dangling from the tip with a gentle sway.
const hook = computed(() => {
  if (cast.active && cast.from) {
    const t = cast.reeling ? 1 - cast.t : cast.t
    return pointOnBezier(cast.from, cast.ctrl, cast.to, Math.max(0, Math.min(1, t)))
  }
  if (charging.value) return tip.value
  return { x: tip.value.x + Math.sin(clock.value / 600) * 7, y: tip.value.y + 30 }
})

const linePath = computed(() => {
  if (cast.active && cast.from) {
    const t = cast.reeling ? 1 - cast.t : cast.t
    const p = pointOnBezier(cast.from, cast.ctrl, cast.to, Math.max(0, Math.min(1, t)))
    return `M ${cast.from.x} ${cast.from.y} Q ${cast.ctrl.x} ${cast.ctrl.y} ${p.x} ${p.y}`
  }
  const t = tip.value
  const h = hook.value
  const cx = (t.x + h.x) / 2 + Math.sin(clock.value / 600) * 4
  return `M ${t.x} ${t.y} Q ${cx} ${(t.y + h.y) / 2} ${h.x} ${h.y}`
})

const CATCH_R = CATCH_MARGIN // used for the reticle radius too

/* ------------------------------------------------------------------ *
 * Interaction — fish for the poll's day cells; leave real controls alone.
 * ------------------------------------------------------------------ */
const overUi = ref(false)
// Hide the rod (and show the native cursor) while hovering real form controls.
const showRod = computed(() => charging.value || cast.active || !overUi.value)

function onMove(e) {
  mouse.x = e.clientX
  mouse.y = e.clientY
  overUi.value = !!e.target.closest('input, button, a, select, textarea, [data-native]')
}

function onDown(e) {
  if (e.button !== 0 || cast.active) return
  // Buttons / inputs / links stay normal clicks so the form is easy to use.
  if (e.target.closest('input, button, a, textarea, select, [data-no-rod]')) return
  e.preventDefault()
  charging.value = true
  charge.value = 0
  anchor.x = mouse.x
  anchor.y = mouse.y
  chargeStartedAt = performance.now()
}

function onUp(e) {
  if (e.button !== 0 || !charging.value) return
  const dir = { ...aimDir.value }
  const from = { ...tip.value }
  const to = { ...landing.value }
  charging.value = false
  rodBend.value = 0
  fireCast(dir, from, to)
}

function fireCast(dir, from, to) {
  aimDirStable.value = dir
  const ctrl = {}
  bezier(from, to, ctrl)
  cast.from = from
  cast.to = to
  cast.ctrl = ctrl
  cast.t = 0
  cast.reeling = false
  cast.active = true
  cast.caughtEl = null
  const dist = Math.hypot(to.x - from.x, to.y - from.y)
  cast.duration = 260 + dist * 0.55
  cast.startAt = performance.now()
}

// Nearest catchable element whose box (expanded by the margin) contains the landing point.
function catchAt(x, y) {
  const els = document.querySelectorAll('[data-catch]')
  let best = null
  let bestDist = CATCH_MARGIN
  els.forEach((el) => {
    const r = el.getBoundingClientRect()
    const dx = Math.max(r.left - x, 0, x - r.right)
    const dy = Math.max(r.top - y, 0, y - r.bottom)
    const d = Math.hypot(dx, dy)
    if (d < bestDist) { bestDist = d; best = el }
  })
  return best
}

function resolveLanding() {
  const el = catchAt(cast.to.x, cast.to.y)
  splash.x = cast.to.x
  splash.y = cast.to.y
  splash.hit = !!el
  splash.show = true
  setTimeout(() => (splash.show = false), 500)
  cast.caughtEl = el
}

function finishCast() {
  const el = cast.caughtEl
  cast.active = false
  cast.from = cast.to = cast.ctrl = null
  cast.caughtEl = null
  if (el) el.click() // triggers the cell's toggle handler
}

/* ------------------------------------------------------------------ *
 * Animation loop
 * ------------------------------------------------------------------ */
function frame(now) {
  clock.value = now
  if (charging.value) charge.value = Math.min(1, (now - chargeStartedAt) / MAX_CHARGE_MS)

  const bendTarget = charging.value ? charge.value * MAX_PULLBACK : 0
  rodBend.value += (bendTarget - rodBend.value) * 0.3

  if (cast.active) {
    const p = (now - cast.startAt) / cast.duration
    if (!cast.reeling) {
      cast.t = Math.min(1, p)
      if (cast.t >= 1) {
        resolveLanding()
        cast.reeling = true
        cast.startAt = now
        cast.t = 0
      }
    } else {
      cast.t = Math.min(1, p)
      if (cast.t >= 1) finishCast()
    }
  }
  raf = requestAnimationFrame(frame)
}

onMounted(() => {
  mouse.x = window.innerWidth / 2
  mouse.y = window.innerHeight / 2
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mousedown', onDown)
  window.addEventListener('mouseup', onUp)
  window.addEventListener('contextmenu', (e) => e.preventDefault())
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mousedown', onDown)
  window.removeEventListener('mouseup', onUp)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <svg class="rod-cursor" width="100%" height="100%">
    <!-- aim preview while charging -->
    <path v-if="charging" :d="previewPath" class="preview" />
    <circle v-if="charging" :cx="landing.x" :cy="landing.y" :r="CATCH_R + 24" class="reticle" />
    <circle v-if="charging" :cx="landing.x" :cy="landing.y" r="4" class="reticle-dot" />

    <g v-show="showRod">
    <!-- line + hook -->
    <path :d="linePath" class="line" />
    <circle :cx="hook.x" :cy="hook.y" r="4.5" class="hook" />

    <!-- rod -->
    <g :transform="`translate(${base.x} ${base.y}) rotate(${rodAngle})`" class="rod">
      <g class="reel">
        <line x1="0" y1="7" x2="-11" y2="16" class="reel-stem" />
        <circle cx="-13" cy="19" r="8" class="reel-body" />
        <circle cx="-13" cy="19" r="3.4" class="reel-spool" />
        <circle cx="-13" cy="19" r="1.3" class="reel-hub" />
        <line x1="-13" y1="19" x2="-21" y2="24" class="reel-handle" />
        <circle cx="-22" cy="25" r="2.2" class="reel-knob" />
      </g>
      <rect x="-4.5" y="6" width="9" height="27" rx="4.5" class="cork" />
      <rect x="-5" y="1" width="10" height="7" rx="2" class="seat" />
      <path d="M 0 2 Q 4 -18 4 -38" class="blank blank-lo" />
      <path d="M 4 -38 Q 4 -58 0 -78" class="blank blank-hi" />
      <path d="M 0 2 Q 4 -18 4 -38" class="shine shine-lo" />
      <path d="M 4 -38 Q 4 -58 0 -78" class="shine shine-hi" />
      <circle cx="4" cy="-38" r="2.7" class="guide" />
      <circle cx="3" cy="-58" r="2.1" class="guide" />
      <circle cx="0" cy="-78" r="1.8" class="guide guide-tip" />
    </g>
    </g>

    <!-- power ring -->
    <g v-if="charging" :transform="`translate(${anchor.x} ${anchor.y})`">
      <circle r="30" class="power-track" />
      <circle
        r="30"
        class="power-fill"
        :stroke-dasharray="2 * Math.PI * 30"
        :stroke-dashoffset="2 * Math.PI * 30 * (1 - charge)"
      />
    </g>

    <!-- splash -->
    <circle
      v-if="splash.show"
      :cx="splash.x"
      :cy="splash.y"
      class="splash"
      :class="{ hit: splash.hit }"
    />
  </svg>
</template>

<style scoped>
.rod-cursor {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  overflow: visible;
}

.preview {
  fill: none;
  stroke: rgba(126, 200, 255, 0.55);
  stroke-width: 2;
  stroke-dasharray: 3 8;
  stroke-linecap: round;
}
.reticle {
  fill: rgba(126, 200, 255, 0.06);
  stroke: rgba(126, 200, 255, 0.5);
  stroke-width: 1.5;
  stroke-dasharray: 4 6;
}
.reticle-dot { fill: #7ec8ff; }

.line {
  fill: none;
  stroke: rgba(233, 246, 255, 0.85);
  stroke-width: 1.4;
}
.hook {
  fill: #e9f6ff;
  stroke: #9fd0ff;
  stroke-width: 1;
}

.rod { filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.5)); }
.blank { fill: none; stroke-linecap: round; }
.blank-lo { stroke: #26384a; stroke-width: 6; }
.blank-hi { stroke: #26384a; stroke-width: 3.2; }
.shine { fill: none; stroke: #5c81a0; stroke-linecap: round; }
.shine-lo { stroke-width: 1.8; }
.shine-hi { stroke-width: 1; }
.cork { fill: #cda06a; stroke: #a97e4a; stroke-width: 1.4; }
.seat { fill: #9aa2ac; stroke: #5b626b; stroke-width: 1; }
.guide { fill: none; stroke: #a9bccd; stroke-width: 1.4; }
.guide-tip { stroke: #ffe9c7; }
.reel-stem { stroke: #5b626b; stroke-width: 3; stroke-linecap: round; }
.reel-body { fill: #7ec8ff; stroke: #22303f; stroke-width: 2; }
.reel-spool { fill: #e9f6ff; stroke: #22303f; stroke-width: 1; }
.reel-hub { fill: #22303f; }
.reel-handle { stroke: #22303f; stroke-width: 2; stroke-linecap: round; }
.reel-knob { fill: #cda06a; stroke: #22303f; stroke-width: 1; }

.power-track { fill: none; stroke: rgba(255, 255, 255, 0.12); stroke-width: 4; }
.power-fill {
  fill: none;
  stroke: #7ec8ff;
  stroke-width: 4;
  stroke-linecap: round;
  transform: rotate(-90deg);
}

.splash {
  fill: none;
  stroke: rgba(126, 200, 255, 0.8);
  stroke-width: 2;
  animation: ripple 0.5s ease-out forwards;
}
.splash.hit { stroke: #8affc1; }
@keyframes ripple {
  from { r: 6px; opacity: 1; }
  to { r: 60px; opacity: 0; }
}
</style>
