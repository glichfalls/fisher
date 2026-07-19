-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Creates the two tables the poll uses and opens them to anonymous (public)
-- read/write, since the poll has no login.

create table if not exists poll_dates (
  id         uuid primary key default gen_random_uuid(),
  day        date not null,
  created_at timestamptz not null default now()
);

create table if not exists poll_participants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  available  jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table poll_dates enable row level security;
alter table poll_participants enable row level security;

-- Public poll: anyone may read and add. (Tighten these if you ever add auth.)
create policy "dates read"   on poll_dates for select using (true);
create policy "dates insert" on poll_dates for insert with check (true);

create policy "participants read"   on poll_participants for select using (true);
create policy "participants insert" on poll_participants for insert with check (true);
create policy "participants update" on poll_participants for update using (true) with check (true);

-- Optional: let the app receive live updates when others vote.
alter publication supabase_realtime add table poll_dates;
alter publication supabase_realtime add table poll_participants;
