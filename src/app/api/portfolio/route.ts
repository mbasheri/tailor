import { prisma, CURRENT_USER_ID } from "@/lib/prisma";
import { ok, parseBody, route } from "@/lib/api";
import { portfolioInputSchema } from "@/lib/schemas";

export async function GET() {
  return route(async () => {
    const projects = await prisma.portfolio.findMany({
      where: { userId: CURRENT_USER_ID },
      orderBy: { updatedAt: "desc" },
    });
    return ok(projects);
  });
}

export async function POST(request: Request) {
  return route(async () => {
    const input = await parseBody(request, portfolioInputSchema);
    const project = await prisma.portfolio.create({
      data: {
        userId: CURRENT_USER_ID,
        name: input.name,
        description: input.description,
        techStack: input.techStack,
        link: input.link ?? null,
        relevantSkills: input.relevantSkills,
      },
    });
    return ok(project, 201);
  });
}
