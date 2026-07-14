# Daham Lanka (PVT) LTD — Client Flight Tracker

Internal tool for the office to record inbound clients per destination country and share a private, read-only arrival schedule with in-country agents.

## How it works

- **Admin console (`/`)** — pick country, enter batch + passenger details, upload the airline ticket PDF and the flight info (airline, flight #, PNR, airports, dates/times) is auto-filled. PDFs are **read only**, never stored.
- **Agent link (`/agent/<token>`)** — each country has a unique unguessable URL. Anyone with the link can see that country's upcoming arrivals grouped by batch, sorted by arrival date/time. No login required, but the token is not discoverable.
- No user accounts, no sign-in.

## Tech stack

React 19 + TanStack Start (Vite) · TailwindCSS · Supabase (Postgres + REST) · Google Gemini for PDF extraction.

## Environment variables

Copy `.env.example` (or create `.env`) with:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable / anon key>
VITE_SUPABASE_PROJECT_ID=<project ref>

SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable / anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server only

DAHAM_LANKA_API_KEY=<AI gateway key for PDF parsing>   # server only
```

The `VITE_*` variants are bundled into the browser; the unprefixed ones are read only by server functions.

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel → **New Project** → import the repo. Framework preset: **Vite** (build `bun run build`, output `dist`).
3. Under **Project → Settings → Environment Variables**, paste every variable listed above (Production + Preview).
4. Deploy. That's it — the same code works on any host because Supabase is contacted purely via the env vars.

### Switching Supabase projects

To point at a different Supabase instance later, only the env vars change — no code edits. Run the SQL in `supabase/migrations/` against the new project to recreate the `countries` and `clients` tables and their policies, then update the env vars in Vercel and redeploy.

## Local dev

```
bun install
bun run dev
```

Open http://localhost:8080.
