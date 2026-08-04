import { z } from "zod";

/**
 * tailour is docx-first: a resume is edited in place inside its own .docx, so we
 * only reword the text of existing bullet/prose runs and leave all formatting
 * untouched. These schemas guard the boundary between the model's JSON and what
 * we export in a single, stateless request. Nothing is persisted.
 */

/* -------------------------------------------------------------------------- */
/* Contact (extracted locally, never sent to the model)                       */
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
/* .docx in-place flow                                                        */
/* -------------------------------------------------------------------------- */

/** A rewordable line sent to / returned from the model. */
export const docxLineSchema = z.object({
  id: z.string(),
  text: z.string(),
});
export type DocxLine = z.infer<typeof docxLineSchema>;

/**
 * A parsed line carries a `group` (the job/position it sits under) so the review
 * UI can cluster changes by position. `group` never leaves the client — it is
 * not part of the model round-trip.
 */
export interface ParsedDocxLine extends DocxLine {
  group: string;
}

/** Gemini reword result for the docx flow — one entry per input line. */
export const rewordResultSchema = z.object({
  roleType: z.string(),
  conventions: z.array(z.string()),
  changeNotes: z.array(z.string()),
  lines: z.array(docxLineSchema),
});
export type RewordResult = z.infer<typeof rewordResultSchema>;

/* -------------------------------------------------------------------------- */
/* Structured JSON output (for a future ATS auto-fill flow)                   */
/* -------------------------------------------------------------------------- */

export const resumeJsonExperienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  dates: z.string(),
  bullets: z.array(z.string()),
});

export const resumeJsonEducationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  dates: z.string(),
});

/** Built by the model from the tailoured resume body (contact fields are filled
 * locally). Field names are generic to map onto common ATS form fields. */
export const resumeJsonBodySchema = z.object({
  summary: z.string(),
  skills: z.array(z.string()),
  experience: z.array(resumeJsonExperienceSchema),
  education: z.array(resumeJsonEducationSchema),
  certifications: z.array(z.string()),
});
export type ResumeJsonBody = z.infer<typeof resumeJsonBodySchema>;

export const resumeJsonSchema = resumeJsonBodySchema.extend({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
});
export type ResumeJson = z.infer<typeof resumeJsonSchema>;

/* -------------------------------------------------------------------------- */
/* API request payloads                                                       */
/* -------------------------------------------------------------------------- */

export const fetchJobRequestSchema = z.object({
  url: z.string().url("enter a valid url"),
});

export const tailourDocxRequestSchema = z.object({
  jobText: z.string().min(1, "provide the job description"),
  lines: z.array(docxLineSchema).min(1, "no tailourable content found"),
});

/** Used by both the docx and pdf exports, and by the json builder — all derive
 * from the same original file plus the same edits, so outputs always agree. */
export const docxExportRequestSchema = z.object({
  docxBase64: z.string().min(1),
  edits: z.array(docxLineSchema),
});
