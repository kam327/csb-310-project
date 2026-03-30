-- Run this in Supabase SQL Editor to enable/disable dashboard Trends on a per-club basis.
-- This adds a single boolean flag used by:
--   - `src/app/settings/club/page.tsx`
--   - `src/app/page.tsx` (main dashboard)

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS show_dashboard_trends boolean NOT NULL DEFAULT true;

