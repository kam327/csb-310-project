-- Feedback Surveys: one per event, stores up to 3 custom open-ended questions
create table if not exists feedback_surveys (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  question_1  text,
  question_2  text,
  question_3  text,
  created_at  timestamptz not null default now()
);

-- Survey Responses: one per respondent per survey
create table if not exists survey_responses (
  id               uuid primary key default gen_random_uuid(),
  survey_id        uuid not null references feedback_surveys(id) on delete cascade,
  rating           integer not null check (rating between 1 and 5),
  answer_1         text,
  answer_2         text,
  answer_3         text,
  respondent_name  text,
  respondent_email text,
  created_at       timestamptz not null default now()
);

-- Index for fast lookup of surveys by event
create index if not exists idx_feedback_surveys_event_id on feedback_surveys(event_id);

-- Index for fast lookup of responses by survey
create index if not exists idx_survey_responses_survey_id on survey_responses(survey_id);

-- ─── Row-Level Security ────────────────────────────────────────────────
-- Matches the existing RLS pattern: authenticated users can read/write
-- within their own club; anonymous users can insert responses (public survey).

alter table feedback_surveys enable row level security;
alter table survey_responses enable row level security;

-- Authenticated club members can manage surveys for their club's events
create policy "Club members can read surveys"
  on feedback_surveys for select
  using (
    event_id in (
      select e.id from events e
      where e.club_id = (select club_id from users where id = auth.uid())
    )
  );

create policy "Club members can create surveys"
  on feedback_surveys for insert
  with check (
    event_id in (
      select e.id from events e
      where e.club_id = (select club_id from users where id = auth.uid())
    )
  );

-- Anyone (including anonymous) can read a survey (needed for the public form)
create policy "Anyone can read surveys for public form"
  on feedback_surveys for select
  using (true);

-- Anyone can submit a survey response (public)
create policy "Anyone can submit survey responses"
  on survey_responses for insert
  with check (true);

-- Authenticated club members can read responses for their club's surveys
create policy "Club members can read survey responses"
  on survey_responses for select
  using (
    survey_id in (
      select fs.id from feedback_surveys fs
      join events e on e.id = fs.event_id
      where e.club_id = (select club_id from users where id = auth.uid())
    )
  );

-- Anyone can read survey responses on the public form (for the "already submitted" case)
create policy "Anyone can read survey responses"
  on survey_responses for select
  using (true);
