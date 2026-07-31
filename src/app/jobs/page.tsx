import Link from "next/link";
import { prisma, CURRENT_USER_ID } from "@/lib/prisma";
import { toJobDTO } from "@/lib/serialize";
import { JobsTable } from "@/components/JobsTable";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await prisma.job.findMany({
    where: { userId: CURRENT_USER_ID },
    orderBy: { updatedAt: "desc" },
    include: {
      resumeVersion: { select: { id: true, name: true } },
      _count: { select: { documents: true } },
      interviewPrep: { select: { id: true } },
    },
  });
  const dto = jobs.map(toJobDTO);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {dto.length} {dto.length === 1 ? "application" : "applications"} tracked.
          </p>
        </div>
        <Link href="/" className="btn btn-ghost text-sm">
          ← Board view
        </Link>
      </div>

      {dto.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          hint="Add your first posting to start tracking."
          action={
            <Link href="/jobs/new" className="btn btn-primary">
              + Add job
            </Link>
          }
        />
      ) : (
        <JobsTable jobs={dto} />
      )}
    </div>
  );
}
