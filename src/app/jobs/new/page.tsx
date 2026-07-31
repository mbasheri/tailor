import Link from "next/link";
import { prisma, CURRENT_USER_ID } from "@/lib/prisma";
import { toResumeDTO } from "@/lib/serialize";
import { NewJobForm } from "@/components/NewJobForm";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const resumes = await prisma.resume.findMany({
    where: { userId: CURRENT_USER_ID },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Add a job</h1>
        <Link href="/" className="btn btn-ghost text-sm">
          Cancel
        </Link>
      </div>
      <NewJobForm resumes={resumes.map(toResumeDTO)} />
    </div>
  );
}
