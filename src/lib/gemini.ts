import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { AIError } from "@/lib/api";
import {
  rewordResultSchema,
  resumeJsonBodySchema,
  type DocxLine,
  type RewordResult,
  type ResumeJsonBody,
} from "@/lib/schemas";

/**
 * The only place the Gemini API key is used. It rewords the candidate's existing
 * resume lines to fit a job (never restructuring), and separately structures the
 * already-tailoured text into JSON. Contact details are never sent to the model.
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

/* -------------------------------------------------------------------------- */
/* .docx in-place rewording                                                   */
/* -------------------------------------------------------------------------- */

const REWORD_SYSTEM = `You reword individual resume lines (bullets and prose) to strongly fit a target job. You are given a JSON list of lines, each with an id. Return ONLY JSON matching the schema.

BE AGGRESSIVE ABOUT TERMINOLOGY MATCHING:
- First, extract the specific terminology from the job posting: named methods, processes, tools, artifacts, and ceremonies (e.g. "process mapping", "user stories", "acceptance criteria", "agile ceremonies", "sprint planning", "stakeholder interviews", "UAT", "requirements gathering", "A/B testing", "SQL", "variance analysis"). Also note the seniority and core responsibilities.
- Then, for EACH bullet, actively ask: does the work this bullet describes genuinely map to any of that terminology or framing? If yes, REWRITE the bullet to use the posting's exact terms in place of a generic paraphrase. Do this substantively — replace vague verbs and generic nouns with the precise, matched vocabulary — not just a cosmetic tweak.
- Example of the intent: a bullet "Talked to the investment team to understand their needs and documented the steps" tailoured for a PM role becomes "Conducted stakeholder interviews with the investment team and produced process maps of their workflow" — same real work, the posting's language.

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

/* -------------------------------------------------------------------------- */
/* Structure the tailoured resume into JSON (for a future ATS auto-fill flow)  */
/* -------------------------------------------------------------------------- */

const JSON_SYSTEM = `You convert a resume's plain text into a structured JSON object. The text is ALREADY final (it was tailoured upstream) — do not rewrite, improve, or add anything; only organize the existing content into fields. Return ONLY JSON matching the schema.

- summary: the professional summary/profile paragraph if present, else "".
- skills: a flat list of individual skills, pulled from any skills/competencies section.
- experience: one object per job, in the order they appear, with title (role), company, dates, and the bullets exactly as written.
- education: one object per entry with degree, institution, dates.
- certifications: a flat list, or [] if none.
- Copy text verbatim from the resume; never invent employers, dates, or bullets. Contact details (name/email/phone) are redacted and are filled in separately — ignore them.`;

const JSON_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    skills: { type: Type.ARRAY, items: { type: Type.STRING } },
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          company: { type: Type.STRING },
          dates: { type: Type.STRING },
          bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["title", "company", "dates", "bullets"],
        propertyOrdering: ["title", "company", "dates", "bullets"],
      },
    },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          degree: { type: Type.STRING },
          institution: { type: Type.STRING },
          dates: { type: Type.STRING },
        },
        required: ["degree", "institution", "dates"],
        propertyOrdering: ["degree", "institution", "dates"],
      },
    },
    certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["summary", "skills", "experience", "education", "certifications"],
  propertyOrdering: [
    "summary",
    "skills",
    "experience",
    "education",
    "certifications",
  ],
};

export async function structureResumeJson(
  redactedResumeText: string,
): Promise<ResumeJsonBody> {
  const ai = getClient();

  let raw: string | undefined;
  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: `RESUME TEXT (already tailoured; contact redacted):\n${redactedResumeText}`,
      config: {
        systemInstruction: JSON_SYSTEM,
        responseMimeType: "application/json",
        responseSchema: JSON_SCHEMA,
        temperature: 0.1,
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

  const result = resumeJsonBodySchema.safeParse(parsed);
  if (!result.success) {
    throw new AIError("Gemini's JSON did not match the expected shape.");
  }
  return result.data;
}
