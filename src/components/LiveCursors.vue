<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { peers } from '../live'

const w = ref(window.innerWidth)
const h = ref(window.innerHeight)
const now = ref(0)
let raf = 0

function onResize() {
  w.value = window.innerWidth
  h.value = window.innerHeight
}
function tick(t) {
  now.value = t
  raf = requestAnimationFrame(tick)
}

const fmt = (day) =>
  new Date(day + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

const list = computed(() =>
  Object.values(peers).map((p) => ({
    ...p,
    x: p.nx * w.value,
    y: p.ny * h.value,
    catching: p.catchAt && now.value - p.catchAt < 1700,
  })),
)

onMounted(() => {
  window.addEventListener('resize', onResize)
  raf = requestAnimationFrame(tick)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <div class="live">
    <div
      v-for="p in list"
      :key="p.id"
      class="peer"
      :class="{ charging: p.state === 'charge', casting: p.state === 'cast' }"
      :style="{ left: p.x + 'px', top: p.y + 'px', '--c': p.color }"
    >
      <span class="rod">🎣</span>
      <span class="name">{{ p.name }}</span>
      <div v-if="p.catching" class="catch">
        <span class="ring" />
        <span class="fish">🐟 {{ fmt(p.catchDay) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.live {
  position: fixed;
  inset: 0;
  z-index: 7;
  pointer-events: none;
  overflow: hidden;
}
.peer {
  position: absolute;
  transform: translate(-4px, -6px);
  transition: left 0.09s linear, top 0.09s linear;
  will-change: left, top;
}
.rod {
  font-size: 30px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
  display: block;
}
.peer.charging .rod {
  animation: wiggle 0.35s ease-in-out infinite;
}
@keyframes wiggle {
  0%, 100% { transform: rotate(-8deg); }
  50% { transform: rotate(8deg); }
}
.name {
  position: absolute;
  left: 26px;
  top: 16px;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--c);
  color: #06131f;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
}
.catch {
  position: absolute;
  left: 8px;
  top: 8px;
}
.ring {
  position: absolute;
  left: 0;
  top: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--c);
  transform: translate(-50%, -50%);
  animation: ripple 0.9s ease-out forwards;
}
.fish {
  position: absolute;
  left: 14px;
  top: -18px;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 700;
  color: #cfeaff;
  background: rgba(6, 19, 31, 0.7);
  border: 1px solid var(--c);
  padding: 1px 7px;
  border-radius: 999px;
  animation: floatUp 1.6s ease-out forwards;
}
@keyframes ripple {
  from { width: 10px; height: 10px; opacity: 1; }
  to { width: 80px; height: 80px; opacity: 0; }
}
@keyframes floatUp {
  0% { opacity: 0; transform: translateY(6px); }
  15% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-26px); }
}
</style>
