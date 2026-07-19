<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { poll } from '../poll'
import { isTouch } from '../device'
import { sendCatch } from '../live'

// All fish icons from assets/icons — drop new *.png files in there and they're
// picked up automatically (sorted by filename for a stable assignment).
const FISH_IMAGES = Object.entries(
  import.meta.glob('../../assets/icons/*.png', { eager: true, import: 'default' }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url)

/* Deterministic per-day randomness so every client places the same fish in the
 * same normalized spot and moves it identically (shared wall clock). */
function hash(str) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Motion is a smooth sine path in normalized [0,1] space — viewport-independent,
// loops forever, and stays clear of the extreme edges.
function makeFish(day) {
  const r = mulberry32(hash(day))
  return {
    day,
    img: FISH_IMAGES[hash(day + 'img') % FISH_IMAGES.length],
    ax: 0.30 + r() * 0.10,
    ay: 0.26 + r() * 0.10,
    fx: 0.04 + r() * 0.05, // rad/sec — slow drift
    fy: 0.05 + r() * 0.05,
    px: r() * Math.PI * 2,
    py: r() * Math.PI * 2,
    cx: 0.5,
    cy: 0.5,
  }
}

const fish = computed(() => poll.dates.value.map((d) => makeFish(d.day)))

const t = ref(0)
const W = ref(window.innerWidth)
const H = ref(window.innerHeight)
const hits = reactive({})

// Positions for the current frame — same nx/ny on every client at a given time.
const placed = computed(() =>
  fish.value.map((f) => {
    const nx = f.cx + f.ax * Math.sin(f.fx * t.value + f.px)
    const ny = f.cy + f.ay * Math.sin(f.fy * t.value + f.py)
    const dir = Math.cos(f.fx * t.value + f.px) // +ve => moving right
    return { ...f, nx, ny, x: nx * W.value, y: ny * H.value, flip: dir > 0 ? -1 : 1 }
  }),
)

const mine = (day) => (poll.me.value?.available || []).includes(day)

const fmt = (day) => {
  const d = new Date(day + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

// Called when the hook catches a fish (the rod dispatches a click on it).
function onCatch(f) {
  const wasMine = mine(f.day)
  poll.toggle(f.day)
  if (!wasMine) sendCatch(f.day, f.nx, f.ny)
  hits[f.day] = true
  setTimeout(() => delete hits[f.day], 320)
}

let raf = 0
function frame() {
  if (!window.__FISH_STATIC__) t.value = Date.now() / 1000
  raf = requestAnimationFrame(frame)
}
function onResize() {
  W.value = window.innerWidth
  H.value = window.innerHeight
}

onMounted(() => {
  t.value = Date.now() / 1000
  window.addEventListener('resize', onResize)
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <div class="school">
    <div
      v-for="f in placed"
      :key="f.day"
      class="fish"
      :class="{ mine: mine(f.day), hit: hits[f.day], tappable: isTouch }"
      :data-catch="f.day"
      :style="{ left: f.x + 'px', top: f.y + 'px' }"
      @click="onCatch(f)"
    >
      <!-- icons face left; flip when swimming right so they always face forward -->
      <img class="body" :src="f.img" alt="" :style="{ '--flip': f.flip }" />
      <span class="tag">
        <span v-if="mine(f.day)" class="check">✓</span>{{ fmt(f.day) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.school {
  position: fixed;
  inset: 0;
  z-index: 5;
  pointer-events: none; /* caught via the rod, never blocks the form */
  overflow: hidden;
}
.fish {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  will-change: left, top;
}
/* On touch devices the rod is gone — tap a fish directly to vote. */
.fish.tappable {
  pointer-events: auto;
  cursor: pointer;
  touch-action: manipulation;
  padding: 6px; /* bigger tap target */
}
.body {
  width: 54px;
  height: 54px;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
  transform: scaleX(var(--flip, 1));
  transition: transform 0.15s;
}
.fish.hit .body {
  transform: scaleX(var(--flip, 1)) scale(1.28) rotate(-10deg);
}
.tag {
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(6, 19, 31, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #cfeaff;
}
.fish.mine .tag {
  background: rgba(138, 255, 193, 0.18);
  border-color: rgba(138, 255, 193, 0.5);
  color: #8affc1;
}
.fish.mine .body {
  filter: drop-shadow(0 0 9px rgba(138, 255, 193, 0.7));
}
.check {
  margin-right: 3px;
}
</style>
