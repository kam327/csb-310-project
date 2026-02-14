# Gauge

A web app for college clubs and student organizations to consolidate **attendance**, **events**, and **meeting minutes** so data carries forward across leadership transitions.

## Features

- **QR code check-in** – Create events, get a unique QR code and link. Members scan or open the link to check in with their name (and optional email). Check-ins are stored and visible on the event page.
- **Members** – A single roster derived from check-ins. No more scattered spreadsheets when officers change.
- **Meeting minutes + AI** – Paste or type meeting notes. Click “Extract with AI” to fill a structured form (date, title, attendees, key decisions, action items). Edit and save to track over time.
- **Dashboard** – Overview of events, members, check-ins, and recent minutes.

Data is stored in the browser (localStorage) so you can run it locally without a backend. For production you’d replace this with a database. The app uses a **butter yellow** and **light green** color scheme.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Optional: AI extraction for meeting minutes

By default, meeting minutes use a simple heuristic parser (no API key). For better extraction:

1. Copy `.env.example` to `.env.local`.
2. Add your OpenAI API key: `OPENAI_API_KEY=sk-...`
3. Restart the dev server. The “Extract with AI” button will use GPT-4o-mini to parse minutes.

## Tech

- **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**
- **qrcode.react** for QR codes
- **lucide-react** for icons

## Project structure

- `src/app/` – Pages (home, dashboard, events, check-in, members, minutes)
- `src/app/api/extract-minutes/` – API route for AI/heuristic extraction
- `src/components/` – Nav
- `src/lib/store.ts` – In-memory + localStorage store for events, check-ins, members, minutes
- `src/types/` – Shared TypeScript types
