import { z } from "zod";

/**
 * A resume is modeled as an ordered list of sections, each with the heading the
 * candidate actually used and a list of entries. This lets us preserve ANY
 * resume's own structure (section order, headings, entry grouping) instead of
 * forcing a fixed template — the model reproduces the structure and only rewords
 * the content within it. Nothing is persisted; these schemas guard the boundary
 * between the model's JSON and what we render/export in a single session.
 */

/* -------------------------------------------------------------------------- */
/* Contact (stripped before the model call, re-attached locally)              */
/* -------------------------------------------------------------------------- */

export const contactSchema = z.object({
  name: z.string().optional().default(""),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  location: z.string().optional().default(""),
  linkedin: z.string().optional().default(""),
  website: z.string().optional().default(""),
});
export type Contact = z.infer<typeof contactSchema>;

/* -------------------------------------------------------------------------- */
/* Flexible section/entry model                                               */
/* -------------------------------------------------------------------------- */

/**
 * One item within a section. Fields are generic so the same shape covers a job
 * (title=role, subtitle=employer, dateRange, bullets), a degree (title=degree,
 * subtitle=institution), a project (title=name, bullets), a skills line
 * (title=category, text="Excel, SQL, …"), or a summary (text only).
 */
export const entrySchema = z.object({
  title: z.string().optional().default(""),
  subtitle: z.string().optional().default(""),
  dateRange: z.string().optional().default(""),
  location: z.string().optional().default(""),
  bullets: z.array(z.string()).optional().default([]),
  text: z.string().optional().default(""),
});
export type ResumeEntry = z.infer<typeof entrySchema>;

export const sectionSchema = z.object({
  /** The heading exactly as it appears on the candidate's resume. */
  heading: z.string(),
  entries: z.array(entrySchema).default([]),
});
export type ResumeSection = z.infer<typeof sectionSchema>;

export const resumeStructureSchema = z.object({
  contact: contactSchema,
  sections: z.array(sectionSchema).default([]),
});
export type ResumeStructure = z.infer<typeof resumeStructureSchema>;

export const emptyResume: ResumeStructure = {
  contact: {
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    website: "",
  },
  sections: [],
};

/* -------------------------------------------------------------------------- */
/* Tailoring output (from Gemini — no contact)                               */
/* -------------------------------------------------------------------------- */

export const tailorResultSchema = z.object({
  roleType: z.string(),
  conventions: z.array(z.string()),
  changeNotes: z.array(z.string()),
  /** Sections in the SAME order and with the SAME headings as the original. */
  sections: z.array(sectionSchema),
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
  resume: resumeStructureSchema,
});

/* -------------------------------------------------------------------------- */
/* .docx in-place flow                                                        */
/* -------------------------------------------------------------------------- */

export const docxLineSchema = z.object({
  id: z.string(),
  text: z.string(),
});
export type DocxLine = z.infer<typeof docxLineSchema>;

/** Gemini reword result for the docx flow — one entry per input line. */
export const rewordResultSchema = z.object({
  roleType: z.string(),
  conventions: z.array(z.string()),
  changeNotes: z.array(z.string()),
  lines: z.array(docxLineSchema),
});
export type RewordResult = z.infer<typeof rewordResultSchema>;

export const tailorDocxRequestSchema = z.object({
  jobText: z.string().min(1, "Provide the job description"),
  lines: z.array(docxLineSchema).min(1, "No tailorable content found"),
});

export const exportDocxRequestSchema = z.object({
  docxBase64: z.string().min(1),
  edits: z.array(docxLineSchema),
});
