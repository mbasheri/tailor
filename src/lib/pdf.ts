import "server-only";
import mammoth from "mammoth";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

/**
 * docx -> pdf, server-side, derived from the SAME reworded .docx the user
 * downloads (not a separate template). We convert the docx to HTML with mammoth
 * (which preserves bold/italic, headings, and list structure), style it to
 * approximate the document, and print it with headless Chromium.
 *
 * FIDELITY TRADE-OFF (honest): a Word-accurate render needs a Word/LibreOffice
 * engine, which isn't viable inside a Vercel serverless function (binary size /
 * memory / cold-start limits). mammoth intentionally emits clean semantic HTML,
 * so it does NOT reproduce Word's exact tab stops (right-aligned dates), precise
 * line spacing, or the original font. This path preserves content, order,
 * bold/italic, and bullet structure faithfully; visual layout is a close
 * approximation, not pixel-identical. LibreOffice-in-a-container would be the
 * only faithful option and is out of scope for free/serverless.
 */

// mammoth maps Word list styles to real <ul>/<ol>; keep bold/italic as-is.
const STYLE_MAP = [
  "b => strong",
  "i => em",
  "u => u",
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Heading 1'] => h2:fresh",
  "p[style-name='Heading 2'] => h3:fresh",
];

const PAGE_CSS = `
  @page { size: Letter; margin: 0.5in 0.6in; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Calibri, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.25;
    color: #111;
  }
  p { margin: 0 0 3pt; }
  h1 { font-size: 17pt; font-weight: 700; margin: 0 0 2pt; }
  h2 { font-size: 11pt; font-weight: 700; text-transform: uppercase;
       letter-spacing: 0.4pt; border-bottom: 0.75pt solid #000;
       padding-bottom: 1pt; margin: 9pt 0 4pt; }
  h3 { font-size: 10.5pt; font-weight: 700; margin: 6pt 0 2pt; }
  ul { margin: 2pt 0 4pt; padding-left: 16pt; }
  li { margin: 0 0 1.5pt; }
  strong { font-weight: 700; }
  a { color: inherit; text-decoration: none; }
  /* entry header row: title/company left, date/location right (mammoth drops
     Word tab stops, so we re-create the right-aligned tail here). */
  .hdr { display: flex; justify-content: space-between; gap: 12pt; margin: 0 0 3pt; }
  .hdr .r { white-space: nowrap; }
`;

/** A trailing date-range or "City, ST" that belongs on the right of a header. */
function looksLikeTail(s: string): boolean {
  const t = s.trim();
  if (!t || t.length > 60) return false;
  if (/\b(19|20)\d{2}\b/.test(t)) return true; // any year
  if (/,\s?[A-Z]{2}$/.test(t)) return true; // ", ON"
  if (/,\s?(Canada|USA|UK|Remote)$/i.test(t)) return true;
  if (/\bpresent$/i.test(t)) return true;
  return false;
}

/**
 * Right-align the date/location tail of entry-header paragraphs, approximating
 * the original Word tab stops that mammoth flattens. mammoth keeps the tab as a
 * literal "\t", so we split on it and float the tail right — but only when the
 * tail reads like a date/location, so prose and bullets are left alone.
 */
function alignHeaders(html: string): string {
  return html.replace(/<p>([\s\S]*?)<\/p>/g, (whole, inner: string) => {
    const tab = inner.indexOf("\t");
    if (tab === -1) return whole;
    const lead = inner.slice(0, tab);
    const tail = inner.slice(tab + 1);
    const tailText = tail.replace(/<[^>]+>/g, "").trim();
    if (!looksLikeTail(tailText)) return whole;
    return `<div class="hdr"><span>${lead}</span><span class="r">${tail}</span></div>`;
  });
}

function htmlDocument(body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${PAGE_CSS}</style></head><body>${body}</body></html>`;
}

async function launchBrowser() {
  const serverless =
    !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.VERCEL;

  if (serverless) {
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: { width: 1240, height: 1754 },
    });
  }

  // Local dev: use an installed Chrome/Chromium so we don't ship a binary.
  const localPath =
    process.env.LOCAL_CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  return puppeteer.launch({
    executablePath: localPath,
    headless: true,
    args: ["--no-sandbox"],
  });
}

export async function renderDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  const { value: bodyHtml } = await mammoth.convertToHtml(
    { buffer: docxBuffer },
    { styleMap: STYLE_MAP },
  );

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(htmlDocument(alignHeaders(bodyHtml)), {
      waitUntil: "load",
    });
    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
