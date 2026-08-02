import { parseBody, route } from "@/lib/api";
import { renderResumePdf } from "@/lib/pdf/documents";
import { exportPdfRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 30;

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "resume"
  );
}

/**
 * Renders the (possibly user-edited) resume to a single-page ATS-safe PDF and
 * streams it straight back for download. No Blob, no storage.
 */
export async function POST(request: Request) {
  return route(async () => {
    const { resume } = await parseBody(request, exportPdfRequestSchema);
    const buffer = await renderResumePdf(resume);
    const filename = `${slugify(resume.contact.name || "resume")}-tailored.pdf`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}
