<script setup>
import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { isTouch } from '../device'
import { sendCursor } from '../live'
import { ROD_LEN, MAX_CHARGE_MS, MAX_PULLBACK, CATCH_MARGIN, castDistFor } from '../rod'
import RodGraphic from './RodGraphic.vue'

const IDLE_AIM = { x: 0.55, y: -0.83 }

const mouse = reactive({ x: -100, y: -100 })
const anchor = reactive({ x: 0, y: 0 })
const charging = ref(false)
const charge = ref(0)
const rodBend = ref(0)
const clock = ref(0)
const cast = reactive({ active: false, t: 0, from: null, to: null, reeling: false, caughtEl: null, startAt: 0, duration: 0 })
const splash = reactive({ show: false, x: 0, y: 0, hit: false })

let raf = 0
let chargeStartedAt = 0

/* Geometry (interaction only — drawing lives in RodGraphic) */
const aimDir = computed(() => {
  const dx = mouse.x - anchor.x
  const dy = mouse.y - anchor.y
  const len = Math.hypot(dx, dy)
  if (len < 8) return { x: 0, y: -1 }
  return { x: dx / len, y: dy / len }
})
const aimDirStable = ref(IDLE_AIM)
const currentAim = computed(() => {
  if (charging.value) return aimDir.value
  if (cast.active) return aimDirStable.value
  return IDLE_AIM
})
const base = computed(() => (charging.value || cast.active ? anchor : mouse))
const tip = computed(() => ({
  x: base.value.x + currentAim.value.x * ROD_LEN,
  y: base.value.y + currentAim.value.y * ROD_LEN,
}))
const landing = computed(() => ({
  x: tip.value.x + currentAim.value.x * castDistFor(charge.value),
  y: tip.value.y + currentAim.value.y * castDistFor(charge.value),
}))

const overUi = ref(false)
const showRod = computed(() => charging.value || cast.active || !overUi.value)

const castProp = computed(() =>
  cast.active ? { from: cast.from, to: cast.to, t: cast.t, reeling: cast.reeling } : null,
)

/* Broadcast our rod state to other anglers (normalized to viewport). */
function pushLive() {
  const W = window.innerWidth
  const H = window.innerHeight
  const st = charging.value ? 'charge' : cast.active ? 'cast' : 'idle'
  const payload = {
    bx: base.value.x / W,
    by: base.value.y / H,
    ax: currentAim.value.x,
    ay: currentAim.value.y,
    bd: rodBend.value,
    ch: charge.value,
    st,
  }
  if (cast.active) {
    payload.fx = cast.from.x / W
    payload.fy = cast.from.y / H
    payload.tx = cast.to.x / W
    payload.ty = cast.to.y / H
    payload.ct = cast.t
    payload.rl = cast.reeling ? 1 : 0
  }
  sendCursor(payload)
}

/* Interaction */
function onMove(e) {
  mouse.x = e.clientX
  mouse.y = e.clientY
  overUi.value = !!e.target.closest('input, button, a, select, textarea, [data-native]')
  pushLive()
}

function onDown(e) {
  if (e.button !== 0 || cast.active) return
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
  cast.from = from
  cast.to = to
  cast.t = 0
  cast.reeling = false
  cast.active = true
  cast.caughtEl = null
  const dist = Math.hypot(to.x - from.x, to.y - from.y)
  cast.duration = 260 + dist * 0.55
  cast.startAt = performance.now()
}

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
  cast.from = cast.to = null
  cast.caughtEl = null
  if (el) el.click()
}

function frame(now) {
  clock.value = now
  if (charging.value) charge.value = Math.min(1, (now - chargeStartedAt) / MAX_CHARGE_MS)

  const bendTarget = charging.value ? charge.value * MAX_PULLBACK : 0
  rodBend.value += (bendTarget - rodBend.value) * 0.3

  if (charging.value || cast.active) pushLive()

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
  if (isTouch) return
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
  <svg v-if="!isTouch" class="rod-cursor" width="100%" height="100%">
    <RodGraphic
      :base="base"
      :aim="currentAim"
      :bend="rodBend"
      :charging="charging"
      :charge="charge"
      :cast="castProp"
      :clock="clock"
      :visible="showRod"
    />
    <circle v-if="splash.show" :cx="splash.x" :cy="splash.y" class="splash" :class="{ hit: splash.hit }" />
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
