# Runway — Job Application Command Center

A personal system of record for a job search. Runway helps you prep applications
fast — scoring, tailoring, cover letters, interview prep — while **you** review
and submit every application yourself. It is not an auto-apply bot, and it never
sends anything anywhere.

Everything persists server-side in Postgres from day one: resumes, tailored
documents, job history, analytics. Refreshing the page or coming back tomorrow
shows the same state.

## Stack

- **Next.js 16** (App Router) + TypeScript, Tailwind CSS v4
- **Postgres** (Vercel Postgres / Neon) via **Prisma 7** (pg driver adapter)
- **Vercel Blob** for generated PDF storage
- **Anthropic Claude** for all AI features, behind server-only routes
- **@react-pdf/renderer** for ATS-safe PDF export, **recharts** for analytics

## Features

| # | Feature | Where |
|---|---------|-------|
| 1 | Resume ↔ JD match scoring (0–100, matched/missing keywords, fit summary) | Job page → **Score match** |
| 2 | Kanban board + table view, 10-business-day follow-up flag | `/` and `/jobs` |
| 3 | Best-effort job-description auto-pull from a URL, with manual paste fallback | `/jobs/new` |
| 4 | Multiple base resume versions; AI suggests the best-fit; tailoring never overwrites a base | `/resumes`, Job page |
| 5 | 2–3 cover-letter style variants, editable, saved per job | Job page → **Cover letters** |
| 6 | 8–10 interview questions mapped to your real experience | Job page → **Interview prep** |
| 7 | Portfolio library; one most-relevant project auto-woven into documents | `/portfolio` |
| 8 | Analytics: response/interview rates, days-to-response, per-resume-version funnel | `/analytics` |

### Anti-fabrication guarantee

Every tailoring / cover-letter / interview prompt includes your full base resume
as ground truth and instructs Claude to **only rephrase, reorder, and select
from what you actually wrote** — never to invent employers, metrics, tools, or
responsibilities. All Claude calls return structured JSON that is validated with
Zod before anything is saved.

## Local setup

1. **Install** (also generates the Prisma client):

   ```bash
   npm install
   ```

2. **Environment** — copy the template and fill it in:

   ```bash
   cp .env.example .env
   ```

   | Var | Where to get it |
   |-----|-----------------|
   | `DATABASE_URL` | Vercel Postgres / Neon connection string (pooled) |
   | `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
   | `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob → connect project (optional locally) |

   Without `BLOB_READ_WRITE_TOKEN`, PDF export still works — it streams the file
   straight to your browser instead of persisting a Blob URL.

3. **Migrate + seed** the database:

   ```bash
   npm run db:migrate      # applies prisma/migrations to your DB
   npm run db:seed         # seeds two base resumes + a portfolio project
   ```

4. **Run**:

   ```bash
   npm run dev
   ```

## Deploy to Vercel

1. Push this repo and import it into Vercel.
2. Add environment variables in **Project Settings → Environment Variables**:
   `DATABASE_URL`, `ANTHROPIC_API_KEY`, `BLOB_READ_WRITE_TOKEN`. Never commit them.
3. The build command runs migrations automatically:

   ```
   prisma generate && prisma migrate deploy && next build
   ```

   This is wired as the `vercel-build` script, which Vercel prefers over `build`.
4. Seed the production database once (from your machine, with the production
   `DATABASE_URL` exported): `npm run db:seed`.

## Data model

`Resume` · `Job` · `TailoredDocument` · `Portfolio` · `InterviewPrep` — each row
carries a `userId` (defaulting to `"local"`) so real auth can be added later
without a schema rewrite. Tailored resumes and cover letters are always **new**
`TailoredDocument` rows linked to a job, so the base library stays clean and
every past version stays retrievable.

## Explicit non-goals

No automatic form-filling or submission to job boards. No storing of job-site
credentials. No scraping behind authentication walls or bypassing bot detection.
