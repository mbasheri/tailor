import { prisma } from "@/lib/prisma";
import { HttpError, notFound } from "@/lib/api";
import { resumeContentSchema, type ResumeContent } from "@/lib/schemas";

/**
 * Resolves the resume content to use for an AI action on a job. Preference
 * order: an explicitly requested version, then the version already anchored to
 * the job. Returns the parsed, validated content plus the resume row.
 */
export async function resolveJobAndResume(
  jobId: string,
  requestedResumeId?: string | null,
) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) notFound("Job");

  const resumeId = requestedResumeId ?? job.resumeVersionId;
  if (!resumeId) {
    throw new HttpError(
      "Pick a resume version first — none is attached to this job.",
      400,
    );
  }

  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume) notFound("Resume");

  const content: ResumeContent = resumeContentSchema.parse(resume.baseContent);
  return { job, resume, content };
}
