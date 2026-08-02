import { ok, parseBody, route } from "@/lib/api";
import { redactContact } from "@/lib/contact";
import { generateTailoredResume } from "@/lib/gemini";
import { tailorRequestSchema, type ResumeStructure } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The core call. Strips contact info locally (privacy option b), sends only the
 * redacted resume + job text to Gemini, then re-attaches the real contact to
 * the model's structure-preserving rewrite. Nothing is persisted.
 */
export async function POST(request: Request) {
  return route(async () => {
    const { jobText, resumeText } = await parseBody(request, tailorRequestSchema);

    const { redactedText, contact } = redactContact(resumeText);

    const result = await generateTailoredResume({
      jobText,
      redactedResumeText: redactedText,
    });

    // Re-attach the contact the model never saw.
    const resume: ResumeStructure = { contact, sections: result.sections };

    return ok({
      roleType: result.roleType,
      conventions: result.conventions,
      changeNotes: result.changeNotes,
      resume,
    });
  });
}
