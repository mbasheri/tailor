import { z } from "zod";
import { prisma, CURRENT_USER_ID } from "@/lib/prisma";
import { ok, parseBody, route } from "@/lib/api";
import { resolveJobAndResume } from "@/lib/job-resume";
import {
  generateCoverLetters,
  pickRelevantPortfolio,
} from "@/lib/ai/features";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  resumeVersionId: z.string().optional().nullable(),
});

export async function POST(request: Request, { params }: Ctx) {
  return route(async () => {
    const { id } = await params;
    const { resumeVersionId } = await parseBody(request, bodySchema);
    const { job, content } = await resolveJobAndResume(id, resumeVersionId);

    const projects = await prisma.portfolio.findMany({
      where: { userId: CURRENT_USER_ID },
    });
    const picked = pickRelevantPortfolio(
      projects,
      `${job.title} ${job.rawDescription}`,
      job.parsedRequirements as never,
    );

    const { letters, portfolioUsed } = await generateCoverLetters({
      resume: content,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.rawDescription,
      portfolio: picked
        ? {
            id: picked.id,
            name: picked.name,
            description: picked.description,
          }
        : null,
    });

    // Persist each style variant as its own document — nothing is auto-sent.
    const usedPortfolioId =
      portfolioUsed && picked && portfolioUsed === picked.name
        ? picked.id
        : null;

    const documents = await Promise.all(
      letters.map((letter) =>
        prisma.tailoredDocument.create({
          data: {
            jobId: id,
            type: "coverLetter",
            label: letter.style,
            content: letter,
            portfolioId: usedPortfolioId,
          },
        }),
      ),
    );

    return ok({ documents, portfolioUsed }, 201);
  });
}
