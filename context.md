Gauge — Full Technical Architecture & Hosting Context
1. Product Overview

Gauge is a web-based SaaS platform that helps student organizations:

Create structured event records

Generate QR codes for attendance

Track member participation

Record event costs

View historical dashboards

Preserve institutional knowledge across leadership transitions

Core product principle:

Turn every event into structured data that compounds over time.

2. Architecture Philosophy

Gauge uses a serverless, frontend-heavy architecture.

We do NOT run a custom backend server.

Instead:

Frontend is hosted on Vercel

Backend is fully managed by Supabase

This minimizes:

DevOps overhead

Hosting costs

Infrastructure complexity

3. Hosting Setup
Frontend Hosting

Hosted on: Vercel

Connects directly to GitHub

Auto-deploys on every push

Free tier

Automatic HTTPS

Supports custom domains

Optimized for Next.js

Public URL example:

https://gauge.vercel.app
Backend Hosting

Hosted on: Supabase

Supabase provides:

PostgreSQL database

Authentication

Row-Level Security (RLS)

Storage (optional)

Edge functions (optional)

No manual backend deployment required.

4. System Architecture Diagram
User Browser
      ↓
Next.js Frontend (Vercel)
      ↓
Supabase JS Client
      ↓
Supabase
  - PostgreSQL
  - Auth
  - RLS Policies
5. Technology Stack

Frontend:

Next.js

React

Tailwind CSS

Supabase JS SDK

Backend:

Supabase (PostgreSQL + Auth + RLS)

Hosting:

Vercel (frontend)

Supabase (backend)

Cost for MVP: $0

6. Database Schema (Supabase / PostgreSQL)
clubs

id (uuid, PK)

name (text)

university_name (text)

created_at (timestamp)

users (profile table)

Supabase provides auth.users, but we create a public profile table:

id (uuid, PK, references auth.users)

club_id (uuid, FK → clubs.id)

role (text: president, treasurer, officer)

created_at (timestamp)

events

id (uuid, PK)

club_id (uuid, FK → clubs.id)

title (text)

description (text)

event_date (timestamp)

location (text)

qr_token (text, unique)

created_at (timestamp)

attendance

id (uuid, PK)

event_id (uuid, FK → events.id)

member_email (text)

created_at (timestamp)

Constraint:

UNIQUE (event_id, member_email)

Prevents duplicate check-in.

event_costs

id (uuid, PK)

event_id (uuid, FK → events.id)

category (text)

amount (numeric)

notes (text)

created_at (timestamp)

survey_responses (Optional for MVP)

id (uuid, PK)

event_id (uuid, FK → events.id)

rating (integer)

feedback (text)

created_at (timestamp)

7. Multi-Tenancy Model

Each user belongs to exactly one club.

All core tables contain club_id (directly or via relationship).

Data isolation is enforced using Supabase Row-Level Security (RLS).

Rule:

A user may only access data belonging to their club.

8. Row-Level Security (RLS)

All tables enforce:

SELECT limited to user’s club

INSERT only if club matches

UPDATE limited to club

DELETE limited to club

Example RLS logic:

club_id = (
  select club_id from users
  where id = auth.uid()
)

RLS is mandatory for production.

9. Core Workflows
1. Authentication

Handled entirely by Supabase:

Email/password

Magic link (recommended)

On first login:

Create profile row

Assign club_id

Assign role

2. Event Creation

Frontend inserts directly into Supabase:

Generate QR token via crypto.randomUUID()

Insert event record

Render QR code using token

QR URL format:

/checkin/{qr_token}
3. QR Check-In Flow

User scans QR

Frontend fetches event via qr_token

User submits email

Insert attendance record

Duplicate prevention handled by:

UNIQUE(event_id, member_email)

4. Cost Entry

Treasurer inserts into event_costs.

Dashboard calculates:

Total spend per event

Cost per attendee

Spending trends over time

5. Dashboard Aggregation

Frontend queries:

COUNT(attendance)

SUM(event_costs.amount)

AVG(survey_responses.rating)

Group by month

For complex logic:

Use SQL views in Supabase

10. Environment Variables (Vercel)

Set in Vercel dashboard:

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

Never expose:

Service role key

11. Security Model

Passwords hashed automatically by Supabase

JWT session management handled by Supabase

RLS enforces data boundaries

Public QR check-in endpoint can allow limited insert access

No service keys in frontend

12. Scaling Strategy

When usage grows:

Upgrade Supabase plan

Add SQL views or materialized views

Add edge functions for complex validation

Introduce analytics optimizations

Architecture supports scaling without rewriting core system.

13. Product Design Principles

Structured data over scattered documentation

Multi-tenant but isolated

Analytics-ready from day one

Serverless and low-maintenance

Free-tier deployable

Designed to compound value over time

14. Deployment Workflow

Develop locally

Push to GitHub

Vercel auto-deploys

Supabase already live

QR codes work publicly

Share link with real clubs

No local-only hosting.

Final Architecture Summary

Frontend:
Next.js on Vercel

Backend:
Supabase (Postgres + Auth + RLS)

Database:
Relational, analytics-ready

Cost:
Free for MVP

Security:
RLS-enforced multi-tenancy