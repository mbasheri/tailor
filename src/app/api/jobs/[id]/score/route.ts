import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, parseBody, route } from "@/lib/api";
import { resolveJobAndResume } from "@/lib/job-resume";
import { scoreResumeAgainstJob } from "@/lib/ai/features";
import type { ScoreDetail } from "@/lib/schemas";

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

    const result = await scoreResumeAgainstJob({
      resume: content,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.rawDescription,
    });

    const scoreDetail: ScoreDetail = {
      matchedKeywords: result.matchedKeywords,
      missingKeywords: result.missingKeywords,
      summary: result.summary,
      parsedRequirements: result.parsedRequirements,
      scoredAt: new Date().toISOString(),
      resumeVersionId: resume.id,
    };

    // Persist the score so the board and analytics never recompute. Also anchor
    // the scored resume version to the job if it had none.
    const updated = await prisma.job.update({
      where: { id },
      data: {
        matchScore: result.matchScore,
        scoreDetail,
        parsedRequirements: result.parsedRequirements,
        resumeVersionId: job.resumeVersionId ?? resume.id,
      },
    });

    return ok({ job: updated, score: result });
  });
}
