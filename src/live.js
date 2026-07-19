import { reactive, ref } from 'vue'
import { supabase, hasSupabase } from './supabase'

/**
 * Live presence + cursors over a Supabase Realtime channel.
 *  - Presence: who's currently fishing (for the online list).
 *  - Broadcast 'cursor': normalized pointer position + state (idle/charge/cast).
 *  - Broadcast 'catch':  someone hooked a fish for a given day.
 * All ephemeral — no database writes.
 */

const sessionId =
  (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID()) ||
  's-' + Math.random().toString(36).slice(2)

function colorFor(id) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return `hsl(${h % 360} 85% 66%)`
}
const myColor = colorFor(sessionId)

export const mySessionId = sessionId
export const peers = reactive({}) // id -> { id, name, color, nx, ny, state, catchDay, catchAt }
export const online = ref([]) // [{ id, name, color, isMe }]

let channel = null
let nameGetter = () => 'Angler'

function ensurePeer(id, name) {
  if (!peers[id]) {
    peers[id] = { id, name: name || 'Angler', color: colorFor(id), nx: 0.5, ny: 0.5, state: 'idle', catchDay: null, catchAt: 0 }
  }
  return peers[id]
}

function refreshOnline() {
  const state = channel.presenceState()
  const list = []
  for (const key in state) {
    const meta = state[key][0] || {}
    list.push({ id: key, name: meta.name || 'Angler', color: meta.color || colorFor(key), isMe: key === sessionId })
    if (key !== sessionId) {
      const p = ensurePeer(key, meta.name)
      p.name = meta.name || p.name
      p.color = meta.color || p.color
    }
  }
  for (const key in peers) if (!state[key]) delete peers[key] // prune those who left
  online.value = list
}

export function initLive(getName) {
  if (!hasSupabase || channel) return
  if (getName) nameGetter = getName
  channel = supabase.channel('fishing-live', {
    config: { broadcast: { self: false }, presence: { key: sessionId } },
  })
  channel
    .on('broadcast', { event: 'cursor' }, ({ payload }) => {
      const p = ensurePeer(payload.id, payload.name)
      p.nx = payload.nx
      p.ny = payload.ny
      p.state = payload.st
      if (payload.name) p.name = payload.name
    })
    .on('broadcast', { event: 'catch' }, ({ payload }) => {
      const p = ensurePeer(payload.id, payload.name)
      p.nx = payload.nx
      p.ny = payload.ny
      p.catchDay = payload.day
      p.catchAt = performance.now()
    })
    .on('presence', { event: 'sync' }, refreshOnline)
    .on('presence', { event: 'join' }, refreshOnline)
    .on('presence', { event: 'leave' }, refreshOnline)
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track({ name: nameGetter(), color: myColor })
    })
}

// Re-announce our name/colour (e.g. after the user joins or renames).
export async function updateName() {
  if (channel) {
    try {
      await channel.track({ name: nameGetter(), color: myColor })
    } catch {
      /* ignore */
    }
  }
}

let lastSent = 0
export function sendCursor(nx, ny, st) {
  if (!channel) return
  const now = performance.now()
  if (now - lastSent < 45) return // ~22 updates/sec
  lastSent = now
  channel.send({ type: 'broadcast', event: 'cursor', payload: { id: sessionId, name: nameGetter(), nx, ny, st } })
}

export function sendCatch(day, nx, ny) {
  if (!channel) return
  channel.send({ type: 'broadcast', event: 'catch', payload: { id: sessionId, name: nameGetter(), day, nx, ny } })
}
