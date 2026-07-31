import { prisma, CURRENT_USER_ID } from "@/lib/prisma";
import { toResumeDTO } from "@/lib/serialize";
import { ResumesManager } from "@/components/resume/ResumesManager";

export const dynamic = "force-dynamic";

export default async function ResumesPage() {
  const resumes = await prisma.resume.findMany({
    where: { userId: CURRENT_USER_ID },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resume library</h1>
        <p className="text-text-muted text-sm mt-0.5">
          Your base versions by role type. Tailoring never touches these — it
          always creates a separate document on the job.
        </p>
      </div>
      <ResumesManager initial={resumes.map(toResumeDTO)} />
    </div>
  );
}
