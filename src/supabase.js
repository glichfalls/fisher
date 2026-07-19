import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// When the env vars aren't set (e.g. first local run) the app falls back to
// localStorage so it still works — just not shared between people.
export const supabase = url && key ? createClient(url, key) : null
export const hasSupabase = !!supabase
