-- Run this in Supabase: SQL Editor → New query → paste → Run
-- Clubs + users (sign-up), then events + attendance (club data and public check-in).
-- If you already ran the club/user policies, skip to "EVENTS" and "ATTENDANCE" and run those (or drop existing policies first).

-- Optional: add member name to attendance for check-in form (if your table only had member_email)
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS member_name text;

-- Optional: store member display name + email on profile rows for nicer UI
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;

-- Fix: ensure `public.users.id` references the authenticated user (auth.users.id)
-- If this FK points somewhere else, onboarding will fail with: users_id_fkey
-- Also handles cases where the FK constraint name is different.
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN unnest(c.conkey) AS key(attnum) ON true
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = key.attnum
    WHERE n.nspname = 'public'
      AND t.relname = 'users'
      AND c.contype = 'f'
      AND a.attname = 'id'
  ) LOOP
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- If this errors, your `public.users.id` column is not uuid (or contains non-uuid values).
-- In that case, fix the column type first (dev-only example):
--   ALTER TABLE public.users ALTER COLUMN id TYPE uuid USING id::uuid;
ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users (id)
  ON DELETE CASCADE
  NOT VALID;

-- Optional (recommended): validate existing rows. This can fail if you already have orphaned rows in public.users.
-- If it fails, you can either delete the orphaned rows (dev) or fix them, then re-run VALIDATE.
-- ALTER TABLE public.users VALIDATE CONSTRAINT users_id_fkey;

-- Optional: support joining an existing club via a short code
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS join_code text;
CREATE UNIQUE INDEX IF NOT EXISTS clubs_join_code_unique ON public.clubs (join_code);
UPDATE public.clubs
SET join_code = COALESCE(join_code, upper(substr(md5(random()::text), 1, 8)))
WHERE join_code IS NULL;

-- ========== CLUBS ==========
DROP POLICY IF EXISTS "select clubs (authenticated)" ON public.clubs;
CREATE POLICY "select clubs (authenticated)"
ON public.clubs
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "insert club (authenticated)" ON public.clubs;
CREATE POLICY "insert club (authenticated)"
ON public.clubs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ========== USERS ==========
-- Required so the app can load `profile` after login (and so other RLS subqueries work).
DROP POLICY IF EXISTS "select own profile" ON public.users;
CREATE POLICY "select own profile"
ON public.users
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Allow an authenticated user to see all profile rows (dev-friendly; tighten later if needed)
DROP POLICY IF EXISTS "select users (same club)" ON public.users;
DROP POLICY IF EXISTS "select users (all auth)" ON public.users;
CREATE POLICY "select users (all auth)"
ON public.users
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "insert own profile" ON public.users;
CREATE POLICY "insert own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "update own profile" ON public.users;
CREATE POLICY "update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ========== EVENTS (club-scoped for auth; anon can read for check-in page) ==========
DROP POLICY IF EXISTS "select events (club)" ON public.events;
CREATE POLICY "select events (club)"
ON public.events
FOR SELECT
TO authenticated
USING (
  club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "select events (anon for check-in)" ON public.events;
CREATE POLICY "select events (anon for check-in)"
ON public.events
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "insert events (club)" ON public.events;
CREATE POLICY "insert events (club)"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "update events (club)" ON public.events;
CREATE POLICY "update events (club)"
ON public.events
FOR UPDATE
TO authenticated
USING (
  club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
)
WITH CHECK (
  club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "delete events (club)" ON public.events;
CREATE POLICY "delete events (club)"
ON public.events
FOR DELETE
TO authenticated
USING (
  club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
);

-- ========== ATTENDANCE (club-scoped for auth; anon can insert for check-in) ==========
DROP POLICY IF EXISTS "select attendance (club)" ON public.attendance;
CREATE POLICY "select attendance (club)"
ON public.attendance
FOR SELECT
TO authenticated
USING (
  event_id IN (
    SELECT id FROM public.events
    WHERE club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "insert attendance (anon check-in)" ON public.attendance;
CREATE POLICY "insert attendance (anon check-in)"
ON public.attendance
FOR INSERT
TO anon
WITH CHECK (
  event_id IN (SELECT id FROM public.events)
);

DROP POLICY IF EXISTS "insert attendance (club)" ON public.attendance;
CREATE POLICY "insert attendance (club)"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (
  event_id IN (
    SELECT id FROM public.events
    WHERE club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
  )
);
