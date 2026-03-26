-- Run this in Supabase: SQL Editor → New query → paste → Run
-- Migrates the schema to tie critical tasks to events, add event categories,
-- and drop the meeting_minutes table.

-- ─── 1. Critical action items: link to events + completion flag ──────────────
ALTER TABLE public.critical_action_items
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.critical_action_items
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;

-- Update policy: allow club members to update their own club's action items (for toggling completed)
DROP POLICY IF EXISTS "update critical action items (club)" ON public.critical_action_items;
CREATE POLICY "update critical action items (club)"
ON public.critical_action_items
FOR UPDATE
TO authenticated
USING (
  club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
)
WITH CHECK (
  club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
);

-- Delete policy (already may exist from prior setup, ensure it's present)
DROP POLICY IF EXISTS "delete critical action items (club)" ON public.critical_action_items;
CREATE POLICY "delete critical action items (club)"
ON public.critical_action_items
FOR DELETE
TO authenticated
USING (
  club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
);

-- ─── 2. Events: add category column ─────────────────────────────────────────
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS category text;

-- ─── 3. Event categories table (customisable per club) ──────────────────────
CREATE TABLE IF NOT EXISTS public.event_categories (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  UNIQUE (club_id, name)
);

ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select event categories (club)" ON public.event_categories;
CREATE POLICY "select event categories (club)"
ON public.event_categories
FOR SELECT
TO authenticated
USING (
  club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "insert event categories (club)" ON public.event_categories;
CREATE POLICY "insert event categories (club)"
ON public.event_categories
FOR INSERT
TO authenticated
WITH CHECK (
  club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "delete event categories (club)" ON public.event_categories;
CREATE POLICY "delete event categories (club)"
ON public.event_categories
FOR DELETE
TO authenticated
USING (
  club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
);

-- ─── 4. Drop meeting minutes ─────────────────────────────────────────────────
DROP TABLE IF EXISTS public.meeting_minutes;
