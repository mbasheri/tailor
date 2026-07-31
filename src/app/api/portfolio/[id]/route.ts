import { prisma } from "@/lib/prisma";
import { notFound, ok, parseBody, route } from "@/lib/api";
import { portfolioInputSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Ctx) {
  return route(async () => {
    const { id } = await params;
    const input = await parseBody(request, portfolioInputSchema.partial());
    const existing = await prisma.portfolio.findUnique({ where: { id } });
    if (!existing) notFound("Project");
    const project = await prisma.portfolio.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.techStack !== undefined ? { techStack: input.techStack } : {}),
        ...(input.link !== undefined ? { link: input.link } : {}),
        ...(input.relevantSkills !== undefined
          ? { relevantSkills: input.relevantSkills }
          : {}),
      },
    });
    return ok(project);
  });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  return route(async () => {
    const { id } = await params;
    const existing = await prisma.portfolio.findUnique({ where: { id } });
    if (!existing) notFound("Project");
    await prisma.portfolio.delete({ where: { id } });
    return ok({ deleted: true });
  });
}
