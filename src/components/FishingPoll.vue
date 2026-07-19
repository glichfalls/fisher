<script setup>
import { onMounted, ref, computed } from 'vue'
import { poll } from '../poll'
import DatePicker from './DatePicker.vue'
import { isTouch } from '../device'

const nameInput = ref('')

onMounted(async () => {
  await poll.load()
  poll.subscribe()
})

const joined = computed(() => !!poll.me.value)

function submitName() {
  poll.join(nameInput.value)
  nameInput.value = ''
}

const existingDays = computed(() => poll.dates.value.map((d) => d.day))

const fmt = (day) => {
  const d = new Date(day + 'T00:00:00')
  return {
    dow: d.toLocaleDateString(undefined, { weekday: 'short' }),
    date: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
  }
}
</script>

<template>
  <div class="poll">
    <header class="head">
      <h1>🎣 When shall we go fishing?</h1>
      <p class="sub">Add the days that work, join with your name, then <b>catch the fish</b> for each day you're free — one fish per vote. Best day wins.</p>
      <p class="sub how">{{ isTouch ? '📱 Tap a fish to catch it.' : '🖱️ Hold left-click to charge, aim, and release to cast your hook.' }}</p>
      <p class="store" :class="{ cloud: poll.usingCloud }">
        {{ poll.usingCloud ? '● shared — everyone sees the same poll' : '● local only — set up Supabase to share (see README)' }}
      </p>
    </header>

    <p v-if="poll.error.value" class="err">{{ poll.error.value }}</p>

    <!-- who am I -->
    <div class="join">
      <template v-if="!joined">
        <input
          v-model="nameInput"
          class="field"
          placeholder="Your name"
          maxlength="24"
          @keyup.enter="submitName"
        />
        <button class="btn" @click="submitName">Join the trip</button>
      </template>
      <template v-else>
        <span class="you">Fishing as <b>{{ poll.me.value.name }}</b> — {{ isTouch ? 'tap' : 'hook' }} the 🐟 for a day to vote; {{ isTouch ? 'tap' : 'catch' }} it again to release your vote.</span>
      </template>
    </div>

    <!-- the grid -->
    <div v-if="poll.ready.value" class="grid-wrap">
      <table v-if="poll.dates.value.length" class="grid">
        <thead>
          <tr>
            <th class="name-col">Angler</th>
            <th
              v-for="d in poll.dates.value"
              :key="d.id"
              class="date-col"
              :class="{ best: poll.bestDays.value.has(d.day) }"
            >
              <button
                v-if="poll.countFor(d.day) === 0"
                class="rm"
                title="Remove this day (no one picked it yet)"
                @click="poll.removeDate(d.id, d.day)"
              >×</button>
              <span class="dow">{{ fmt(d.day).dow }}</span>
              <span class="date">{{ fmt(d.day).date }}</span>
              <span class="count">{{ poll.countFor(d.day) }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in poll.participants.value" :key="p.id" :class="{ mine: p.id === poll.myId.value }">
            <td class="name-col">{{ p.name }}</td>
            <td
              v-for="d in poll.dates.value"
              :key="d.id"
              class="cell"
              :class="{
                yes: (p.available || []).includes(d.day),
                best: poll.bestDays.value.has(d.day),
              }"
            >
              <span v-if="(p.available || []).includes(d.day)">🐟</span>
            </td>
          </tr>
          <tr v-if="!poll.participants.value.length">
            <td :colspan="poll.dates.value.length + 1" class="empty">
              No anglers yet — add your name above to be the first.
            </td>
          </tr>
        </tbody>
      </table>

      <p v-else class="empty">No dates yet. Add the first candidate day below 👇</p>
    </div>
    <p v-else class="empty">Loading the pond…</p>

    <!-- add a date -->
    <div class="add-date">
      <DatePicker :existing="existingDays" @add="poll.addDate($event)" />
    </div>
  </div>
</template>

<style scoped>
.poll {
  position: relative;
  z-index: 2;
  max-width: 880px;
  margin: 0 auto;
  padding: 46px 24px 80px;
}

.head h1 {
  margin: 0 0 6px;
  font-size: clamp(26px, 4vw, 40px);
  font-weight: 800;
  letter-spacing: 0.3px;
}
.sub {
  margin: 0 0 8px;
  opacity: 0.72;
}
.sub.how {
  font-size: 13.5px;
  opacity: 0.85;
  color: #7ec8ff;
}
.store {
  margin: 0;
  font-size: 12.5px;
  color: #ffcf8f;
}
.store.cloud { color: #8affc1; }

.err {
  background: rgba(255, 90, 90, 0.14);
  border: 1px solid rgba(255, 90, 90, 0.4);
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
}

.join {
  margin: 22px 0 18px;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.you { opacity: 0.85; }
.you b { color: #7ec8ff; }

.field {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: var(--foam);
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 15px;
  outline: none;
}
.field:focus {
  border-color: #7ec8ff;
  background: rgba(126, 200, 255, 0.1);
}

.btn {
  background: #7ec8ff;
  color: #06131f;
  border: none;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 15px;
}
.btn.ghost {
  background: rgba(126, 200, 255, 0.14);
  color: var(--foam);
  border: 1px solid rgba(126, 200, 255, 0.4);
}
.btn:disabled {
  opacity: 0.4;
}

.grid-wrap {
  overflow-x: auto;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
}
.grid {
  border-collapse: collapse;
  width: 100%;
  min-width: max-content;
}
th,
td {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  padding: 10px 12px;
  text-align: center;
}
.name-col {
  text-align: left;
  position: sticky;
  left: 0;
  background: #0d2032;
  min-width: 120px;
  font-weight: 600;
}
thead .name-col { z-index: 1; }

.date-col {
  position: relative;
  min-width: 74px;
  line-height: 1.25;
}
.rm {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 18px;
  height: 18px;
  padding: 0;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: var(--foam);
  font-size: 13px;
  line-height: 1;
  opacity: 0.5;
}
.rm:hover {
  opacity: 1;
  background: rgba(255, 90, 90, 0.7);
}
.date-col .dow {
  display: block;
  font-size: 12px;
  opacity: 0.65;
}
.date-col .date {
  display: block;
  font-weight: 700;
}
.date-col .count {
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
}
.date-col.best {
  color: #8affc1;
}
.date-col.best .count {
  background: rgba(138, 255, 193, 0.2);
}

tr.mine .name-col {
  color: #7ec8ff;
}
.cell {
  font-size: 20px;
  height: 44px;
}
.cell.best {
  background: rgba(138, 255, 193, 0.06);
}
.cell.yes.editable {
  background: rgba(126, 200, 255, 0.2);
}

.empty {
  padding: 26px;
  text-align: center;
  opacity: 0.7;
}

.add-date {
  margin-top: 18px;
  display: flex;
  gap: 10px;
  align-items: center;
}

@media (max-width: 600px) {
  .poll {
    padding: 28px 16px 90px;
  }
  .field,
  .btn {
    font-size: 16px; /* keeps iOS from zooming on focus */
  }
  th,
  td {
    padding: 8px 9px;
  }
  .name-col {
    min-width: 92px;
  }
  .date-col {
    min-width: 62px;
  }
  .cell {
    font-size: 17px;
    height: 40px;
  }
  .rm {
    /* Bigger, always-visible tap target on touch. */
    width: 22px;
    height: 22px;
    opacity: 0.8;
  }
}
</style>
