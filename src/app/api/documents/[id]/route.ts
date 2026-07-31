import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notFound, ok, parseBody, route } from "@/lib/api";
import { coverLetterContentSchema, resumeContentSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  content: z.unknown(),
  label: z.string().optional(),
});

export async function GET(_request: Request, { params }: Ctx) {
  return route(async () => {
    const { id } = await params;
    const doc = await prisma.tailoredDocument.findUnique({ where: { id } });
    if (!doc) notFound("Document");
    return ok(doc);
  });
}

export async function PUT(request: Request, { params }: Ctx) {
  return route(async () => {
    const { id } = await params;
    const body = await parseBody(request, bodySchema);
    const existing = await prisma.tailoredDocument.findUnique({
      where: { id },
    });
    if (!existing) notFound("Document");

    // Validate the edited content against the schema for this document's type.
    const content =
      existing.type === "resume"
        ? resumeContentSchema.parse(body.content)
        : coverLetterContentSchema.parse(body.content);

    const doc = await prisma.tailoredDocument.update({
      where: { id },
      data: {
        content,
        ...(body.label !== undefined ? { label: body.label } : {}),
        // Content changed — the stored PDF is now stale.
        pdfBlobUrl: null,
      },
    });
    return ok(doc);
  });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  return route(async () => {
    const { id } = await params;
    const existing = await prisma.tailoredDocument.findUnique({
      where: { id },
    });
    if (!existing) notFound("Document");
    await prisma.tailoredDocument.delete({ where: { id } });
    return ok({ deleted: true });
  });
}
