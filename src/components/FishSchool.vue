<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { poll } from '../poll'

// All fish icons from assets/icons — drop new *.png files in there and they're
// picked up automatically (sorted by filename for a stable assignment).
const FISH_IMAGES = Object.entries(
  import.meta.glob('../../assets/icons/*.png', { eager: true, import: 'default' }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url)

const fishes = ref([]) // { day, x, y, vx, vy, img, hit }

const rand = (a, b) => a + Math.random() * (b - a)

function spawn(day, i) {
  const w = window.innerWidth
  const h = window.innerHeight
  return {
    day,
    x: rand(80, w - 80),
    y: rand(120, h - 80),
    vx: rand(30, 70) * (Math.random() < 0.5 ? -1 : 1),
    vy: rand(-22, 22),
    img: FISH_IMAGES[i % FISH_IMAGES.length],
    hit: false,
  }
}

// Keep the school in sync with the candidate days.
watch(
  poll.dates,
  (dates) => {
    const days = new Set(dates.map((d) => d.day))
    fishes.value = fishes.value.filter((f) => days.has(f.day))
    dates.forEach((d, i) => {
      if (!fishes.value.some((f) => f.day === d.day)) fishes.value.push(spawn(d.day, i))
    })
  },
  { immediate: true, deep: true },
)

const mine = (day) => (poll.me.value?.available || []).includes(day)

const fmt = (day) => {
  const d = new Date(day + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

// Called when the hook catches a fish (the rod dispatches a click on it).
function onCatch(f) {
  poll.toggle(f.day)
  f.hit = true
  setTimeout(() => (f.hit = false), 320)
  // Startled dart in a new direction.
  f.vx = rand(40, 90) * (Math.random() < 0.5 ? -1 : 1)
  f.vy = rand(-30, 30)
}

let raf = 0
let last = 0
function frame(now) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
  last = now
  if (!window.__FISH_STATIC__) {
    const w = window.innerWidth
    const h = window.innerHeight
    for (const f of fishes.value) {
      f.x += f.vx * dt
      f.y += f.vy * dt + Math.sin(now / 500 + f.x) * 0.3
      if (f.x < 50) { f.x = 50; f.vx = Math.abs(f.vx) }
      if (f.x > w - 50) { f.x = w - 50; f.vx = -Math.abs(f.vx) }
      if (f.y < 100) { f.y = 100; f.vy = Math.abs(f.vy) }
      if (f.y > h - 60) { f.y = h - 60; f.vy = -Math.abs(f.vy) }
    }
  }
  raf = requestAnimationFrame(frame)
}

onMounted(() => (raf = requestAnimationFrame(frame)))
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="school">
    <div
      v-for="f in fishes"
      :key="f.day"
      class="fish"
      :class="{ mine: mine(f.day), hit: f.hit }"
      :data-catch="f.day"
      :style="{ left: f.x + 'px', top: f.y + 'px' }"
      @click="onCatch(f)"
    >
      <!-- icons face left; flip when swimming right so they always face forward -->
      <img class="body" :src="f.img" alt="" :style="{ '--flip': f.vx < 0 ? 1 : -1 }" />
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
