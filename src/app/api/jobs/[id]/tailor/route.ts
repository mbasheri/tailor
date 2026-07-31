import { z } from "zod";
import { prisma, CURRENT_USER_ID } from "@/lib/prisma";
import { ok, parseBody, route } from "@/lib/api";
import { resolveJobAndResume } from "@/lib/job-resume";
import {
  pickRelevantPortfolio,
  tailorResume,
} from "@/lib/ai/features";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  resumeVersionId: z.string().optional().nullable(),
});

export async function POST(request: Request, { params }: Ctx) {
  return route(async () => {
    const { id } = await params;
    const { resumeVersionId } = await parseBody(request, bodySchema);
    const { job, resume, content } = await resolveJobAndResume(
      id,
      resumeVersionId,
    );

    const projects = await prisma.portfolio.findMany({
      where: { userId: CURRENT_USER_ID },
    });
    const picked = pickRelevantPortfolio(
      projects,
      `${job.title} ${job.rawDescription}`,
      job.parsedRequirements as never,
    );

    const tailored = await tailorResume({
      resume: content,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.rawDescription,
      portfolio: picked
        ? { name: picked.name, description: picked.description }
        : null,
    });

    // Tailoring never mutates the base resume — it always writes a new document.
    const document = await prisma.tailoredDocument.create({
      data: {
        jobId: id,
        type: "resume",
        label: `Tailored from "${resume.name}"`,
        content: tailored.content,
        portfolioId: picked?.id ?? null,
      },
    });

    // Anchor this resume version to the job if it had none, and nudge status.
    await prisma.job.update({
      where: { id },
      data: {
        resumeVersionId: job.resumeVersionId ?? resume.id,
        status: job.status === "saved" ? "tailoring" : job.status,
        ...(job.status === "saved" ? { statusChangedAt: new Date() } : {}),
      },
    });

    return ok({ document, changeNotes: tailored.changeNotes }, 201);
  });
}
