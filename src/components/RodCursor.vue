<script setup>
import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue'

const ROD_LEN = 78
const IDLE_AIM = { x: 0.55, y: -0.83 } // rests pointing up-right

const mouse = reactive({ x: -100, y: -100 })
const clock = ref(0)
let raf = 0

const angle = (Math.atan2(IDLE_AIM.y, IDLE_AIM.x) * 180) / Math.PI + 90

const tip = computed(() => ({
  x: mouse.x + IDLE_AIM.x * ROD_LEN,
  y: mouse.y + IDLE_AIM.y * ROD_LEN,
}))

// The line dangles from the tip and sways gently like it's in a breeze.
const hook = computed(() => ({
  x: tip.value.x + Math.sin(clock.value / 600) * 7,
  y: tip.value.y + 30 + Math.sin(clock.value / 900) * 3,
}))

const linePath = computed(() => {
  const t = tip.value
  const h = hook.value
  const cx = (t.x + h.x) / 2 + Math.sin(clock.value / 600) * 4
  const cy = (t.y + h.y) / 2
  return `M ${t.x} ${t.y} Q ${cx} ${cy} ${h.x} ${h.y}`
})

function onMove(e) {
  mouse.x = e.clientX
  mouse.y = e.clientY
}
function frame(now) {
  clock.value = now
  raf = requestAnimationFrame(frame)
}

onMounted(() => {
  // Start at screen centre so the rod is visible before the first mouse move.
  mouse.x = window.innerWidth / 2
  mouse.y = window.innerHeight / 2
  window.addEventListener('mousemove', onMove)
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMove)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <svg class="rod-cursor" width="100%" height="100%">
    <!-- dangling line + hook -->
    <path :d="linePath" class="line" />
    <circle :cx="hook.x" :cy="hook.y" r="4.5" class="hook" />

    <!-- the rod (local coords: grip at origin, tip at 0,-ROD_LEN) -->
    <g :transform="`translate(${mouse.x} ${mouse.y}) rotate(${angle})`" class="rod">
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

.rod {
  filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.5));
}
.blank {
  fill: none;
  stroke-linecap: round;
}
.blank-lo { stroke: #26384a; stroke-width: 6; }
.blank-hi { stroke: #26384a; stroke-width: 3.2; }
.shine {
  fill: none;
  stroke: #5c81a0;
  stroke-linecap: round;
}
.shine-lo { stroke-width: 1.8; }
.shine-hi { stroke-width: 1; }
.cork {
  fill: #cda06a;
  stroke: #a97e4a;
  stroke-width: 1.4;
}
.seat {
  fill: #9aa2ac;
  stroke: #5b626b;
  stroke-width: 1;
}
.guide {
  fill: none;
  stroke: #a9bccd;
  stroke-width: 1.4;
}
.guide-tip { stroke: #ffe9c7; }
.reel-stem {
  stroke: #5b626b;
  stroke-width: 3;
  stroke-linecap: round;
}
.reel-body {
  fill: #7ec8ff;
  stroke: #22303f;
  stroke-width: 2;
}
.reel-spool {
  fill: #e9f6ff;
  stroke: #22303f;
  stroke-width: 1;
}
.reel-hub { fill: #22303f; }
.reel-handle {
  stroke: #22303f;
  stroke-width: 2;
  stroke-linecap: round;
}
.reel-knob {
  fill: #cda06a;
  stroke: #22303f;
  stroke-width: 1;
}
</style>
