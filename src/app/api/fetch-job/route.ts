import * as cheerio from "cheerio";
import { ok, parseBody, route } from "@/lib/api";
import { fetchJobRequestSchema as bodySchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 20;

/**
 * Best-effort server-side extraction of a job description. Many boards
 * (LinkedIn especially) block bots or require login — when that happens we
 * return `ok: false` so the client shows a manual-paste box. We never attempt
 * to bypass login walls or bot detection.
 */
export async function POST(request: Request) {
  return route(async () => {
    const { url } = await parseBody(request, bodySchema);

    let host = "";
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /* validated above */
    }

    // Known login/bot-walled sources: don't even try, just tell the user.
    if (/(^|\.)linkedin\.com$/.test(host)) {
      return ok({
        ok: false,
        reason:
          "LinkedIn blocks automated fetching. Open the posting, copy the description, and paste it below.",
        host,
      });
    }

    let html: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(timeout);
      if (!res.ok) {
        return ok({
          ok: false,
          reason: `The page returned ${res.status}. Paste the description manually.`,
          host,
        });
      }
      html = await res.text();
    } catch {
      return ok({
        ok: false,
        reason:
          "Couldn't reach that page (it may block bots or require login). Paste the description manually.",
        host,
      });
    }

    const extracted = extractJobContent(html, host);
    if (!extracted.description || extracted.description.length < 120) {
      return ok({
        ok: false,
        reason:
          "Fetched the page but couldn't find a clear job description. Paste it manually.",
        host,
        title: extracted.title,
        company: extracted.company,
      });
    }

    return ok({ ok: true, ...extracted, host });
  });
}

function extractJobContent(html: string, host: string) {
  const $ = cheerio.load(html);

  // Strip obvious chrome so it doesn't pollute the extracted text.
  $(
    "script, style, noscript, nav, header, footer, aside, form, svg, iframe, [role=navigation], [aria-hidden=true]",
  ).remove();

  const title =
    $("meta[property='og:title']").attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    $("title").text().trim() ||
    "";

  // Company hints vary by ATS; try a few common spots.
  const company =
    $("meta[property='og:site_name']").attr("content")?.trim() ||
    $("[class*='company'], [data-qa*='company']").first().text().trim() ||
    "";

  // ATS-specific containers tend to hold clean description HTML.
  const selectors = [
    "#content .content", // Greenhouse
    "[class*='posting'] [class*='description']", // Lever
    ".posting-description",
    "[data-automation-id='jobPostingDescription']", // Workday
    "#jobDescriptionText", // Indeed
    "article",
    "main",
    "[class*='job-description']",
    "[class*='description']",
  ];

  let description = "";
  for (const sel of selectors) {
    const text = normalize($(sel).first().text());
    if (text.length > description.length) description = text;
    if (description.length > 400) break;
  }
  if (description.length < 200) {
    const bodyText = normalize($("body").text());
    if (bodyText.length > description.length) description = bodyText;
  }

  // Indeed occasionally needs the full body; cap runaway extractions.
  if (description.length > 20_000) description = description.slice(0, 20_000);

  return { title: cleanTitle(title, host), company, description };
}

function normalize(text: string) {
  return text
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function cleanTitle(title: string, host: string) {
  // Drop trailing " | Company" / " - Site" noise from <title>.
  return title
    .replace(new RegExp(`\\s*[|\\-–]\\s*${host}.*$`, "i"), "")
    .trim();
}
