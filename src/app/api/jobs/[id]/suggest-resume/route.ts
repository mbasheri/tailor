import { prisma, CURRENT_USER_ID } from "@/lib/prisma";
import { HttpError, notFound, ok, route } from "@/lib/api";
import { suggestBestResume } from "@/lib/ai/features";
import { resumeContentSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Ctx) {
  return route(async () => {
    const { id } = await params;
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) notFound("Job");

    const resumes = await prisma.resume.findMany({
      where: { userId: CURRENT_USER_ID },
    });
    if (resumes.length === 0) {
      throw new HttpError("Add at least one base resume first.", 400);
    }

    const suggestion = await suggestBestResume({
      resumes: resumes.map((r) => ({
        id: r.id,
        name: r.name,
        content: resumeContentSchema.parse(r.baseContent),
      })),
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.rawDescription,
    });

    // Guard against a hallucinated id.
    const picked =
      resumes.find((r) => r.id === suggestion.resumeId) ?? resumes[0];

    return ok({
      resumeId: picked.id,
      resumeName: picked.name,
      reasoning: suggestion.reasoning,
    });
  });
}
