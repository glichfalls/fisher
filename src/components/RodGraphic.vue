<script setup>
import { computed } from 'vue'
import { ROD_LEN, CATCH_MARGIN, rotateVec, castDistFor, bezier, pointOnBezier } from '../rod'

const props = defineProps({
  base: { type: Object, required: true }, // {x,y} screen coords
  aim: { type: Object, required: true }, // {x,y} unit vector (screen space)
  bend: { type: Number, default: 0 }, // rod wind-back (deg)
  charging: { type: Boolean, default: false },
  charge: { type: Number, default: 0 }, // 0..1
  cast: { type: Object, default: null }, // {from,to,t,reeling} while a cast is airborne
  clock: { type: Number, default: 0 }, // ms, for the idle line sway
  visible: { type: Boolean, default: true },
})

const bentAim = computed(() => rotateVec(props.aim, props.bend))
const tip = computed(() => ({
  x: props.base.x + props.aim.x * ROD_LEN,
  y: props.base.y + props.aim.y * ROD_LEN,
}))
const rodAngle = computed(() => (Math.atan2(bentAim.value.y, bentAim.value.x) * 180) / Math.PI + 90)

const landing = computed(() => ({
  x: tip.value.x + props.aim.x * castDistFor(props.charge),
  y: tip.value.y + props.aim.y * castDistFor(props.charge),
}))
const previewPath = computed(() => (props.charging ? bezier(tip.value, landing.value).d : ''))

const castCtrl = computed(() => (props.cast ? bezier(props.cast.from, props.cast.to).ctrl : null))

const hook = computed(() => {
  if (props.cast) {
    const t = props.cast.reeling ? 1 - props.cast.t : props.cast.t
    return pointOnBezier(props.cast.from, castCtrl.value, props.cast.to, Math.max(0, Math.min(1, t)))
  }
  if (props.charging) return tip.value
  return { x: tip.value.x + Math.sin(props.clock / 600) * 7, y: tip.value.y + 30 }
})

const linePath = computed(() => {
  if (props.cast) {
    const t = props.cast.reeling ? 1 - props.cast.t : props.cast.t
    const p = pointOnBezier(props.cast.from, castCtrl.value, props.cast.to, Math.max(0, Math.min(1, t)))
    return `M ${props.cast.from.x} ${props.cast.from.y} Q ${castCtrl.value.x} ${castCtrl.value.y} ${p.x} ${p.y}`
  }
  const tp = tip.value
  const h = hook.value
  const cx = (tp.x + h.x) / 2 + Math.sin(props.clock / 600) * 4
  return `M ${tp.x} ${tp.y} Q ${cx} ${(tp.y + h.y) / 2} ${h.x} ${h.y}`
})

const RETICLE = CATCH_MARGIN + 24
const TAU = 2 * Math.PI * 30
</script>

<template>
  <g v-show="visible">
    <!-- aim preview while charging -->
    <path v-if="charging" :d="previewPath" class="preview" />
    <circle v-if="charging" :cx="landing.x" :cy="landing.y" :r="RETICLE" class="reticle" />
    <circle v-if="charging" :cx="landing.x" :cy="landing.y" r="4" class="reticle-dot" />

    <!-- line + hook -->
    <path :d="linePath" class="line" />
    <circle :cx="hook.x" :cy="hook.y" r="4.5" class="hook" />

    <!-- rod (local coords: grip at origin, tip at 0,-ROD_LEN) -->
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

    <!-- power ring while charging -->
    <g v-if="charging" :transform="`translate(${base.x} ${base.y})`">
      <circle r="30" class="power-track" />
      <circle r="30" class="power-fill" :stroke-dasharray="TAU" :stroke-dashoffset="TAU * (1 - charge)" />
    </g>
  </g>
</template>

<style scoped>
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
</style>
