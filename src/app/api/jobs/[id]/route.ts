import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { notFound, ok, parseBody, route } from "@/lib/api";
import { jobUpdateSchema } from "@/lib/schemas";
import { addBusinessDays, FOLLOW_UP_BUSINESS_DAYS } from "@/lib/dates";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  return route(async () => {
    const { id } = await params;
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        resumeVersion: true,
        documents: { orderBy: { createdAt: "desc" } },
        interviewPrep: true,
      },
    });
    if (!job) notFound("Job");
    return ok(job);
  });
}

export async function PUT(request: Request, { params }: Ctx) {
  return route(async () => {
    const { id } = await params;
    const input = await parseBody(request, jobUpdateSchema);
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) notFound("Job");

    const data: Prisma.JobUpdateInput = {};

    if (input.company !== undefined) data.company = input.company;
    if (input.title !== undefined) data.title = input.title;
    if (input.url !== undefined) data.url = input.url;
    if (input.rawDescription !== undefined)
      data.rawDescription = input.rawDescription;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.resumeVersionId !== undefined) {
      data.resumeVersion = input.resumeVersionId
        ? { connect: { id: input.resumeVersionId } }
        : { disconnect: true };
    }
    if (input.followUpDate !== undefined) {
      data.followUpDate = input.followUpDate
        ? new Date(input.followUpDate)
        : null;
    }
    if (input.appliedDate !== undefined) {
      data.appliedDate = input.appliedDate ? new Date(input.appliedDate) : null;
    }

    // Status transitions carry side effects: stamp statusChangedAt, and when a
    // job first becomes "applied" auto-fill the applied date + follow-up date.
    if (input.status !== undefined && input.status !== existing.status) {
      data.status = input.status;
      data.statusChangedAt = new Date();

      if (input.status === "applied" && !existing.appliedDate) {
        const appliedAt = input.appliedDate
          ? new Date(input.appliedDate)
          : new Date();
        data.appliedDate = appliedAt;
        if (input.followUpDate === undefined && !existing.followUpDate) {
          data.followUpDate = addBusinessDays(
            appliedAt,
            FOLLOW_UP_BUSINESS_DAYS,
          );
        }
      }
    }

    const job = await prisma.job.update({ where: { id }, data });
    return ok(job);
  });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  return route(async () => {
    const { id } = await params;
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) notFound("Job");
    await prisma.job.delete({ where: { id } });
    return ok({ deleted: true });
  });
}
