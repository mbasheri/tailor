import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { AIError } from "@/lib/api";
import {
  rewordResultSchema,
  tailorResultSchema,
  type DocxLine,
  type RewordResult,
  type TailorResult,
} from "@/lib/schemas";

/**
 * The only place the Gemini API key is used. It extracts the candidate's resume
 * structure (section order, headings, entry grouping) EXACTLY as uploaded, and
 * only rewords the content within it to fit the job — never restructuring.
 */

const MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new AIError(
      "GEMINI_API_KEY is not set. Add it to .env (local) or Vercel project settings.",
      500,
    );
  }
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

const SYSTEM = `You are an expert resume editor. You receive a target job posting and a candidate's resume as raw text (contact details redacted). Return ONLY JSON matching the schema.

YOUR JOB HAS TWO PARTS:

1. EXTRACT STRUCTURE FAITHFULLY. Reproduce the resume's own structure exactly:
   - Preserve the ORDER of sections as they appear in the resume.
   - Preserve each section's HEADING using the candidate's own wording (e.g. "PROFESSIONAL EXPERIENCE", "Education", "Technical Skills", "Projects", "Summary"). Do not rename, merge, split, add, or drop sections.
   - Within each section, preserve every ENTRY (a job, degree, project, skills line, etc.) and keep each bullet under the entry it belongs to. Do not move bullets between entries. Do not add or remove entries.
   - Map each entry onto these fields (leave a field as "" or [] when not applicable):
       title      -> role / degree / project name / skills category
       subtitle   -> employer / institution / (usually empty for skills)
       dateRange  -> e.g. "Jan 2025 – Apr 2025" (empty if none)
       location   -> e.g. "Toronto, ON" (empty if none)
       bullets    -> the entry's bullet points (as an array)
       text       -> prose for entries that are not bulleted (a summary paragraph, or a skills line like "Excel, SQL, Power BI"); empty otherwise

2. TAILOR THE WORDING AGGRESSIVELY (within the fixed structure). First extract the posting's specific terminology — named methods, processes, tools, artifacts, and ceremonies (e.g. "process mapping", "user stories", "acceptance criteria", "agile ceremonies", "stakeholder interviews", "UAT", "variance analysis"). Then, for each bullet, if the work it describes genuinely maps to that terminology, rewrite the bullet substantively to use the posting's exact terms instead of a generic paraphrase — replace vague verbs and nouns with the matched vocabulary. Also reorder bullets so the most relevant lead. Leave a bullet mostly unchanged only when nothing relevant applies.
   CONCRETENESS: prefer concrete, specific language over generic corporate filler; keep the original's specific nouns, tool names, numbers, and named outcomes. Never swap them for vaguer phrases ("decision-ready artifacts", "clear signal", "actionable insights", "synthesizing insights") that say less. Never drop or generalize a specific named item — keep every named metric, tool, method, or entity verbatim (e.g. do not turn "NOI, IRR, and MOIC" into "key financial metrics", or "Bloomberg" into "external data"). PRESERVE NUMBER/UNIT FORMATTING: if the original abbreviates ("$200B", "$59B"), keep the abbreviation — never expand to "$200 billion".
   TRUTHFUL MAPPING ONLY: relabel real work with the posting's term, but never change the actual substance — who did the work, what tool was used, what actually happened must stay true. E.g. "automated the workflow with VBA" must not become "presented the business case for automation". DO NOT NARROW OR ADD SPECIFICITY the original didn't state: if it says "stakeholders" don't narrow to "investors"; if it says "performance metrics" don't narrow to "risk metrics". Keep the original's level of specificity for audience, metric type, and scope. If a term would require changing the facts, do not use it; leave the bullet closer to the original.
   SKILLS CATEGORY LABELS: you may broaden a label to include the role's key domain phrase for keyword matching (e.g. "Product" -> "Product & Business Analysis"); do not shorten or drop a meaningful label to save space.

GROUND-TRUTH RULES (non-negotiable):
- The resume text is the ONLY source of truth. Never invent employers, titles, dates, metrics, tools, or responsibilities. Do not inflate numbers.
- Preserve every employer, title, date, and heading exactly — only bullet/prose wording may change.
- You may reorder bullets within an entry and drop a genuinely redundant bullet, but never fabricate one.
- Contact details are redacted (shown as [NAME], [EMAIL], etc.). Omit contact info from your output entirely.

ALSO RETURN: roleType (the industry/role this posting is for), conventions (short strings describing the resume conventions you applied for that role), and changeNotes (a short list of what you reworded/reordered and why).`;

const entrySchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    subtitle: { type: Type.STRING },
    dateRange: { type: Type.STRING },
    location: { type: Type.STRING },
    bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
    text: { type: Type.STRING },
  },
  required: ["title", "subtitle", "dateRange", "location", "bullets", "text"],
  propertyOrdering: [
    "title",
    "subtitle",
    "dateRange",
    "location",
    "bullets",
    "text",
  ],
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    roleType: { type: Type.STRING },
    conventions: { type: Type.ARRAY, items: { type: Type.STRING } },
    changeNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          heading: { type: Type.STRING },
          entries: { type: Type.ARRAY, items: entrySchema },
        },
        required: ["heading", "entries"],
        propertyOrdering: ["heading", "entries"],
      },
    },
  },
  required: ["roleType", "conventions", "changeNotes", "sections"],
  propertyOrdering: ["roleType", "conventions", "changeNotes", "sections"],
};

export async function generateTailoredResume(args: {
  jobText: string;
  redactedResumeText: string;
}): Promise<TailorResult> {
  const ai = getClient();

  const prompt = `TARGET JOB POSTING:
${args.jobText}

---
CANDIDATE RESUME (raw text, contact redacted — this is the ground truth; reproduce its structure exactly):
${args.redactedResumeText}`;

  let raw: string | undefined;
  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    });
    raw = res.text;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new AIError(`Gemini request failed: ${detail}`);
  }

  if (!raw) {
    throw new AIError("Gemini returned an empty response. Try again.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AIError("Gemini returned output that was not valid JSON.");
  }

  const result = tailorResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new AIError(
      "Gemini's output did not match the expected resume structure.",
    );
  }
  return result.data;
}

/* -------------------------------------------------------------------------- */
/* .docx in-place rewording                                                   */
/* -------------------------------------------------------------------------- */

const REWORD_SYSTEM = `You reword individual resume lines (bullets and prose) to strongly fit a target job. You are given a JSON list of lines, each with an id. Return ONLY JSON matching the schema.

BE AGGRESSIVE ABOUT TERMINOLOGY MATCHING:
- First, extract the specific terminology from the job posting: named methods, processes, tools, artifacts, and ceremonies (e.g. "process mapping", "user stories", "acceptance criteria", "agile ceremonies", "sprint planning", "stakeholder interviews", "UAT", "requirements gathering", "A/B testing", "SQL", "variance analysis"). Also note the seniority and core responsibilities.
- Then, for EACH bullet, actively ask: does the work this bullet describes genuinely map to any of that terminology or framing? If yes, REWRITE the bullet to use the posting's exact terms in place of a generic paraphrase. Do this substantively — replace vague verbs and generic nouns with the precise, matched vocabulary — not just a cosmetic tweak.
- Example of the intent: a bullet "Talked to the investment team to understand their needs and documented the steps" tailored for a PM role becomes "Conducted stakeholder interviews with the investment team and produced process maps of their workflow" — same real work, the posting's language.

CONCRETENESS — do not trade specifics for jargon:
- Prefer concrete, specific language over generic corporate filler. Keep the original's specific nouns, tool names, numbers, and named outcomes. Never replace them with vague phrases that say less. BANNED kinds of filler: "decision-ready artifacts", "clear signal", "actionable insights", "drove alignment", "leveraged synergies", "translating complex inputs", "synthesizing insights", "operational process efficiency" — if you catch yourself writing something this vague, keep the original's concrete wording instead.
- NEVER drop or generalize a specific named item. Keep every named metric, tool, method, or entity from the original verbatim: e.g. do NOT replace "NOI, IRR, and MOIC" with "key financial metrics", or "Bloomberg" with "external data", or "SQL" with "databases". Specific names must survive the rewrite.
- PRESERVE NUMBER/UNIT FORMATTING EXACTLY. If the original abbreviates a figure ("$200B", "$59B", "10 hrs", "3.7 GPA"), keep that exact abbreviated form — never expand "$200B" to "$200 billion". Do not lengthen a line by spelling out abbreviated figures.
- A rewrite must say at least as much as the original, never less.

DO NOT CHANGE THE FACTS — framing/terminology only:
- Never alter the actual substance of what happened: WHO did the work, WHAT tool was used, and WHAT actually occurred must stay true to the original. You may change vocabulary and framing; you may not change events.
- DO NOT NARROW OR ADD SPECIFICITY the original didn't state. Never introduce a more specific audience, metric type, or scope than the original: if it says "stakeholders", do not narrow to "investors"; if it says "performance metrics" or "business metrics", do not narrow to "risk metrics"; if it describes a general activity, do not claim a narrower specialty. Keep the original's exact level of specificity for audiences, metric types, and scope. Relabeling to the posting's vocabulary is allowed ONLY when it does not add a specific who/what/scope the original never stated.
- Forbidden example: "Automated the workflow with VBA" must NOT become "presented the business case for workflow automation" — that changes who did what and what happened. The person did the automation themselves; keep that.
- If matching a posting's term would require changing the underlying fact of what happened, DO NOT use that term. Leave the line closer to the original instead of forcing a term that isn't true.
- SKILLS/COMPETENCY CATEGORY LABELS: you MAY broaden a label to include the role's key domain phrase for keyword/ATS matching (e.g. "Product" -> "Product & Business Analysis" for a Business Analyst role). Do NOT shorten, trim, or drop a meaningful category label to save space — keep the fuller role-matched phrasing. Keep the "Label: comma-separated list" format.

RULES:
- Return EXACTLY one output line per input line, with the SAME id. Do not add, drop, merge, split, or reorder lines — each line stays in place.
- Meaningful edits are the default WHERE a truthful terminology match exists. Leave a line close to the original when no honest, more-concrete match applies — a faithful line beats a jargon-y one.
- GROUND TRUTH: the line's own text is the only source of truth. You may relabel work the candidate actually did with the posting's matching term, but never claim a method, tool, artifact, or ceremony they did not genuinely use, and never invent employers, metrics, or responsibilities. Do not inflate numbers. Keep each line roughly the same length as the original.
- Also return roleType (the role/industry the posting is for), conventions (short strings on the resume conventions for that role), and changeNotes (a short list of the most significant rewrites and why).`;

const REWORD_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    roleType: { type: Type.STRING },
    conventions: { type: Type.ARRAY, items: { type: Type.STRING } },
    changeNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
    lines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          text: { type: Type.STRING },
        },
        required: ["id", "text"],
        propertyOrdering: ["id", "text"],
      },
    },
  },
  required: ["roleType", "conventions", "changeNotes", "lines"],
  propertyOrdering: ["roleType", "conventions", "changeNotes", "lines"],
};

export async function rewordResumeLines(args: {
  jobText: string;
  lines: DocxLine[];
}): Promise<RewordResult> {
  const ai = getClient();

  const prompt = `TARGET JOB POSTING:
${args.jobText}

---
RESUME LINES TO REWORD (JSON; return one output per id, same order):
${JSON.stringify(args.lines, null, 2)}`;

  let raw: string | undefined;
  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: REWORD_SYSTEM,
        responseMimeType: "application/json",
        responseSchema: REWORD_SCHEMA,
        temperature: 0.45,
        maxOutputTokens: 8192,
      },
    });
    raw = res.text;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new AIError(`Gemini request failed: ${detail}`);
  }

  if (!raw) throw new AIError("Gemini returned an empty response. Try again.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AIError("Gemini returned output that was not valid JSON.");
  }

  const result = rewordResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new AIError("Gemini's output did not match the expected shape.");
  }

  // Safety: only keep reworded lines whose id exists in the input; fall back to
  // the original text for any input line the model dropped. Never trust it to
  // have preserved the set on its own.
  const byId = new Map(result.data.lines.map((l) => [l.id, l.text]));
  const lines = args.lines.map((l) => ({
    id: l.id,
    text: byId.get(l.id) ?? l.text,
  }));

  return { ...result.data, lines };
}
