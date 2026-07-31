import { prisma } from "@/lib/prisma";
import { notFound, ok, parseBody, route } from "@/lib/api";
import { resumeInputSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  return route(async () => {
    const { id } = await params;
    const resume = await prisma.resume.findUnique({ where: { id } });
    if (!resume) notFound("Resume");
    return ok(resume);
  });
}

export async function PUT(request: Request, { params }: Ctx) {
  return route(async () => {
    const { id } = await params;
    const input = await parseBody(request, resumeInputSchema.partial());
    const existing = await prisma.resume.findUnique({ where: { id } });
    if (!existing) notFound("Resume");
    const resume = await prisma.resume.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.baseContent !== undefined
          ? { baseContent: input.baseContent }
          : {}),
      },
    });
    return ok(resume);
  });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  return route(async () => {
    const { id } = await params;
    const existing = await prisma.resume.findUnique({ where: { id } });
    if (!existing) notFound("Resume");
    // Jobs referencing this version keep their history; FK is set null.
    await prisma.resume.delete({ where: { id } });
    return ok({ deleted: true });
  });
}
