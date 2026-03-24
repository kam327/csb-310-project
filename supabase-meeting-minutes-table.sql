-- Run this in Supabase: SQL Editor → New query → paste → Run
-- Creates the meeting_minutes table so minutes are stored in the database
-- (instead of browser localStorage) and scoped to each club via RLS.

create table if not exists meeting_minutes (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references clubs(id) on delete cascade,
  title        text not null,
  meeting_date date not null,
  raw_text     text not null,
  event_id     uuid references events(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_meeting_minutes_club_id on meeting_minutes(club_id);

-- ─── Row-Level Security ────────────────────────────────────────────────
alter table meeting_minutes enable row level security;

-- Authenticated club members can read their own club's minutes
create policy "select meeting minutes (club)"
  on meeting_minutes for select
  to authenticated
  using (
    club_id = (select club_id from users where id = auth.uid())
  );

-- Authenticated club members can create minutes for their club
create policy "insert meeting minutes (club)"
  on meeting_minutes for insert
  to authenticated
  with check (
    club_id = (select club_id from users where id = auth.uid())
  );

-- Authenticated club members can update their club's minutes
create policy "update meeting minutes (club)"
  on meeting_minutes for update
  to authenticated
  using (
    club_id = (select club_id from users where id = auth.uid())
  )
  with check (
    club_id = (select club_id from users where id = auth.uid())
  );

-- Authenticated club members can delete their club's minutes
create policy "delete meeting minutes (club)"
  on meeting_minutes for delete
  to authenticated
  using (
    club_id = (select club_id from users where id = auth.uid())
  );
