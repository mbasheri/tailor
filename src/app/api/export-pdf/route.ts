import { parseBody, route } from "@/lib/api";
import { applyDocxEdits } from "@/lib/docx";
import { renderDocxToPdf } from "@/lib/pdf";
import { docxExportRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";
// Headless Chromium cold-starts can be slow; give it room.
export const maxDuration = 60;

/**
 * pdf export, built ON TOP OF the reworded .docx (not a separate template):
 * apply the same edits to the original file, then convert that exact document to
 * pdf. Same content and formatting source as the .docx download. Stateless.
 */
export async function POST(request: Request) {
  return route(async () => {
    const { docxBase64, edits } = await parseBody(request, docxExportRequestSchema);
    const original = Buffer.from(docxBase64, "base64");
    const reworded = await applyDocxEdits(original, edits);
    const pdf = await renderDocxToPdf(reworded);

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="resume-tailoured.pdf"`,
      },
    });
  });
}
