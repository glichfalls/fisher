# Fisher 🎣

A Vue site with a fishing-rod cursor for finding a date to go fishing together.
It's a Doodle-style availability poll: add candidate days, type your name, and
check every day you're free. The day with the most anglers wins.

Votes are stored in **Supabase** (free tier) so everyone shares one poll. Until
you configure Supabase the app falls back to `localStorage`, so it still runs —
it just won't be shared between people.

## Develop

```bash
npm install
npm run dev
```

## Storage setup (Supabase — free)

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. In the dashboard: **SQL Editor → New query**, paste
   [`supabase/schema.sql`](supabase/schema.sql), and **Run**. This creates the
   `poll_dates` / `poll_participants` tables and opens them to anonymous access.
3. **Project Settings → API** — copy the **Project URL** and the **anon public**
   key.
4. Locally: copy `.env.example` to `.env.local` and fill both values.
5. On Vercel: add the same two env vars (**Project → Settings → Environment
   Variables**):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

The `anon` key is safe to expose in a static site — access is limited by the
Row Level Security policies in `schema.sql`. (They allow public read/write on
purpose, since the poll has no login. Add auth before storing anything private.)

## Deploy to Vercel

Zero-config Vite detection (preset **Vite**, build `npm run build`, output
`dist`). Import the repo at [vercel.com/new](https://vercel.com/new) and add the
two env vars above, or:

```bash
npm i -g vercel
vercel --prod
```

## How it works

- `src/components/FishingPoll.vue` — the poll UI (name, availability grid, add a
  date).
- `src/poll.js` — data layer with two backends behind one API: Supabase when
  configured, else `localStorage`. Subscribes to live changes so votes update in
  real time.
- `src/components/RodCursor.vue` — the fishing-rod cursor (the native cursor is
  hidden site-wide in `src/style.css`).

Your identity is remembered per browser (`localStorage`), so returning lets you
edit your own row.
