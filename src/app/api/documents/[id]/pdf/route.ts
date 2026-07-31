import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { notFound, ok, route } from "@/lib/api";
import { renderCoverLetterPdf, renderResumePdf } from "@/lib/pdf/documents";
import {
  coverLetterContentSchema,
  resumeContentSchema,
} from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Renders a tailored document to a single-page PDF. When a Blob token is
 * configured the file is uploaded and its URL saved on the document so past
 * exports stay downloadable. Without a token (e.g. local dev) the PDF is
 * streamed back directly so export still works.
 */
export async function POST(_request: Request, { params }: Ctx) {
  return route(async () => {
    const { id } = await params;
    const doc = await prisma.tailoredDocument.findUnique({
      where: { id },
      include: { job: true },
    });
    if (!doc) notFound("Document");

    let buffer: Buffer;
    let filename: string;

    if (doc.type === "resume") {
      const content = resumeContentSchema.parse(doc.content);
      buffer = await renderResumePdf(content);
      filename = `${slugify(content.contact.name || "resume")}-${slugify(
        doc.job.company,
      )}-resume.pdf`;
    } else {
      const content = coverLetterContentSchema.parse(doc.content);
      buffer = await renderCoverLetterPdf({
        content,
        candidateName: content.signature || "Candidate",
        company: doc.job.company,
        jobTitle: doc.job.title,
      });
      filename = `${slugify(content.signature || "cover-letter")}-${slugify(
        doc.job.company,
      )}-${content.style}-cover-letter.pdf`;
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      const blob = await put(`documents/${id}/${filename}`, buffer, {
        access: "public",
        contentType: "application/pdf",
        token,
        addRandomSuffix: true,
      });
      const updated = await prisma.tailoredDocument.update({
        where: { id },
        data: { pdfBlobUrl: blob.url },
      });
      return ok({ pdfBlobUrl: updated.pdfBlobUrl, filename });
    }

    // No Blob token: hand back the bytes so the export still works locally.
    const body = new Uint8Array(buffer);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Blob-Persisted": "false",
      },
    });
  });
}

export const dynamic = "force-dynamic";
