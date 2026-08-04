import { parseBody, route } from "@/lib/api";
import { applyDocxEdits } from "@/lib/docx";
import { docxExportRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 30;

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Writes the (possibly user-edited) reworded lines back into the ORIGINAL .docx
 * and streams it for download. Only the text inside runs changes — every style,
 * font, and numbering definition is left exactly as uploaded. Nothing is stored.
 */
export async function POST(request: Request) {
  return route(async () => {
    const { docxBase64, edits } = await parseBody(request, docxExportRequestSchema);
    const original = Buffer.from(docxBase64, "base64");
    const out = await applyDocxEdits(original, edits);

    return new Response(new Uint8Array(out), {
      status: 200,
      headers: {
        "Content-Type": DOCX_MIME,
        "Content-Disposition": `attachment; filename="resume-tailoured.docx"`,
      },
    });
  });
}
