# Tailor — we alter to perfection

A single-page, stateless tool: upload your resume and paste a job posting, and
Tailor rewords your resume to match the role — **preserving your resume's own
section order, headings, and structure** and only rewording the content within
it, never inventing experience. Review, edit, export a PDF.

**Nothing is stored.** No accounts, no login, no database. Each visit is a fresh
session: upload your resume, get one tailored result, download it, done.

## How it works

```
Your resume    upload a PDF (text extracted locally)  OR  paste text
Job posting    paste text  OR  paste a URL → best-effort auto-pull
   → Tailor    Gemini extracts your resume's structure (section order,
               headings, entry grouping) and rewords bullets to fit the role
   → Review    edit anything; the skeleton stays yours
   → Export    a PDF that follows your resume's structure
```

### Structure preservation (and its honest limits)

Tailor extracts the **structure** of your uploaded resume — the order of
sections, the section headings you used, and which bullets belong to which
entry — and preserves it. Only the wording of existing bullets is reworded and
reordered to match the posting.

What it does **not** do: reproduce the exact visual layout of your original PDF
(fonts, multi-column layouts, bold-word patterns, precise spacing). Extracted
PDF text does not carry that layout reliably, so the export re-renders your
preserved structure in one clean, consistent, ATS-safe single-column layout.
See `src/lib/gemini.ts` for the extraction prompt.

### Privacy: contact info never leaves your machine

Before anything is sent to the model, your **name, email, phone, and profile
links are stripped locally** (`src/lib/contact.ts`) and replaced with
placeholders. The real contact block is re-attached locally afterward.

### Anti-fabrication

The model only rephrases and reorders your real content — never inventing
employers, metrics, tools, or responsibilities. Output is validated with Zod
before rendering, and you review it before exporting.

## Stack

- **Next.js 16** (App Router) + TypeScript, Tailwind CSS v4
- **Google Gemini** (`gemini-flash-latest`) via `@google/genai`, structured output
- **unpdf** for serverless-safe PDF text extraction
- **cheerio** for best-effort job-posting URL extraction
- **@react-pdf/renderer** for the ATS-safe PDF

No database, no file storage — every route is stateless.

## Routes

| Route | Does |
|---|---|
| `POST /api/fetch-job` | URL → clean job-description text, graceful fallback to manual paste |
| `POST /api/parse-resume` | uploaded PDF → plain text (in-memory, nothing stored) |
| `POST /api/tailor` | `{ jobText, resumeText }` → `{ roleType, conventions[], resume, changeNotes[] }` |
| `POST /api/export-pdf` | `{ resume }` → streams a PDF |

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
3. Deploy. Routes run on Vercel's Node runtime; no database or storage to provision.

## Non-goals

No auto-apply, no form-filling, no job-board submission, no stored credentials,
and no scraping behind login walls or bot detection.
