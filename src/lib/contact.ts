import type { Contact } from "@/lib/schemas";

/**
 * Privacy option (b): pull the directly-identifying contact details out of the
 * raw resume text locally, and redact them before anything is sent to Gemini.
 * The model tailors only the experience/skills/education; we re-attach the real
 * contact block afterward. The model never sees the name, email, phone, or
 * profile URLs.
 */

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE =
  /(?:\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const LINKEDIN_RE = /((?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|,)]+)/i;
const GITHUB_RE = /((?:https?:\/\/)?(?:www\.)?github\.com\/[^\s|,)]+)/i;
const URL_RE = /((?:https?:\/\/)[^\s|,)]+)/i;
// "City, ST" or "City, Country" — matched per line (never spanning newlines).
const LOCATION_RE =
  /\b([A-Z][a-zA-Z.]+(?:[ \t][A-Z][a-zA-Z.]+)?,[ \t]?(?:[A-Z]{2}|[A-Z][a-zA-Z]+)(?:,[ \t]?Canada|,[ \t]?USA)?)\b/;

export interface RedactionResult {
  redactedText: string;
  contact: Contact;
}

function looksLikeName(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 50) return false;
  if (/\d/.test(trimmed) || trimmed.includes("@")) return false;
  const words = trimmed.split(/\s+/);
  return words.length >= 1 && words.length <= 5;
}

export function redactContact(rawResume: string): RedactionResult {
  const lines = rawResume.split("\n");
  const firstNonEmptyIdx = lines.findIndex((l) => l.trim().length > 0);

  // Name: the first non-empty line, if it reads like a name.
  let name = "";
  if (firstNonEmptyIdx >= 0 && looksLikeName(lines[firstNonEmptyIdx])) {
    name = lines[firstNonEmptyIdx].trim();
  }

  const email = rawResume.match(EMAIL_RE)?.[0] ?? "";
  const phone = rawResume.match(PHONE_RE)?.[0] ?? "";
  const linkedin = rawResume.match(LINKEDIN_RE)?.[0] ?? "";
  const github = rawResume.match(GITHUB_RE)?.[0] ?? "";
  // Website: first non-linkedin/github URL, if any.
  let website = github;
  if (!website) {
    const url = rawResume.match(URL_RE)?.[0] ?? "";
    if (url && !/linkedin\.com/i.test(url)) website = url;
  }
  // Location: scan the first few lines individually (skipping the name line) so
  // a match can't span from the name into the real location on the next line.
  let location = "";
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    if (i === firstNonEmptyIdx && name) continue;
    const m = lines[i].match(LOCATION_RE);
    if (m) {
      location = m[0];
      break;
    }
  }

  const contact: Contact = {
    name,
    email,
    phone,
    location,
    linkedin,
    website,
  };

  // Build the redacted text: strip the name line, then scrub identifiers.
  let redacted = rawResume;
  if (name) {
    redacted = redacted.replace(name, "[NAME]");
  }
  redacted = redacted
    .replace(new RegExp(EMAIL_RE, "g"), "[EMAIL]")
    .replace(new RegExp(PHONE_RE, "g"), "[PHONE]")
    .replace(new RegExp(LINKEDIN_RE, "gi"), "[LINKEDIN]")
    .replace(new RegExp(GITHUB_RE, "gi"), "[GITHUB]")
    .replace(new RegExp(URL_RE, "gi"), "[URL]");

  return { redactedText: redacted, contact };
}
