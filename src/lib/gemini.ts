import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { AIError } from "@/lib/api";
import { tailorResultSchema, type TailorResult } from "@/lib/schemas";

/**
 * The only place the Gemini API key is used. Runs the whole "read the posting →
 * classify the role → apply that role's resume conventions → rewrite using only
 * the candidate's real content" step in one structured-output call.
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

const GROUND_TRUTH_RULES = `GROUND-TRUTH RULES (non-negotiable):
- The candidate's resume text below is the ONLY source of truth about them.
- You may rephrase, reorder, emphasize, condense, or omit their real content.
- You must NEVER invent employers, titles, dates, metrics, tools, certifications, or responsibilities that are not present in the text.
- Do not inflate numbers or add quantified results that were not given.
- If the job wants something the candidate lacks, do not fabricate it — leave it out.
- Contact details have been redacted (shown as [NAME], [EMAIL], etc.). Do not try to reconstruct them; omit contact info entirely from your output.`;

const SYSTEM = `You are an expert resume writer. You are given a target job posting and a candidate's current resume (as raw text, with contact details redacted). Do all of the following and return ONLY JSON matching the provided schema:

1. Determine the industry / role type this posting is for (e.g. "FP&A / Corporate Finance", "Product Manager", "Data Analyst").
2. Identify the resume conventions that apply to THAT kind of role — what such resumes emphasize, how bullets are framed, what keywords and competencies matter, ordering expectations. Put these as short strings in "conventions".
3. Rewrite the candidate's resume to fit this specific posting and those conventions: reorder and reword experience bullets so the most relevant work leads, mirror the posting's vocabulary where the candidate genuinely did that work, group and order skills to match, and write or refine a summary ONLY from real evidence.
4. Parse the raw resume into the structured "content" object (summary, experience[], extracurricular[], skills[], education[]). Preserve every employer, title, and date exactly. You may drop a weak bullet but never invent one.
5. In "changeNotes", briefly list what you emphasized, reordered, or reworded and why.

${GROUND_TRUTH_RULES}`;

// Gemini responseSchema mirroring tailorResultSchema (minus contact).
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    roleType: { type: Type.STRING },
    conventions: { type: Type.ARRAY, items: { type: Type.STRING } },
    content: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        experience: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              company: { type: Type.STRING },
              title: { type: Type.STRING },
              location: { type: Type.STRING },
              startDate: { type: Type.STRING },
              endDate: { type: Type.STRING },
              bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["company", "title", "bullets"],
            propertyOrdering: [
              "company",
              "title",
              "location",
              "startDate",
              "endDate",
              "bullets",
            ],
          },
        },
        extracurricular: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              organization: { type: Type.STRING },
              role: { type: Type.STRING },
              startDate: { type: Type.STRING },
              endDate: { type: Type.STRING },
              bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["organization", "role", "bullets"],
            propertyOrdering: [
              "organization",
              "role",
              "startDate",
              "endDate",
              "bullets",
            ],
          },
        },
        skills: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              items: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["category", "items"],
            propertyOrdering: ["category", "items"],
          },
        },
        education: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              institution: { type: Type.STRING },
              degree: { type: Type.STRING },
              location: { type: Type.STRING },
              startDate: { type: Type.STRING },
              endDate: { type: Type.STRING },
              details: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["institution", "degree"],
            propertyOrdering: [
              "institution",
              "degree",
              "location",
              "startDate",
              "endDate",
              "details",
            ],
          },
        },
      },
      required: ["summary", "experience", "extracurricular", "skills", "education"],
      propertyOrdering: [
        "summary",
        "experience",
        "extracurricular",
        "skills",
        "education",
      ],
    },
    changeNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["roleType", "conventions", "content", "changeNotes"],
  propertyOrdering: ["roleType", "conventions", "content", "changeNotes"],
};

export async function generateTailoredResume(args: {
  jobText: string;
  redactedResumeText: string;
}): Promise<TailorResult> {
  const ai = getClient();

  const prompt = `TARGET JOB POSTING:
${args.jobText}

---
CANDIDATE RESUME (raw text, contact redacted — this is the ground truth):
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
        temperature: 0.4,
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
