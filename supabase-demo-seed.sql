-- ============================================================================
-- Gauge Demo Seed Data
-- ============================================================================
-- Run this in Supabase: SQL Editor → New query → paste → Run
--
-- BEFORE running this script:
--   1. Sign up through the Gauge app and complete onboarding (this creates
--      your auth account, user profile, AND your club automatically).
--   2. Go to Supabase → Table Editor → clubs, and copy your club's UUID.
--   3. Find-and-replace every occurrence of f1f0f30f-4e0b-4a6f-9afa-85c0793221e9 in this file
--      with your actual club UUID.
--
-- This script populates your existing club with:
--   • 8 events spanning Jan–Mar 2026
--   • ~66 attendance records from 12 fictional members
--   • 4 feedback surveys with 24 responses & ratings
--   • 3 critical action items
--   • 12 member dues records
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. EVENTS  (8 events, Jan – Mar 2026)                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO public.events
  (id, club_id, title, description, event_date, event_time, event_end_time, location, qr_token)
VALUES
  ('e0000000-0000-0000-0000-000000000001',
   'f1f0f30f-4e0b-4a6f-9afa-85c0793221e9',
   'General Body Meeting',
   'Kickoff meeting for the spring semester. Meet the officers and learn about upcoming events.',
   '2026-01-15', '18:00', '19:30',
   'Siebel Center Room 1404',
   'demo-qr-gbm-spring26'),

  ('e0000000-0000-0000-0000-000000000002',
   'f1f0f30f-4e0b-4a6f-9afa-85c0793221e9',
   'Workshop: Intro to Git',
   'Hands-on workshop covering Git basics, branching, merging, and pull requests.',
   '2026-01-29', '17:00', '18:30',
   'ECEB Room 2013',
   'demo-qr-git-workshop'),

  ('e0000000-0000-0000-0000-000000000003',
   'f1f0f30f-4e0b-4a6f-9afa-85c0793221e9',
   'Social: Game Night',
   'Casual game night with board games, snacks, and prizes.',
   '2026-02-05', '19:00', '21:00',
   'Illini Union Room 210',
   'demo-qr-game-night'),

  ('e0000000-0000-0000-0000-000000000004',
   'f1f0f30f-4e0b-4a6f-9afa-85c0793221e9',
   'Guest Speaker: AI in Industry',
   'Dr. Sarah Lin from Anthropic discusses real-world AI applications and career paths.',
   '2026-02-12', '18:00', '19:30',
   'Siebel Center Auditorium',
   'demo-qr-ai-speaker'),

  ('e0000000-0000-0000-0000-000000000005',
   'f1f0f30f-4e0b-4a6f-9afa-85c0793221e9',
   'Community Service Day',
   'Volunteering at the local food bank. Transportation provided from the union.',
   '2026-02-22', '09:00', '13:00',
   'Eastern Illinois Foodbank',
   'demo-qr-service-day'),

  ('e0000000-0000-0000-0000-000000000006',
   'f1f0f30f-4e0b-4a6f-9afa-85c0793221e9',
   'Resume Workshop',
   'Bring your resume for peer review and tips from industry recruiters.',
   '2026-03-05', '17:30', '19:00',
   'Career Center Room 306',
   'demo-qr-resume-ws'),

  ('e0000000-0000-0000-0000-000000000007',
   'f1f0f30f-4e0b-4a6f-9afa-85c0793221e9',
   'Officer Elections',
   'Annual election for next year''s executive board. All active members may vote.',
   '2026-03-12', '18:00', '19:00',
   'Siebel Center Room 1404',
   'demo-qr-elections'),

  ('e0000000-0000-0000-0000-000000000008',
   'f1f0f30f-4e0b-4a6f-9afa-85c0793221e9',
   'End of Semester Banquet',
   'Celebrate the semester with dinner, awards, and a slideshow of highlights.',
   '2026-03-19', '18:30', '21:00',
   'Illini Union Ballroom',
   'demo-qr-banquet');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. ATTENDANCE  (~66 records, 12 fictional members)                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Members:
--   Alex Johnson, Maria Garcia, James Chen, Priya Patel,
--   Tyler Williams, Sophie Kim, David Brown, Emma Wilson,
--   Ryan Martinez, Olivia Taylor, Noah Anderson, Ava Thomas

-- Event 1: General Body Meeting — 2026-01-15 18:00
INSERT INTO public.attendance (event_id, member_name, member_email, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Alex Johnson',    'alex.johnson@illinois.edu',   '2026-01-15T18:03:00Z'),
  ('e0000000-0000-0000-0000-000000000001', 'Maria Garcia',    'maria.garcia@illinois.edu',   '2026-01-15T18:05:00Z'),
  ('e0000000-0000-0000-0000-000000000001', 'James Chen',      'james.chen@illinois.edu',     '2026-01-15T18:06:00Z'),
  ('e0000000-0000-0000-0000-000000000001', 'Priya Patel',     'priya.patel@illinois.edu',    '2026-01-15T18:08:00Z'),
  ('e0000000-0000-0000-0000-000000000001', 'Tyler Williams',  'tyler.williams@illinois.edu', '2026-01-15T18:10:00Z'),
  ('e0000000-0000-0000-0000-000000000001', 'Sophie Kim',      'sophie.kim@illinois.edu',     '2026-01-15T18:12:00Z'),
  ('e0000000-0000-0000-0000-000000000001', 'David Brown',     'david.brown@illinois.edu',    '2026-01-15T18:14:00Z'),
  ('e0000000-0000-0000-0000-000000000001', 'Emma Wilson',     'emma.wilson@illinois.edu',    '2026-01-15T18:17:00Z'),
  ('e0000000-0000-0000-0000-000000000001', 'Ryan Martinez',   'ryan.martinez@illinois.edu',  '2026-01-15T18:20:00Z'),
  ('e0000000-0000-0000-0000-000000000001', 'Olivia Taylor',   'olivia.taylor@illinois.edu',  '2026-01-15T18:25:00Z');

-- Event 2: Workshop — Intro to Git — 2026-01-29 17:00
INSERT INTO public.attendance (event_id, member_name, member_email, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000002', 'Alex Johnson',    'alex.johnson@illinois.edu',   '2026-01-29T17:02:00Z'),
  ('e0000000-0000-0000-0000-000000000002', 'Maria Garcia',    'maria.garcia@illinois.edu',   '2026-01-29T17:04:00Z'),
  ('e0000000-0000-0000-0000-000000000002', 'James Chen',      'james.chen@illinois.edu',     '2026-01-29T17:05:00Z'),
  ('e0000000-0000-0000-0000-000000000002', 'Priya Patel',     'priya.patel@illinois.edu',    '2026-01-29T17:07:00Z'),
  ('e0000000-0000-0000-0000-000000000002', 'Sophie Kim',      'sophie.kim@illinois.edu',     '2026-01-29T17:10:00Z'),
  ('e0000000-0000-0000-0000-000000000002', 'Emma Wilson',     'emma.wilson@illinois.edu',    '2026-01-29T17:12:00Z'),
  ('e0000000-0000-0000-0000-000000000002', 'Noah Anderson',   'noah.anderson@illinois.edu',  '2026-01-29T17:15:00Z'),
  ('e0000000-0000-0000-0000-000000000002', 'Ava Thomas',      'ava.thomas@illinois.edu',     '2026-01-29T17:18:00Z');

-- Event 3: Social — Game Night — 2026-02-05 19:00
INSERT INTO public.attendance (event_id, member_name, member_email, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000003', 'Alex Johnson',    'alex.johnson@illinois.edu',   '2026-02-05T19:05:00Z'),
  ('e0000000-0000-0000-0000-000000000003', 'Maria Garcia',    'maria.garcia@illinois.edu',   '2026-02-05T19:08:00Z'),
  ('e0000000-0000-0000-0000-000000000003', 'Tyler Williams',  'tyler.williams@illinois.edu', '2026-02-05T19:10:00Z'),
  ('e0000000-0000-0000-0000-000000000003', 'David Brown',     'david.brown@illinois.edu',    '2026-02-05T19:13:00Z'),
  ('e0000000-0000-0000-0000-000000000003', 'Emma Wilson',     'emma.wilson@illinois.edu',    '2026-02-05T19:16:00Z'),
  ('e0000000-0000-0000-0000-000000000003', 'Ryan Martinez',   'ryan.martinez@illinois.edu',  '2026-02-05T19:20:00Z'),
  ('e0000000-0000-0000-0000-000000000003', 'Ava Thomas',      'ava.thomas@illinois.edu',     '2026-02-05T19:22:00Z');

-- Event 4: Guest Speaker — AI in Industry — 2026-02-12 18:00
INSERT INTO public.attendance (event_id, member_name, member_email, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000004', 'Alex Johnson',    'alex.johnson@illinois.edu',   '2026-02-12T18:02:00Z'),
  ('e0000000-0000-0000-0000-000000000004', 'Maria Garcia',    'maria.garcia@illinois.edu',   '2026-02-12T18:04:00Z'),
  ('e0000000-0000-0000-0000-000000000004', 'James Chen',      'james.chen@illinois.edu',     '2026-02-12T18:05:00Z'),
  ('e0000000-0000-0000-0000-000000000004', 'Priya Patel',     'priya.patel@illinois.edu',    '2026-02-12T18:07:00Z'),
  ('e0000000-0000-0000-0000-000000000004', 'Tyler Williams',  'tyler.williams@illinois.edu', '2026-02-12T18:09:00Z'),
  ('e0000000-0000-0000-0000-000000000004', 'Sophie Kim',      'sophie.kim@illinois.edu',     '2026-02-12T18:11:00Z'),
  ('e0000000-0000-0000-0000-000000000004', 'David Brown',     'david.brown@illinois.edu',    '2026-02-12T18:14:00Z'),
  ('e0000000-0000-0000-0000-000000000004', 'Olivia Taylor',   'olivia.taylor@illinois.edu',  '2026-02-12T18:18:00Z'),
  ('e0000000-0000-0000-0000-000000000004', 'Noah Anderson',   'noah.anderson@illinois.edu',  '2026-02-12T18:21:00Z');

-- Event 5: Community Service Day — 2026-02-22 09:00
INSERT INTO public.attendance (event_id, member_name, member_email, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000005', 'Alex Johnson',    'alex.johnson@illinois.edu',   '2026-02-22T09:03:00Z'),
  ('e0000000-0000-0000-0000-000000000005', 'Priya Patel',     'priya.patel@illinois.edu',    '2026-02-22T09:05:00Z'),
  ('e0000000-0000-0000-0000-000000000005', 'Sophie Kim',      'sophie.kim@illinois.edu',     '2026-02-22T09:08:00Z'),
  ('e0000000-0000-0000-0000-000000000005', 'Emma Wilson',     'emma.wilson@illinois.edu',    '2026-02-22T09:10:00Z'),
  ('e0000000-0000-0000-0000-000000000005', 'Olivia Taylor',   'olivia.taylor@illinois.edu',  '2026-02-22T09:14:00Z'),
  ('e0000000-0000-0000-0000-000000000005', 'Ava Thomas',      'ava.thomas@illinois.edu',     '2026-02-22T09:17:00Z');

-- Event 6: Resume Workshop — 2026-03-05 17:30
INSERT INTO public.attendance (event_id, member_name, member_email, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000006', 'Maria Garcia',    'maria.garcia@illinois.edu',   '2026-03-05T17:33:00Z'),
  ('e0000000-0000-0000-0000-000000000006', 'James Chen',      'james.chen@illinois.edu',     '2026-03-05T17:35:00Z'),
  ('e0000000-0000-0000-0000-000000000006', 'Priya Patel',     'priya.patel@illinois.edu',    '2026-03-05T17:37:00Z'),
  ('e0000000-0000-0000-0000-000000000006', 'Tyler Williams',  'tyler.williams@illinois.edu', '2026-03-05T17:40:00Z'),
  ('e0000000-0000-0000-0000-000000000006', 'David Brown',     'david.brown@illinois.edu',    '2026-03-05T17:43:00Z'),
  ('e0000000-0000-0000-0000-000000000006', 'Ryan Martinez',   'ryan.martinez@illinois.edu',  '2026-03-05T17:46:00Z'),
  ('e0000000-0000-0000-0000-000000000006', 'Noah Anderson',   'noah.anderson@illinois.edu',  '2026-03-05T17:50:00Z');

-- Event 7: Officer Elections — 2026-03-12 18:00
INSERT INTO public.attendance (event_id, member_name, member_email, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000007', 'Alex Johnson',    'alex.johnson@illinois.edu',   '2026-03-12T18:02:00Z'),
  ('e0000000-0000-0000-0000-000000000007', 'Maria Garcia',    'maria.garcia@illinois.edu',   '2026-03-12T18:04:00Z'),
  ('e0000000-0000-0000-0000-000000000007', 'James Chen',      'james.chen@illinois.edu',     '2026-03-12T18:06:00Z'),
  ('e0000000-0000-0000-0000-000000000007', 'Priya Patel',     'priya.patel@illinois.edu',    '2026-03-12T18:08:00Z'),
  ('e0000000-0000-0000-0000-000000000007', 'Tyler Williams',  'tyler.williams@illinois.edu', '2026-03-12T18:10:00Z'),
  ('e0000000-0000-0000-0000-000000000007', 'Sophie Kim',      'sophie.kim@illinois.edu',     '2026-03-12T18:13:00Z'),
  ('e0000000-0000-0000-0000-000000000007', 'Emma Wilson',     'emma.wilson@illinois.edu',    '2026-03-12T18:16:00Z'),
  ('e0000000-0000-0000-0000-000000000007', 'Olivia Taylor',   'olivia.taylor@illinois.edu',  '2026-03-12T18:20:00Z');

-- Event 8: End of Semester Banquet — 2026-03-19 18:30
INSERT INTO public.attendance (event_id, member_name, member_email, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000008', 'Alex Johnson',    'alex.johnson@illinois.edu',   '2026-03-19T18:33:00Z'),
  ('e0000000-0000-0000-0000-000000000008', 'Maria Garcia',    'maria.garcia@illinois.edu',   '2026-03-19T18:35:00Z'),
  ('e0000000-0000-0000-0000-000000000008', 'James Chen',      'james.chen@illinois.edu',     '2026-03-19T18:37:00Z'),
  ('e0000000-0000-0000-0000-000000000008', 'Priya Patel',     'priya.patel@illinois.edu',    '2026-03-19T18:39:00Z'),
  ('e0000000-0000-0000-0000-000000000008', 'Tyler Williams',  'tyler.williams@illinois.edu', '2026-03-19T18:41:00Z'),
  ('e0000000-0000-0000-0000-000000000008', 'Sophie Kim',      'sophie.kim@illinois.edu',     '2026-03-19T18:43:00Z'),
  ('e0000000-0000-0000-0000-000000000008', 'David Brown',     'david.brown@illinois.edu',    '2026-03-19T18:46:00Z'),
  ('e0000000-0000-0000-0000-000000000008', 'Emma Wilson',     'emma.wilson@illinois.edu',    '2026-03-19T18:49:00Z'),
  ('e0000000-0000-0000-0000-000000000008', 'Ryan Martinez',   'ryan.martinez@illinois.edu',  '2026-03-19T18:52:00Z'),
  ('e0000000-0000-0000-0000-000000000008', 'Olivia Taylor',   'olivia.taylor@illinois.edu',  '2026-03-19T18:55:00Z'),
  ('e0000000-0000-0000-0000-000000000008', 'Noah Anderson',   'noah.anderson@illinois.edu',  '2026-03-19T18:58:00Z');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. FEEDBACK SURVEYS  (4 events)                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO public.feedback_surveys (id, event_id, question_1, question_2, question_3) VALUES
  ('f0000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000001',
   'What did you enjoy most about the General Body Meeting?',
   'What topics would you like covered this semester?',
   'Any suggestions for improving future meetings?'),

  ('f0000000-0000-0000-0000-000000000002',
   'e0000000-0000-0000-0000-000000000002',
   'How useful was the Git workshop for your coursework?',
   'What other technical workshops would you attend?',
   'Was the pace of the workshop appropriate?'),

  ('f0000000-0000-0000-0000-000000000003',
   'e0000000-0000-0000-0000-000000000004',
   'What was the most valuable takeaway from the speaker?',
   'Would you attend more guest speaker events?',
   'Any speakers or companies you would like us to invite?'),

  ('f0000000-0000-0000-0000-000000000004',
   'e0000000-0000-0000-0000-000000000006',
   'Did the resume workshop help improve your resume?',
   'What part of the workshop was most helpful?',
   'Would you be interested in a mock interview event?');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. SURVEY RESPONSES  (24 responses with ratings 1–5)                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- GBM survey responses (6 responses, avg ~4.2)
INSERT INTO public.survey_responses
  (survey_id, rating, answer_1, answer_2, answer_3, respondent_name, respondent_email) VALUES
  ('f0000000-0000-0000-0000-000000000001', 5,
   'Loved meeting the officers and hearing the semester plan.',
   'More hands-on coding workshops please!',
   'Maybe add a Q&A segment at the end.',
   'Alex Johnson', 'alex.johnson@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000001', 4,
   'The free pizza was great. Also liked the icebreakers.',
   'AI/ML topics would be awesome.',
   'Could start a few minutes later for people coming from class.',
   'Maria Garcia', 'maria.garcia@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000001', 5,
   'Great energy and well-organized.',
   'Web development and cloud computing.',
   NULL,
   'James Chen', 'james.chen@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000001', 3,
   'It was okay, a bit long.',
   'Interview prep sessions.',
   'Keep it under an hour if possible.',
   'Tyler Williams', 'tyler.williams@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000001', 4,
   'Good overview of what the club does.',
   'Cybersecurity topics.',
   NULL,
   'Sophie Kim', 'sophie.kim@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000001', 4,
   'Nice to see so many new faces!',
   'Data science workshops.',
   'More snack variety would be nice.',
   'Emma Wilson', 'emma.wilson@illinois.edu');

-- Git Workshop survey responses (7 responses, avg ~4.4)
INSERT INTO public.survey_responses
  (survey_id, rating, answer_1, answer_2, answer_3, respondent_name, respondent_email) VALUES
  ('f0000000-0000-0000-0000-000000000002', 5,
   'Super helpful for my CS 225 projects.',
   'Docker and containers.',
   'Pace was perfect.',
   'Alex Johnson', 'alex.johnson@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000002', 5,
   'Finally understand branching and merging!',
   'React or Next.js workshop.',
   'Great pace, maybe a tiny bit fast at the end.',
   'Priya Patel', 'priya.patel@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000002', 4,
   'Good refresher, learned some new tricks.',
   'Linux command line basics.',
   'Good pace overall.',
   'Sophie Kim', 'sophie.kim@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000002', 4,
   'The pull request demo was really clear.',
   'Database design workshop.',
   'Slightly too fast for total beginners.',
   'Emma Wilson', 'emma.wilson@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000002', 5,
   'Best workshop this semester.',
   'CI/CD pipelines.',
   'Perfect pacing.',
   'Noah Anderson', 'noah.anderson@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000002', 4,
   'Learned a lot about merge conflicts.',
   'Python automation.',
   'Maybe offer a cheat sheet handout.',
   'Ava Thomas', 'ava.thomas@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000002', 5,
   'Very practical and well-structured.',
   'AWS / cloud basics.',
   'Pace was just right.',
   'Maria Garcia', 'maria.garcia@illinois.edu');

-- Guest Speaker survey responses (5 responses, avg ~4.6)
INSERT INTO public.survey_responses
  (survey_id, rating, answer_1, answer_2, answer_3, respondent_name, respondent_email) VALUES
  ('f0000000-0000-0000-0000-000000000003', 5,
   'The discussion about RLHF was fascinating.',
   'Definitely, these are the best events.',
   'Someone from Google or Apple would be cool.',
   'James Chen', 'james.chen@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000003', 5,
   'Learned so much about real AI workflows.',
   'Yes, absolutely.',
   'Any startup founders in the area.',
   'Priya Patel', 'priya.patel@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000003', 4,
   'Great insight into non-academic AI careers.',
   'Yes, maybe once a month.',
   'More time for audience questions.',
   'Tyler Williams', 'tyler.williams@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000003', 5,
   'Inspiring talk, made me want to explore ML research.',
   'For sure, highlight of the semester.',
   'NVIDIA or Meta would be amazing.',
   'Sophie Kim', 'sophie.kim@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000003', 4,
   'Really enjoyed the career advice portion.',
   'Yes, very valuable.',
   NULL,
   'Olivia Taylor', 'olivia.taylor@illinois.edu');

-- Resume Workshop survey responses (6 responses, avg ~3.8)
INSERT INTO public.survey_responses
  (survey_id, rating, answer_1, answer_2, answer_3, respondent_name, respondent_email) VALUES
  ('f0000000-0000-0000-0000-000000000004', 4,
   'Yes, got great feedback on my bullet points.',
   'The peer review section.',
   'Absolutely, mock interviews would be great.',
   'Maria Garcia', 'maria.garcia@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000004', 3,
   'Somewhat, but I wish there were more recruiters.',
   'The template examples.',
   'Yes, especially for technical roles.',
   'James Chen', 'james.chen@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000004', 4,
   'Rewrote my entire experience section after this.',
   'One-on-one feedback time.',
   'Would love a mock interview night.',
   'Priya Patel', 'priya.patel@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000004', 5,
   'Completely transformed my resume layout.',
   'Hearing what recruiters actually look for.',
   'Yes please!',
   'Tyler Williams', 'tyler.williams@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000004', 3,
   'Helpful but felt rushed.',
   'The formatting tips.',
   'Maybe, depends on timing.',
   'David Brown', 'david.brown@illinois.edu'),
  ('f0000000-0000-0000-0000-000000000004', 4,
   'Good event, would attend again.',
   'Industry-specific resume advice.',
   'Definitely interested in mock interviews.',
   'Ryan Martinez', 'ryan.martinez@illinois.edu');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5. CRITICAL ACTION ITEMS  (3 items)                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO public.critical_action_items
  (club_id, task, assignee_email, due_date, reminder_sent) VALUES
  ('f1f0f30f-4e0b-4a6f-9afa-85c0793221e9',
   'Book Siebel Center auditorium for April tech talk',
   'alex.johnson@illinois.edu',
   '2026-04-01', false),
  ('f1f0f30f-4e0b-4a6f-9afa-85c0793221e9',
   'Submit end-of-year budget report to Student Affairs',
   'maria.garcia@illinois.edu',
   '2026-04-10', false),
  ('f1f0f30f-4e0b-4a6f-9afa-85c0793221e9',
   'Finalize new officer onboarding document',
   'james.chen@illinois.edu',
   '2026-03-28', false);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  6. MEMBER DUES  (12 members, mixed paid/unpaid)                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO public.member_dues (club_id, member_email, dues_paid) VALUES
  ('f1f0f30f-4e0b-4a6f-9afa-85c0793221e9', 'alex.johnson@illinois.edu',    true),
  ('f1f0f30f-4e0b-4a6f-9afa-85c0793221e9', 'maria.garcia@illinois.edu',    true),
  ('f1f0f30f-4e0b-4a6f-9afa-85c0793221e9', 'james.chen@illinois.edu',      true),
  ('f1f0f30f-4e0b-4a6f-9afa-85c0793221e9', 'priya.patel@illinois.edu',     true),
  ('f1f0f30f-4e0b-4a6f-9afa-85c0793221e9', 'tyler.williams@illinois.edu',  false),
  ('f1f0f30f-4e0b-4a6f-9afa-85c0793221e9', 'sophie.kim@illinois.edu',      true),
  ('f1f0f30f-4e0b-4a6f-9afa-85c0793221e9', 'david.brown@illinois.edu',     false),
  ('f1f0f30f-4e0b-4a6f-9afa-85c0793221e9', 'emma.wilson@illinois.edu',     true),
  ('f1f0f30f-4e0b-4a6f-9afa-85c0793221e9', 'ryan.martinez@illinois.edu',   false),
  ('f1f0f30f-4e0b-4a6f-9afa-85c0793221e9', 'olivia.taylor@illinois.edu',   true),
  ('f1f0f30f-4e0b-4a6f-9afa-85c0793221e9', 'noah.anderson@illinois.edu',   true),
  ('f1f0f30f-4e0b-4a6f-9afa-85c0793221e9', 'ava.thomas@illinois.edu',      false);

COMMIT;

-- ============================================================================
-- Done! Log in to the Gauge app and you should see your club populated with
-- 8 events, attendance records, survey responses, action items, and dues.
--
-- To remove all demo data later, delete the seeded events (cascading deletes
-- will clean up attendance, surveys, responses, etc.):
--
--   DELETE FROM public.events WHERE id IN (
--     'e0000000-0000-0000-0000-000000000001',
--     'e0000000-0000-0000-0000-000000000002',
--     'e0000000-0000-0000-0000-000000000003',
--     'e0000000-0000-0000-0000-000000000004',
--     'e0000000-0000-0000-0000-000000000005',
--     'e0000000-0000-0000-0000-000000000006',
--     'e0000000-0000-0000-0000-000000000007',
--     'e0000000-0000-0000-0000-000000000008'
--   );
--   DELETE FROM public.critical_action_items
--     WHERE task LIKE 'Book Siebel%' OR task LIKE 'Submit end-of-year%' OR task LIKE 'Finalize new officer%';
--   DELETE FROM public.member_dues
--     WHERE member_email LIKE '%@illinois.edu';
-- ============================================================================
