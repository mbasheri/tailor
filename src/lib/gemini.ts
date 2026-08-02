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

2. TAILOR THE WORDING ONLY. Within that fixed structure, reword and reorder the BULLETS (and any prose text) so the most relevant-to-this-posting content leads and mirrors the posting's vocabulary where the candidate genuinely did that work.

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

const REWORD_SYSTEM = `You reword individual resume lines (bullets and prose) to better fit a target job. You are given a JSON list of lines, each with an id. Return ONLY JSON matching the schema.

RULES:
- Return EXACTLY one output line per input line, with the SAME id. Do not add, drop, merge, split, or reorder lines — each line stays in place.
- Reword the text of each line to align with the job posting: tighten it, reorder words within the line, and mirror the posting's vocabulary WHERE the candidate genuinely did that work.
- GROUND TRUTH: the line's own text is the only source of truth. Never invent employers, metrics, tools, or responsibilities. Do not inflate numbers. Keep each line roughly the same length as the original.
- If a line is already well-suited or has nothing to change, return it unchanged (same id, same text).
- Also return roleType (the role/industry the posting is for), conventions (short strings on the resume conventions for that role), and changeNotes (a short list of what you changed and why).`;

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
        temperature: 0.3,
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
