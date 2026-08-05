import { HttpError, ok, route } from "@/lib/api";
import { parseDocxResume } from "@/lib/docx";

export const runtime = "nodejs";
export const maxDuration = 30;

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * .docx upload -> rewordable content lines (grouped by position) plus the
 * original file echoed back as base64. Stateless: read into memory, nothing
 * written. tailour is docx-only so the export (docx, and a json view of the same
 * content) derives from the real file with its formatting intact.
 */
export async function POST(request: Request) {
  return route(async () => {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      throw new HttpError("upload a .docx file.", 400);
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new HttpError("that file is larger than 8 mb.", 413);
    }
    const isDocx =
      file.type === DOCX_MIME || file.name.toLowerCase().endsWith(".docx");
    if (!isDocx) {
      throw new HttpError("please upload a word .docx file.", 415);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseDocxResume(buffer);
    if (parsed.lines.length === 0) {
      throw new HttpError(
        "couldn't find tailourable bullet/summary content in that .docx.",
        422,
      );
    }

    return ok({
      docxBase64: buffer.toString("base64"),
      lines: parsed.lines,
      warnings: parsed.warnings,
    });
  });
}
