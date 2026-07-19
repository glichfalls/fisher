import { ref, computed } from 'vue'
import { supabase, hasSupabase } from './supabase'

/**
 * Doodle-style availability poll.
 *
 * Two backends behind one API:
 *  - Supabase (shared across everyone) when VITE_SUPABASE_* is configured.
 *  - localStorage (this browser only) as a zero-config fallback.
 *
 * Data model:
 *  - dates:        [{ id, day }]                 candidate days (ISO "YYYY-MM-DD")
 *  - participants: [{ id, name, available[] }]   available[] holds day strings
 */

const ME_KEY = 'fishing-poll-me'
const LS_KEY = 'fishing-poll-v1'

const uid = () =>
  (crypto.randomUUID && crypto.randomUUID()) ||
  'id-' + Math.abs(Math.floor(performance.now() * 1000)).toString(36)

function createPoll() {
  const dates = ref([])
  const participants = ref([])
  const myId = ref(localStorage.getItem(ME_KEY) || null)
  const ready = ref(false)
  const error = ref('')

  const me = computed(() => participants.value.find((p) => p.id === myId.value) || null)

  const sortedDates = computed(() =>
    [...dates.value].sort((a, b) => a.day.localeCompare(b.day)),
  )

  const countFor = (day) =>
    participants.value.filter((p) => (p.available || []).includes(day)).length

  // The day(s) with the most availability — highlighted as the winner.
  const bestDays = computed(() => {
    let best = 0
    const counts = sortedDates.value.map((d) => countFor(d.day))
    counts.forEach((c) => (best = Math.max(best, c)))
    if (best === 0) return new Set()
    return new Set(sortedDates.value.filter((d) => countFor(d.day) === best).map((d) => d.day))
  })

  /* --------------------------- localStorage backend --------------------------- */
  function lsRead() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY)) || { dates: [], participants: [] }
    } catch {
      return { dates: [], participants: [] }
    }
  }
  function lsWrite() {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ dates: dates.value, participants: participants.value }),
    )
  }

  /* ------------------------------ shared actions ------------------------------ */
  async function load() {
    try {
      if (hasSupabase) {
        const [d, p] = await Promise.all([
          supabase.from('poll_dates').select('id, day').order('day'),
          supabase.from('poll_participants').select('id, name, available').order('created_at'),
        ])
        if (d.error) throw d.error
        if (p.error) throw p.error
        dates.value = d.data || []
        participants.value = (p.data || []).map((x) => ({ ...x, available: x.available || [] }))
      } else {
        const s = lsRead()
        dates.value = s.dates
        participants.value = s.participants
      }
      ready.value = true
    } catch (e) {
      error.value = e.message || String(e)
    }
  }

  async function addDate(day) {
    if (!day) return
    if (dates.value.some((d) => d.day === day)) return // no duplicate days
    if (hasSupabase) {
      const { data, error: e } = await supabase
        .from('poll_dates')
        .insert({ day })
        .select('id, day')
        .single()
      if (e) return (error.value = e.message)
      dates.value.push(data)
    } else {
      dates.value.push({ id: uid(), day })
      lsWrite()
    }
  }

  // Join the poll (or rename) — creates the participant row for "me".
  async function join(name) {
    const clean = name.trim()
    if (!clean) return
    if (me.value) {
      me.value.name = clean
      await persistMe()
      return
    }
    if (hasSupabase) {
      const { data, error: e } = await supabase
        .from('poll_participants')
        .insert({ name: clean, available: [] })
        .select('id, name, available')
        .single()
      if (e) return (error.value = e.message)
      participants.value.push({ ...data, available: data.available || [] })
      myId.value = data.id
    } else {
      const p = { id: uid(), name: clean, available: [] }
      participants.value.push(p)
      myId.value = p.id
      lsWrite()
    }
    localStorage.setItem(ME_KEY, myId.value)
  }

  async function toggle(day) {
    if (!me.value) return
    const av = me.value.available
    const i = av.indexOf(day)
    if (i >= 0) av.splice(i, 1)
    else av.push(day)
    await persistMe()
  }

  async function persistMe() {
    if (!me.value) return
    if (hasSupabase) {
      const { error: e } = await supabase
        .from('poll_participants')
        .update({ name: me.value.name, available: me.value.available })
        .eq('id', me.value.id)
      if (e) error.value = e.message
    } else {
      lsWrite()
    }
  }

  /* -------------------------------- live sync -------------------------------- */
  function subscribe() {
    if (hasSupabase) {
      supabase
        .channel('poll')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_dates' }, load)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_participants' }, load)
        .subscribe()
    } else {
      window.addEventListener('storage', (e) => {
        if (e.key === LS_KEY) load()
      })
    }
  }

  return {
    dates: sortedDates,
    participants,
    me,
    myId,
    ready,
    error,
    usingCloud: hasSupabase,
    countFor,
    bestDays,
    load,
    subscribe,
    addDate,
    join,
    toggle,
  }
}

// One shared poll instance for the whole app (grid + fish read/write the same state).
export const poll = createPoll()
