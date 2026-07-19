<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({ existing: { type: Array, default: () => [] } })
const emit = defineEmits(['add'])

const open = ref(false)
const root = ref(null)

const today = new Date()
const pad = (n) => String(n).padStart(2, '0')
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const todayISO = iso(today.getFullYear(), today.getMonth(), today.getDate())

const viewY = ref(today.getFullYear())
const viewM = ref(today.getMonth()) // 0-11

const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const monthLabel = computed(() =>
  new Date(viewY.value, viewM.value, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  }),
)

const cells = computed(() => {
  const first = new Date(viewY.value, viewM.value, 1)
  const startDow = (first.getDay() + 6) % 7 // Monday = 0
  const days = new Date(viewY.value, viewM.value + 1, 0).getDate()
  const arr = []
  for (let i = 0; i < startDow; i++) arr.push(null)
  for (let d = 1; d <= days; d++) {
    const day = iso(viewY.value, viewM.value, d)
    arr.push({
      d,
      day,
      past: day < todayISO,
      added: props.existing.includes(day),
      isToday: day === todayISO,
    })
  }
  return arr
})

// Don't page back before the current month (no point adding past days).
const canPrev = computed(
  () => viewY.value > today.getFullYear() || viewM.value > today.getMonth(),
)

function prev() {
  if (!canPrev.value) return
  if (viewM.value === 0) { viewM.value = 11; viewY.value-- } else viewM.value--
}
function next() {
  if (viewM.value === 11) { viewM.value = 0; viewY.value++ } else viewM.value++
}
function pick(c) {
  if (!c || c.past || c.added) return
  emit('add', c.day)
}

function onDocDown(e) {
  if (open.value && root.value && !root.value.contains(e.target)) open.value = false
}
onMounted(() => window.addEventListener('mousedown', onDocDown))
onBeforeUnmount(() => window.removeEventListener('mousedown', onDocDown))
</script>

<template>
  <div ref="root" class="dp">
    <button class="trigger" :class="{ open }" @click="open = !open">
      <span class="ic">🎣</span> Add a fishing day
      <span class="caret">{{ open ? '▲' : '▼' }}</span>
    </button>

    <div v-if="open" class="pop">
      <div class="pop-head">
        <button class="nav" :disabled="!canPrev" @click="prev">‹</button>
        <span class="month">{{ monthLabel }}</span>
        <button class="nav" @click="next">›</button>
      </div>

      <div class="weekdays">
        <span v-for="w in WEEK" :key="w">{{ w }}</span>
      </div>

      <div class="days">
        <template v-for="(c, i) in cells" :key="i">
          <span v-if="!c" class="blank" />
          <button
            v-else
            class="day"
            :class="{ past: c.past, added: c.added, today: c.isToday }"
            :disabled="c.past || c.added"
            :title="c.added ? 'Already in the poll' : ''"
            @click="pick(c)"
          >
            {{ c.d }}<span v-if="c.added" class="fish-dot">🐟</span>
          </button>
        </template>
      </div>

      <p class="hint">Pick a day to release a fish into the poll.</p>
    </div>
  </div>
</template>

<style scoped>
.dp {
  position: relative;
  display: inline-block;
}
.trigger {
  background: rgba(126, 200, 255, 0.14);
  color: var(--foam);
  border: 1px solid rgba(126, 200, 255, 0.4);
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.trigger.open {
  background: rgba(126, 200, 255, 0.24);
}
.caret {
  font-size: 10px;
  opacity: 0.7;
}

.pop {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 0;
  width: 280px;
  padding: 12px;
  border-radius: 14px;
  background: #0d2032;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
  z-index: 20;
}
.pop-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.month {
  font-weight: 700;
}
.nav {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: var(--foam);
  font-size: 18px;
  line-height: 1;
}
.nav:disabled {
  opacity: 0.3;
}

.weekdays,
.days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}
.weekdays {
  margin-bottom: 4px;
}
.weekdays span {
  text-align: center;
  font-size: 11px;
  opacity: 0.55;
  padding: 2px 0;
}
.blank {
  aspect-ratio: 1;
}
.day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: 8px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.05);
  color: var(--foam);
  font-size: 13px;
  font-weight: 600;
}
.day:hover:not(:disabled) {
  background: #7ec8ff;
  color: #06131f;
}
.day.today {
  border-color: rgba(126, 200, 255, 0.7);
}
.day.past {
  opacity: 0.28;
}
.day.added {
  background: rgba(138, 255, 193, 0.16);
  color: #8affc1;
}
.fish-dot {
  position: absolute;
  bottom: -2px;
  right: -1px;
  font-size: 10px;
}
.hint {
  margin: 10px 2px 2px;
  font-size: 11.5px;
  opacity: 0.6;
}
</style>
