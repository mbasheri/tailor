import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, parseBody, route } from "@/lib/api";
import { resolveJobAndResume } from "@/lib/job-resume";
import { generateInterviewPrep } from "@/lib/ai/features";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  resumeVersionId: z.string().optional().nullable(),
});

export async function GET(_request: Request, { params }: Ctx) {
  return route(async () => {
    const { id } = await params;
    const prep = await prisma.interviewPrep.findUnique({
      where: { jobId: id },
    });
    return ok(prep);
  });
}

export async function POST(request: Request, { params }: Ctx) {
  return route(async () => {
    const { id } = await params;
    const { resumeVersionId } = await parseBody(request, bodySchema);
    const { job, content } = await resolveJobAndResume(id, resumeVersionId);

    const questions = await generateInterviewPrep({
      resume: content,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.rawDescription,
    });

    // One prep row per job, regenerable — revisit past prep for similar roles.
    const prep = await prisma.interviewPrep.upsert({
      where: { jobId: id },
      create: { jobId: id, questions },
      update: { questions },
    });

    return ok(prep, 201);
  });
}
