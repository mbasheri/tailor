# tailour — we alter, you apply

a single-page, stateless tool: upload your resume `.docx` and a job posting, and
tailour rewords your bullets to match the role **in place inside your own file**,
so every style, font, and layout stays exactly as you had it. review the changes,
edit anything, and download.

**nothing is stored.** no accounts, no login, no database. each visit is a fresh
session — nothing is retained after you close the page.

## how it works

```
resume       upload a .docx (docx-only, so formatting is preserved)
job posting  paste text  OR  paste a url → best-effort auto-pull
  → tailour  gemini rewords only the bullet/prose runs to fit the job;
             headers, dates, contact and formatting are never touched
  → review   changes grouped by position, original struck through above the new line
  → export   download docx / pdf / json
```

### three exports, one source of truth

all three are derived from the **same** reworded document + your edits, so they
always agree:

- **docx** — the original file with only the bullet text changed. formatting is
  byte-identical to your upload (styles/numbering/fonts untouched).
- **pdf** — the reworded docx converted server-side (mammoth → html → headless
  chromium). see the fidelity note below.
- **json** — a structured object (`name`, `email`, `phone`, `location`,
  `summary`, `skills`, `experience[]`, `education[]`, `certifications`) built
  from the same tailoured text, generic enough for a future ATS auto-fill flow.

### pdf fidelity — honest trade-off

a Word-accurate render needs a Word/LibreOffice engine, which isn't viable inside
a Vercel serverless function (binary size / memory / cold-start). so the pdf is
produced with `mammoth` (docx → clean semantic html) + `@sparticuz/chromium` +
`puppeteer-core`. this preserves content, order, bold/italic and bullet
structure, but does **not** reproduce Word's exact tab stops (right-aligned
dates), precise spacing, or the original font — it's a close approximation, not
pixel-identical. the **docx** download is the fully faithful output; the pdf is a
convenience. (see `src/lib/pdf.ts`.)

### privacy

your name, email, phone and profile links are never sent to the model — the
reword step only ever sees bullet/prose lines, and the json step extracts contact
fields locally (`src/lib/contact.ts`) before anything is sent.

## stack

- **next.js 16** (app router) + typescript, tailwind css v4
- **google gemini** (`gemini-flash-latest`) via `@google/genai`, free tier
- **jszip + @xmldom/xmldom** for in-place docx editing
- **mammoth + puppeteer-core + @sparticuz/chromium** for docx → pdf
- **cheerio** for best-effort job-posting url extraction

## routes

| route | does |
|---|---|
| `POST /api/parse-resume` | `.docx` → rewordable lines (grouped by position) + the file, base64 |
| `POST /api/fetch-job` | url → clean job-description text, graceful fallback |
| `POST /api/tailour-docx` | `{ jobText, lines }` → reworded lines (same ids) |
| `POST /api/export-docx` | `{ docxBase64, edits }` → reworded `.docx` |
| `POST /api/export-pdf` | `{ docxBase64, edits }` → reworded `.docx` converted to pdf |
| `POST /api/structure-json` | `{ docxBase64, edits }` → structured resume json |

## local setup

```bash
npm install
cp .env.example .env      # add your GEMINI_API_KEY
npm run dev
```

get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
required env: `GEMINI_API_KEY`. optional: `GEMINI_MODEL`, `LOCAL_CHROME_PATH`
(path to a Chrome/Chromium binary for local pdf export; defaults to the standard
macOS Chrome path).

## deploy to vercel

1. push the repo and import it into vercel.
2. add `GEMINI_API_KEY` in **project settings → environment variables**.
3. deploy. routes run on the node runtime; pdf export uses `@sparticuz/chromium`
   automatically when `VERCEL` is set (no local chrome needed in production).

> **note on the deployment name/slug:** renaming this app to *tailour* does not
> automatically rename an existing Vercel project slug or `*.vercel.app` domain —
> changing those changes the live URL. that's a separate decision: rename the
> Vercel project (and/or add a custom domain) in the dashboard if you want the
> URL to say `tailour`, or leave the existing URL as-is. the code, package name,
> and UI are all `tailour` regardless.

## non-goals

no auto-apply, no form-filling, no job-board submission, no stored credentials,
no scraping behind login walls. paid apis are avoided (gemini free tier only).
