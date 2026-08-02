import { ok, parseBody, route } from "@/lib/api";
import { rewordResumeLines } from "@/lib/gemini";
import { tailorDocxRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Rewords the content lines extracted from a .docx to fit the job — in place,
 * one output per input line, same ids. The lines sent here are already filtered
 * to bullets/prose (never the name/contact/header lines), so no contact info
 * reaches the model. Nothing is persisted.
 */
export async function POST(request: Request) {
  return route(async () => {
    const { jobText, lines } = await parseBody(request, tailorDocxRequestSchema);
    const result = await rewordResumeLines({ jobText, lines });
    return ok(result);
  });
}
