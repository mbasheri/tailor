import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, CURRENT_USER_ID } from "@/lib/prisma";
import { toDocumentDTO, toJobDTO, toResumeDTO } from "@/lib/serialize";
import type { InterviewPrepDTO } from "@/lib/dto";
import { JobDetail } from "@/components/job/JobDetail";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      resumeVersion: { select: { id: true, name: true } },
      documents: { orderBy: { createdAt: "desc" } },
      interviewPrep: true,
      _count: { select: { documents: true } },
    },
  });
  if (!job || job.userId !== CURRENT_USER_ID) notFound();

  const resumes = await prisma.resume.findMany({
    where: { userId: CURRENT_USER_ID },
    orderBy: { updatedAt: "desc" },
  });

  const prep: InterviewPrepDTO | null = job.interviewPrep
    ? {
        id: job.interviewPrep.id,
        jobId: id,
        questions: job.interviewPrep.questions as InterviewPrepDTO["questions"],
        updatedAt: job.interviewPrep.updatedAt.toISOString(),
      }
    : null;

  return (
    <div className="space-y-5">
      <Link href="/" className="text-text-muted text-sm hover:text-text">
        ← Back to board
      </Link>
      <JobDetail
        job={toJobDTO(job)}
        resumes={resumes.map(toResumeDTO)}
        initialDocuments={job.documents.map(toDocumentDTO)}
        initialPrep={prep}
      />
    </div>
  );
}
