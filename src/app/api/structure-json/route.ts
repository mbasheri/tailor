import { ok, parseBody, route } from "@/lib/api";
import { buildFinalText } from "@/lib/docx";
import { redactContact } from "@/lib/contact";
import { structureResumeJson } from "@/lib/gemini";
import { docxExportRequestSchema, type ResumeJson } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Builds the structured JSON from the SAME tailoured content as the docx
 * export: reconstruct the final resume text (original + the same edits), pull
 * contact fields out LOCALLY (never sent to the model), and ask the model to
 * organize the remaining, already-tailoured text into fields. Per-request,
 * returned to the client, never stored.
 */
export async function POST(request: Request) {
  return route(async () => {
    const { docxBase64, edits } = await parseBody(request, docxExportRequestSchema);
    const original = Buffer.from(docxBase64, "base64");

    const finalText = await buildFinalText(original, edits);
    const { redactedText, contact } = redactContact(finalText);
    const body = await structureResumeJson(redactedText);

    const json: ResumeJson = {
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      location: contact.location,
      ...body,
    };
    return ok(json);
  });
}
