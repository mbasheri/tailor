import "server-only";
import { generateJSON } from "@/lib/claude";
import {
  coverLetterSetSchema,
  interviewPrepSchema,
  resumeSuggestionSchema,
  scoreResultSchema,
  tailoredResumeOutputSchema,
  type CoverLetterContent,
  type InterviewQuestion,
  type ParsedRequirements,
  type ResumeContent,
  type ScoreResult,
  type TailoredResume,
} from "@/lib/schemas";

/**
 * Prompt builders + typed feature functions. Each one calls the Claude gateway
 * with a structured-output schema. The GROUND-TRUTH rule below is repeated in
 * every prompt that touches resume content — Claude may reorder, reword, and
 * select from the candidate's real experience, but never invent it.
 */

const GROUND_TRUTH_RULES = `GROUND-TRUTH RULES (non-negotiable):
- The candidate's resume content provided below is the ONLY source of truth about them.
- You may rephrase, reorder, emphasize, condense, or omit their real content.
- You must NEVER invent employers, titles, dates, metrics, tools, certifications, or responsibilities that are not present in the provided content.
- Do not inflate numbers or add quantified results that were not given.
- If the job wants something the candidate lacks, do not fabricate it — simply leave it out.`;

function resumeToText(content: ResumeContent): string {
  const lines: string[] = [];
  const c = content.contact;
  lines.push(`NAME: ${c.name}`);
  lines.push(
    `CONTACT: ${[c.email, c.phone, c.location, c.linkedin, c.website]
      .filter(Boolean)
      .join(" | ")}`,
  );
  if (content.summary) lines.push(`\nSUMMARY:\n${content.summary}`);

  if (content.experience.length) {
    lines.push("\nPROFESSIONAL EXPERIENCE:");
    for (const e of content.experience) {
      lines.push(
        `- ${e.title} @ ${e.company}${e.location ? `, ${e.location}` : ""} (${e.startDate}${e.endDate ? ` - ${e.endDate}` : ""})`,
      );
      for (const b of e.bullets) lines.push(`    • ${b}`);
    }
  }

  if (content.extracurricular.length) {
    lines.push("\nLEADERSHIP & INVOLVEMENT:");
    for (const x of content.extracurricular) {
      lines.push(
        `- ${x.role} @ ${x.organization} (${x.startDate}${x.endDate ? ` - ${x.endDate}` : ""})`,
      );
      for (const b of x.bullets) lines.push(`    • ${b}`);
    }
  }

  if (content.skills.length) {
    lines.push("\nSKILLS:");
    for (const s of content.skills) {
      lines.push(`- ${s.category}: ${s.items.join(", ")}`);
    }
  }

  if (content.education.length) {
    lines.push("\nEDUCATION:");
    for (const ed of content.education) {
      lines.push(
        `- ${ed.degree}, ${ed.institution}${ed.location ? `, ${ed.location}` : ""} (${ed.startDate}${ed.endDate ? ` - ${ed.endDate}` : ""})`,
      );
      for (const d of ed.details ?? []) lines.push(`    • ${d}`);
    }
  }

  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/* Feature 1 — scoring                                                        */
/* -------------------------------------------------------------------------- */

export async function scoreResumeAgainstJob(args: {
  resume: ResumeContent;
  jobTitle: string;
  company: string;
  jobDescription: string;
}): Promise<ScoreResult> {
  const system = `You are an ATS-savvy technical recruiter. You compare a candidate's resume against a job posting and return a strict, calibrated assessment as JSON. Be honest: do not inflate the score to be encouraging.

Scoring guidance:
- 85-100: strong match, most required skills and keywords present.
- 60-84: solid but with notable gaps.
- 40-59: partial match, several core requirements missing.
- 0-39: weak match.

Extract keywords/skills the way an ATS would: concrete tools, methods, and domain terms from the posting — not generic filler. "matchedKeywords" are terms genuinely evidenced in the resume; "missingKeywords" are posting terms absent from the resume. The summary is 2-3 sentences on fit.`;

  const user = `JOB POSTING
Title: ${args.jobTitle}
Company: ${args.company}

Description:
${args.jobDescription}

---
CANDIDATE RESUME (ground truth):
${resumeToText(args.resume)}`;

  return generateJSON({
    system,
    user,
    schema: scoreResultSchema,
    maxTokens: 2000,
  });
}

/* -------------------------------------------------------------------------- */
/* Feature 4 — suggest best base resume                                       */
/* -------------------------------------------------------------------------- */

export async function suggestBestResume(args: {
  resumes: { id: string; name: string; content: ResumeContent }[];
  jobTitle: string;
  company: string;
  jobDescription: string;
}): Promise<{ resumeId: string; reasoning: string }> {
  const system = `You help a candidate pick which of their base resume versions is the best starting point to tailor for a specific job. Return the id of the single best-fit resume and one sentence of reasoning. Choose only from the provided resume ids.`;

  const catalog = args.resumes
    .map(
      (r) =>
        `### RESUME id=${r.id} — "${r.name}"\n${resumeToText(r.content)}`,
    )
    .join("\n\n");

  const user = `JOB POSTING
Title: ${args.jobTitle}
Company: ${args.company}

Description:
${args.jobDescription}

---
CANDIDATE RESUME VERSIONS:
${catalog}

Return the id of the best-fit resume version.`;

  return generateJSON({
    system,
    user,
    schema: resumeSuggestionSchema,
    maxTokens: 500,
  });
}

/* -------------------------------------------------------------------------- */
/* Feature 4 — tailor a resume                                                */
/* -------------------------------------------------------------------------- */

export async function tailorResume(args: {
  resume: ResumeContent;
  jobTitle: string;
  company: string;
  jobDescription: string;
  portfolio?: { name: string; description: string } | null;
}): Promise<TailoredResume> {
  const system = `You are an expert resume writer tailoring a candidate's existing resume to one specific job. Return the full tailored resume as JSON in the SAME structure you are given, plus a short list of changeNotes describing what you emphasized or reordered and why.

${GROUND_TRUTH_RULES}

Tailoring approach:
- Keep the exact same contact block.
- Reorder experience bullets and skills so the most relevant-to-this-posting items come first.
- Rewrite bullets for clarity and keyword alignment WITHOUT adding facts. Mirror the posting's vocabulary only where the candidate genuinely did that work.
- You may write or refine the summary, but only from real evidence in the resume.
- Preserve every employer, title, and date exactly. You may drop a weak bullet, but never invent one.
- Keep it to roughly one page of content.`;

  const portfolioNote = args.portfolio
    ? `\n\nRelevant side project the candidate could reference (only weave in if it genuinely strengthens fit, and only using these facts):\n- ${args.portfolio.name}: ${args.portfolio.description}`
    : "";

  const user = `JOB POSTING
Title: ${args.jobTitle}
Company: ${args.company}

Description:
${args.jobDescription}

---
CANDIDATE RESUME (ground truth — do not invent beyond this):
${resumeToText(args.resume)}${portfolioNote}`;

  const result = await generateJSON({
    system,
    user,
    schema: tailoredResumeOutputSchema,
    maxTokens: 8000,
  });
  return result as TailoredResume;
}

/* -------------------------------------------------------------------------- */
/* Feature 5 — cover letter variants                                          */
/* -------------------------------------------------------------------------- */

export async function generateCoverLetters(args: {
  resume: ResumeContent;
  jobTitle: string;
  company: string;
  jobDescription: string;
  portfolio?: { id: string; name: string; description: string } | null;
}): Promise<{ letters: CoverLetterContent[]; portfolioUsed: string | null }> {
  const system = `You write cover letters for a candidate. Produce THREE distinct style variants of the same underlying application, each as a structured JSON object:
1. "concise" — direct and to the point, 3 short paragraphs.
2. "narrative" — story-driven, connecting the candidate's experience into an arc.
3. "enthusiastic" — culture-fit forward, conveying genuine interest in this company.

${GROUND_TRUTH_RULES}

Rules:
- Address a real greeting (use "Dear Hiring Manager," if no name is known).
- Each letter's "paragraphs" is an array of paragraph strings (no salutation or signature inside them).
- signature is the candidate's name.
- If a relevant side project is provided, weave it into ONE of the letters naturally where it strengthens the case — do not force it into all three, and do not bolt on a separate paragraph that reads like an ad.
- Set portfolioUsed to the project name if you used it, otherwise null.`;

  const portfolioNote = args.portfolio
    ? `\n\nRelevant side project available to reference:\n- ${args.portfolio.name}: ${args.portfolio.description}`
    : "\n\n(No side project provided.)";

  const user = `JOB POSTING
Title: ${args.jobTitle}
Company: ${args.company}

Description:
${args.jobDescription}

---
CANDIDATE RESUME (ground truth):
${resumeToText(args.resume)}${portfolioNote}`;

  const result = await generateJSON({
    system,
    user,
    schema: coverLetterSetSchema,
    maxTokens: 4000,
  });
  return result;
}

/* -------------------------------------------------------------------------- */
/* Feature 6 — interview prep                                                 */
/* -------------------------------------------------------------------------- */

export async function generateInterviewPrep(args: {
  resume: ResumeContent;
  jobTitle: string;
  company: string;
  jobDescription: string;
}): Promise<InterviewQuestion[]> {
  const system = `You generate interview preparation for a specific role. Return 8-10 questions total as JSON, mixing three categories:
- "behavioral": tied to the candidate's ACTUAL experience bullets, so they can rehearse a real example. In suggestedApproach, name the specific experience they should draw on.
- "technical": derived from the posting's listed requirements and the role.
- "ask-them": 2-3 sharp questions the candidate should ask the interviewer.

${GROUND_TRUTH_RULES}

For behavioral questions, ground suggestedApproach in the candidate's real roles (reference the actual company/experience). Never suggest they claim experience they don't have.`;

  const user = `JOB POSTING
Title: ${args.jobTitle}
Company: ${args.company}

Description:
${args.jobDescription}

---
CANDIDATE RESUME (ground truth):
${resumeToText(args.resume)}`;

  const result = await generateJSON({
    system,
    user,
    schema: interviewPrepSchema,
    maxTokens: 3000,
  });
  return result.questions;
}

/* -------------------------------------------------------------------------- */
/* Portfolio auto-selection (deterministic, no Claude call)                   */
/* -------------------------------------------------------------------------- */

/**
 * Picks the single most relevant portfolio project for a posting by scoring
 * keyword overlap between the project's relevantSkills/techStack and the job
 * text. Deterministic and free — Claude then decides whether to actually use
 * it. Returns null when nothing overlaps.
 */
export function pickRelevantPortfolio<
  T extends { relevantSkills: string[]; techStack: string[]; name: string },
>(projects: T[], jobText: string, requirements?: ParsedRequirements | null): T | null {
  if (projects.length === 0) return null;
  const haystack = [
    jobText,
    ...(requirements?.skills ?? []),
    ...(requirements?.keywords ?? []),
  ]
    .join(" ")
    .toLowerCase();

  let best: { project: T; score: number } | null = null;
  for (const project of projects) {
    const terms = [...project.relevantSkills, ...project.techStack].map((t) =>
      t.toLowerCase(),
    );
    let score = 0;
    for (const term of terms) {
      if (term && haystack.includes(term)) score += 1;
    }
    if (!best || score > best.score) best = { project, score };
  }

  return best && best.score > 0 ? best.project : null;
}
