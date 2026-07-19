<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { poll } from '../poll'
import { isTouch } from '../device'

// The kraken surfaces every so often and tries to steal one of YOUR votes.
// Catch it in time (cast the hook / tap it) to scare it off; otherwise it
// drags one of your fish back into the deep.
const STEAL_WINDOW = 4500 // ms you have to fight it off

const active = ref(false)
const caught = ref(false)
const stole = ref(false)
const targetDay = ref(null)
const progress = ref(0)
const pos = ref({ x: 0, y: 0 })

let vx = 0
let vy = 0
let scheduleT = 0
let raf = 0
let startAt = 0

const rand = (a, b) => a + Math.random() * (b - a)
const myVotes = () => poll.me.value?.available || []
const fmt = (day) =>
  day ? new Date(day + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : ''

function scheduleNext(min = 22000, max = 46000) {
  clearTimeout(scheduleT)
  scheduleT = setTimeout(tryAppear, rand(min, max))
}

function tryAppear() {
  const votes = myVotes()
  if (active.value || votes.length === 0) {
    scheduleNext(12000, 22000) // nothing to steal yet — check back sooner
    return
  }
  targetDay.value = votes[Math.floor(Math.random() * votes.length)]
  pos.value = { x: rand(140, window.innerWidth - 140), y: rand(180, window.innerHeight - 150) }
  vx = rand(-24, 24)
  vy = rand(-16, 16)
  caught.value = false
  stole.value = false
  progress.value = 0
  active.value = true
  startAt = performance.now()
  raf = requestAnimationFrame(tick)
}

function tick(now) {
  if (!active.value) return
  pos.value.x += vx / 60
  pos.value.y += vy / 60
  if (!caught.value && !stole.value) {
    progress.value = Math.min(1, (now - startAt) / STEAL_WINDOW)
    if (progress.value >= 1) return doSteal()
  }
  raf = requestAnimationFrame(tick)
}

// Called when the hook catches the kraken (rod dispatches a click) or on tap.
function defend() {
  if (!active.value || caught.value || stole.value) return
  caught.value = true
  cancelAnimationFrame(raf)
  setTimeout(() => {
    active.value = false
    scheduleNext()
  }, 950)
}

function doSteal() {
  const day = targetDay.value
  if (myVotes().includes(day)) poll.toggle(day) // yank the vote back into the deep
  stole.value = true
  cancelAnimationFrame(raf)
  setTimeout(() => {
    active.value = false
    scheduleNext()
  }, 1500)
}

onMounted(() => scheduleNext(14000, 26000))
onBeforeUnmount(() => {
  clearTimeout(scheduleT)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <div v-if="active" class="kraken-layer">
    <div
      class="kraken"
      :class="{ caught, stole, tappable: isTouch }"
      data-catch="__kraken__"
      :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
      @click="defend"
    >
      <span class="squid">🐙</span>
      <div class="bubble" :class="{ bad: stole, good: caught }">
        <template v-if="stole">Stole your vote for <b>{{ fmt(targetDay) }}</b>! 🦑</template>
        <template v-else-if="caught">Scared it off — <b>{{ fmt(targetDay) }}</b> is safe! 🎣</template>
        <template v-else>
          Kraken's grabbing <b>{{ fmt(targetDay) }}</b>! {{ isTouch ? 'Tap' : 'Catch' }} it!
        </template>
      </div>
      <div v-if="!caught && !stole" class="timer">
        <div class="bar" :style="{ width: (1 - progress) * 100 + '%' }" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.kraken-layer {
  position: fixed;
  inset: 0;
  z-index: 8;
  pointer-events: none;
  overflow: hidden;
}
.kraken {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 200px;
  margin-left: -100px;
  left: 0;
}
.kraken.tappable {
  pointer-events: auto;
  cursor: pointer;
  touch-action: manipulation;
}
.squid {
  font-size: 68px;
  filter: drop-shadow(0 0 14px rgba(150, 90, 220, 0.7));
  animation: menace 0.5s ease-in-out infinite;
}
.kraken.caught .squid {
  animation: flee 0.9s ease-in forwards;
}
.kraken.stole .squid {
  animation: dive 1.4s ease-in forwards;
}
@keyframes menace {
  0%, 100% { transform: rotate(-6deg) scale(1); }
  50% { transform: rotate(6deg) scale(1.08); }
}
@keyframes flee {
  to { transform: translateY(-60px) scale(0.2) rotate(40deg); opacity: 0; }
}
@keyframes dive {
  to { transform: translateY(120px) scale(0.3); opacity: 0; }
}

.bubble {
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
  padding: 5px 11px;
  border-radius: 999px;
  background: rgba(120, 60, 190, 0.9);
  border: 1px solid rgba(200, 160, 255, 0.6);
  color: #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
}
.bubble b { color: #ffe28a; }
.bubble.bad { background: rgba(210, 60, 70, 0.92); border-color: rgba(255, 150, 150, 0.6); }
.bubble.good { background: rgba(40, 160, 110, 0.92); border-color: rgba(140, 255, 200, 0.6); }
.bubble.good b { color: #eafff5; }

.timer {
  width: 96px;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  overflow: hidden;
}
.timer .bar {
  height: 100%;
  background: #ff6b6b;
  border-radius: 999px;
}
</style>
