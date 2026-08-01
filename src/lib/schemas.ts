import { z } from "zod";

/**
 * Resume content shapes + the Gemini tailoring output, all validated with Zod.
 * Nothing is persisted anywhere — these guard the boundary between the model's
 * JSON and what we render/export in a single session.
 */

/* -------------------------------------------------------------------------- */
/* Resume content                                                             */
/* -------------------------------------------------------------------------- */

export const contactSchema = z.object({
  name: z.string(),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  location: z.string().optional().default(""),
  linkedin: z.string().optional().default(""),
  website: z.string().optional().default(""),
});

export const experienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().optional().default(""),
  startDate: z.string().optional().default(""),
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

/** The parts of a resume the model may rewrite — everything except contact. */
export const resumeBodySchema = z.object({
  summary: z.string().optional().default(""),
  experience: z.array(experienceSchema).default([]),
  extracurricular: z.array(extracurricularSchema).default([]),
  skills: z.array(skillGroupSchema).default([]),
  education: z.array(educationSchema).default([]),
});
export type ResumeBody = z.infer<typeof resumeBodySchema>;

export const resumeContentSchema = resumeBodySchema.extend({
  contact: contactSchema,
});
export type ResumeContent = z.infer<typeof resumeContentSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type SkillGroup = z.infer<typeof skillGroupSchema>;
export type Contact = z.infer<typeof contactSchema>;

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
/* Tailoring output (from Gemini)                                             */
/* -------------------------------------------------------------------------- */

/**
 * What the model returns. It never sees or returns contact info — that's
 * stripped before the call and re-attached locally. `content` is the rewritten
 * resume body; `roleType`/`conventions` expose the model's reasoning so the
 * user can sanity-check it; `changeNotes` is a short "what I changed and why".
 */
export const tailorResultSchema = z.object({
  roleType: z.string(),
  conventions: z.array(z.string()),
  content: resumeBodySchema,
  changeNotes: z.array(z.string()),
});
export type TailorResult = z.infer<typeof tailorResultSchema>;

/* -------------------------------------------------------------------------- */
/* API request payloads                                                       */
/* -------------------------------------------------------------------------- */

export const tailorRequestSchema = z.object({
  jobText: z.string().min(1, "Provide the job description"),
  resumeText: z.string().min(1, "Provide your resume"),
});

export const fetchJobRequestSchema = z.object({
  url: z.string().url("Enter a valid URL"),
});

export const exportPdfRequestSchema = z.object({
  content: resumeContentSchema,
});
