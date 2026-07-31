import { prisma, CURRENT_USER_ID } from "@/lib/prisma";
import { ok, parseBody, route } from "@/lib/api";
import { jobInputSchema } from "@/lib/schemas";

export async function GET() {
  return route(async () => {
    const jobs = await prisma.job.findMany({
      where: { userId: CURRENT_USER_ID },
      orderBy: { updatedAt: "desc" },
      include: {
        resumeVersion: { select: { id: true, name: true } },
        _count: { select: { documents: true } },
        interviewPrep: { select: { id: true } },
      },
    });
    return ok(jobs);
  });
}

export async function POST(request: Request) {
  return route(async () => {
    const input = await parseBody(request, jobInputSchema);
    const job = await prisma.job.create({
      data: {
        userId: CURRENT_USER_ID,
        company: input.company,
        title: input.title,
        url: input.url ?? null,
        rawDescription: input.rawDescription,
        status: input.status ?? "saved",
        notes: input.notes ?? null,
        resumeVersionId: input.resumeVersionId ?? null,
        appliedDate: input.appliedDate ? new Date(input.appliedDate) : null,
        followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
      },
    });
    return ok(job, 201);
  });
}
