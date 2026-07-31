import { prisma, CURRENT_USER_ID } from "@/lib/prisma";
import { ok, parseBody, route } from "@/lib/api";
import { resumeInputSchema } from "@/lib/schemas";

export async function GET() {
  return route(async () => {
    const resumes = await prisma.resume.findMany({
      where: { userId: CURRENT_USER_ID },
      orderBy: { updatedAt: "desc" },
    });
    return ok(resumes);
  });
}

export async function POST(request: Request) {
  return route(async () => {
    const input = await parseBody(request, resumeInputSchema);
    const resume = await prisma.resume.create({
      data: {
        userId: CURRENT_USER_ID,
        name: input.name,
        baseContent: input.baseContent,
      },
    });
    return ok(resume, 201);
  });
}
