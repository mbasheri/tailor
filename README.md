# Runway — Resume Tailor

A single-page, stateless tool: paste a job posting and your resume, and Runway
reads the role, applies the resume conventions for that kind of job, and
rewrites yours to match — using only what's actually in your resume, never
inventing experience. Review, edit, export a one-page ATS-safe PDF.

**Nothing is stored.** No accounts, no login, no database. Each visit is a fresh
session: upload your resume, get one tailored result, download it, done.

## How it works

```
1 · Job posting   paste text  OR  paste a URL → best-effort auto-pull
2 · Your resume   upload a PDF (text extracted locally)  OR  paste text
   → Tailor       Gemini classifies the role, applies its conventions,
                  and rewrites your resume from your real content only
   → Review/edit  see the detected role + what changed, edit anything
   → Export PDF   single-page, ATS-safe, streamed straight to download
```

### Privacy: contact info never leaves your machine

Before anything is sent to the model, your **name, email, phone, and profile
links are stripped locally** (`src/lib/contact.ts`) and replaced with
placeholders. Gemini only ever sees your experience, skills, and education. The
real contact block is re-attached locally afterward and rendered into the PDF.

### Anti-fabrication

The model is instructed to only rephrase, reorder, and select from your real
content — never to invent employers, metrics, tools, or responsibilities. Its
JSON output is validated with Zod before anything is rendered, and you review
and edit the result before exporting.

## Stack

- **Next.js 16** (App Router) + TypeScript, Tailwind CSS v4
- **Google Gemini** (`gemini-flash-latest`) via `@google/genai`, structured output
- **unpdf** for serverless-safe PDF text extraction
- **cheerio** for best-effort job-posting URL extraction
- **@react-pdf/renderer** for the ATS-safe single-page PDF

No database, no file storage — every route is stateless.

## Routes

| Route | Does |
|---|---|
| `POST /api/fetch-job` | URL → clean job-description text, graceful fallback to manual paste |
| `POST /api/parse-resume` | uploaded PDF → plain text (in-memory, nothing stored) |
| `POST /api/tailor` | `{ jobText, resumeText }` → `{ roleType, conventions[], content, changeNotes[] }` |
| `POST /api/export-pdf` | `{ content }` → streams a one-page PDF |

## Local setup

```bash
npm install
cp .env.example .env      # add your GEMINI_API_KEY
npm run dev
```

Get a free key from [Google AI Studio](https://aistudio.google.com/apikey).
Only one env var is required: `GEMINI_API_KEY` (optionally `GEMINI_MODEL`).

## Deploy to Vercel

1. Push the repo and import it into Vercel.
2. Add `GEMINI_API_KEY` in **Project Settings → Environment Variables**.
3. Deploy. The tailor/parse/export routes run on Vercel's Node runtime with a
   raised `maxDuration`; no database or storage to provision.

## Non-goals

No auto-apply, no form-filling, no job-board submission, no stored credentials,
and no scraping behind login walls or bot detection.
