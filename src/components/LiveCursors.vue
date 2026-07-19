<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { peers } from '../live'
import RodGraphic from './RodGraphic.vue'

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
  day ? new Date(day + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : ''

const list = computed(() =>
  Object.values(peers).map((p) => {
    const W = w.value
    const H = h.value
    const base = { x: p.bx * W, y: p.by * H }
    const cast =
      p.st === 'cast' && p.fx != null
        ? { from: { x: p.fx * W, y: p.fy * H }, to: { x: p.tx * W, y: p.ty * H }, t: p.ct || 0, reeling: p.rl === 1 }
        : null
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      base,
      aim: { x: p.ax, y: p.ay },
      bend: p.bd || 0,
      charging: p.st === 'charge',
      charge: p.ch || 0,
      cast,
      catching: p.catchAt && now.value - p.catchAt < 1700,
      catchDay: p.catchDay,
      catchX: (p.catchNx != null ? p.catchNx : p.bx) * W,
      catchY: (p.catchNy != null ? p.catchNy : p.by) * H,
    }
  }),
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
    <!-- remote rods, drawn exactly like your own -->
    <svg class="rods" width="100%" height="100%">
      <RodGraphic
        v-for="p in list"
        :key="p.id"
        :base="p.base"
        :aim="p.aim"
        :bend="p.bend"
        :charging="p.charging"
        :charge="p.charge"
        :cast="p.cast"
        :clock="now"
      />
    </svg>

    <!-- name tags + catch splashes -->
    <div
      v-for="p in list"
      :key="p.id"
      class="tag"
      :style="{ left: p.base.x + 'px', top: p.base.y + 'px', '--c': p.color }"
    >
      <span class="name">{{ p.name }}</span>
    </div>

    <template v-for="p in list" :key="p.id + '-c'">
      <div v-if="p.catching" class="catch" :style="{ left: p.catchX + 'px', top: p.catchY + 'px', '--c': p.color }">
        <span class="ring" />
        <span class="fish">🐟 {{ fmt(p.catchDay) }}</span>
      </div>
    </template>
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
.rods {
  position: absolute;
  inset: 0;
  overflow: visible;
}
.tag {
  position: absolute;
  transform: translate(14px, 18px);
}
.name {
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
}
.ring {
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 50%;
  border: 2px solid var(--c);
  transform: translate(-50%, -50%);
  animation: ripple 0.9s ease-out forwards;
}
.fish {
  position: absolute;
  left: 10px;
  top: -20px;
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
  to { width: 90px; height: 90px; opacity: 0; }
}
@keyframes floatUp {
  0% { opacity: 0; transform: translateY(6px); }
  15% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-26px); }
}
</style>
