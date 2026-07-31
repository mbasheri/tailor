import { z } from "zod";

/**
 * Every JSON column in the database and every structured Claude response is
 * validated against a schema in this file before it is written or rendered.
 * Nothing untyped reaches Postgres.
 */

/* -------------------------------------------------------------------------- */
/* Resume content                                                             */
/* -------------------------------------------------------------------------- */

export const contactSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string().optional().default(""),
  location: z.string().optional().default(""),
  linkedin: z.string().optional().default(""),
  website: z.string().optional().default(""),
});

export const experienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().optional().default(""),
  startDate: z.string(),
  endDate: z.string().optional().default(""),
  bullets: z.array(z.string()),
});

export const extracurricularSchema = z.object({
  organization: z.string(),
  role: z.string(),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  bullets: z.array(z.string()),
});

export const skillGroupSchema = z.object({
  category: z.string(),
  items: z.array(z.string()),
});

export const educationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  location: z.string().optional().default(""),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  details: z.array(z.string()).optional().default([]),
});

export const resumeContentSchema = z.object({
  contact: contactSchema,
  summary: z.string().optional().default(""),
  experience: z.array(experienceSchema).default([]),
  extracurricular: z.array(extracurricularSchema).default([]),
  skills: z.array(skillGroupSchema).default([]),
  education: z.array(educationSchema).default([]),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type SkillGroup = z.infer<typeof skillGroupSchema>;

export const emptyResumeContent: ResumeContent = {
  contact: {
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    website: "",
  },
  summary: "",
  experience: [],
  extracurricular: [],
  skills: [],
  education: [],
};

/* -------------------------------------------------------------------------- */
/* Claude structured outputs                                                  */
/* -------------------------------------------------------------------------- */

export const parsedRequirementsSchema = z.object({
  skills: z.array(z.string()),
  keywords: z.array(z.string()),
  seniority: z.string(),
});
export type ParsedRequirements = z.infer<typeof parsedRequirementsSchema>;

export const scoreResultSchema = z.object({
  matchScore: z.number().int().min(0).max(100),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  summary: z.string(),
  parsedRequirements: parsedRequirementsSchema,
});
export type ScoreResult = z.infer<typeof scoreResultSchema>;

/** What we persist on Job.scoreDetail. */
export const scoreDetailSchema = scoreResultSchema
  .omit({ matchScore: true })
  .extend({ scoredAt: z.string(), resumeVersionId: z.string().nullable() });
export type ScoreDetail = z.infer<typeof scoreDetailSchema>;

export const resumeSuggestionSchema = z.object({
  resumeId: z.string(),
  reasoning: z.string(),
});

export const tailoredResumeSchema = z.object({
  content: resumeContentSchema,
  changeNotes: z.array(z.string()),
});
export type TailoredResume = z.infer<typeof tailoredResumeSchema>;

export const COVER_LETTER_STYLES = [
  "concise",
  "narrative",
  "enthusiastic",
] as const;
export type CoverLetterStyle = (typeof COVER_LETTER_STYLES)[number];

export const coverLetterContentSchema = z.object({
  style: z.enum(COVER_LETTER_STYLES),
  greeting: z.string(),
  paragraphs: z.array(z.string()),
  closing: z.string(),
  signature: z.string(),
});
export type CoverLetterContent = z.infer<typeof coverLetterContentSchema>;

export const coverLetterSetSchema = z.object({
  letters: z.array(coverLetterContentSchema),
  portfolioUsed: z.string().nullable(),
});

export const INTERVIEW_CATEGORIES = [
  "behavioral",
  "technical",
  "ask-them",
] as const;

export const interviewQuestionSchema = z.object({
  question: z.string(),
  category: z.enum(INTERVIEW_CATEGORIES),
  suggestedApproach: z.string(),
});
export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;

export const interviewPrepSchema = z.object({
  questions: z.array(interviewQuestionSchema),
});

/* -------------------------------------------------------------------------- */
/* Job status                                                                 */
/* -------------------------------------------------------------------------- */

export const JOB_STATUSES = [
  "saved",
  "tailoring",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
] as const;
export type JobStatusValue = (typeof JOB_STATUSES)[number];

export const jobStatusSchema = z.enum(JOB_STATUSES);

/** Columns on the kanban board, in funnel order. */
export const BOARD_COLUMNS: {
  status: JobStatusValue;
  label: string;
}[] = [
  { status: "saved", label: "Saved" },
  { status: "tailoring", label: "Tailoring" },
  { status: "applied", label: "Applied" },
  { status: "interviewing", label: "Interviewing" },
  { status: "offer", label: "Offer" },
  { status: "rejected", label: "Rejected" },
];

export const STATUS_LABELS: Record<JobStatusValue, string> = {
  saved: "Saved",
  tailoring: "Tailoring",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/* -------------------------------------------------------------------------- */
/* API request payloads                                                       */
/* -------------------------------------------------------------------------- */

export const resumeInputSchema = z.object({
  name: z.string().min(1, "Give this resume version a name"),
  baseContent: resumeContentSchema,
});

export const jobInputSchema = z.object({
  company: z.string().min(1, "Company is required"),
  title: z.string().min(1, "Title is required"),
  url: z.string().optional().nullable(),
  rawDescription: z.string().min(1, "Paste the job description"),
  status: jobStatusSchema.optional(),
  notes: z.string().optional().nullable(),
  resumeVersionId: z.string().optional().nullable(),
  appliedDate: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
});

export const jobUpdateSchema = jobInputSchema.partial();

export const portfolioInputSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().min(1, "Describe the project"),
  techStack: z.array(z.string()).default([]),
  link: z.string().optional().nullable(),
  relevantSkills: z.array(z.string()).default([]),
});

/* -------------------------------------------------------------------------- */
/* Claude-facing output schemas                                               */
/* -------------------------------------------------------------------------- */

/**
 * Structured-output schemas sent to Claude keep every field required (empty
 * string for "not applicable"). Optional fields make the generated JSON schema
 * ambiguous and invite Claude to silently drop sections; the permissive
 * schemas above are what we use to read rows back out of Postgres.
 */

const contactOutputSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  linkedin: z.string(),
  website: z.string(),
});

const experienceOutputSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  bullets: z.array(z.string()),
});

const extracurricularOutputSchema = z.object({
  organization: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  bullets: z.array(z.string()),
});

const educationOutputSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  details: z.array(z.string()),
});

export const resumeContentOutputSchema = z.object({
  contact: contactOutputSchema,
  summary: z.string(),
  experience: z.array(experienceOutputSchema),
  extracurricular: z.array(extracurricularOutputSchema),
  skills: z.array(skillGroupSchema),
  education: z.array(educationOutputSchema),
});

export const tailoredResumeOutputSchema = z.object({
  content: resumeContentOutputSchema,
  changeNotes: z.array(z.string()),
});
