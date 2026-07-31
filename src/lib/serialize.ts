import "server-only";
import type { Job, Resume, TailoredDocument, Portfolio } from "@/generated/prisma/client";
import type {
  CoverLetterContent,
  ParsedRequirements,
  ResumeContent,
  ScoreDetail,
} from "@/lib/schemas";
import type { DocumentDTO, JobDTO, PortfolioDTO, ResumeDTO } from "@/lib/dto";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export function toResumeDTO(r: Resume): ResumeDTO {
  return {
    id: r.id,
    name: r.name,
    baseContent: r.baseContent as unknown as ResumeContent,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function toPortfolioDTO(p: Portfolio): PortfolioDTO {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    techStack: p.techStack,
    link: p.link,
    relevantSkills: p.relevantSkills,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function toDocumentDTO(d: TailoredDocument): DocumentDTO {
  return {
    id: d.id,
    jobId: d.jobId,
    type: d.type,
    label: d.label,
    content: d.content as unknown as ResumeContent | CoverLetterContent,
    pdfBlobUrl: d.pdfBlobUrl,
    portfolioId: d.portfolioId,
    createdAt: d.createdAt.toISOString(),
  };
}

type JobWithRelations = Job & {
  resumeVersion?: { id: string; name: string } | null;
  _count?: { documents: number };
  interviewPrep?: { id: string } | null;
};

export function toJobDTO(j: JobWithRelations): JobDTO {
  return {
    id: j.id,
    company: j.company,
    title: j.title,
    url: j.url,
    rawDescription: j.rawDescription,
    parsedRequirements:
      (j.parsedRequirements as unknown as ParsedRequirements | null) ?? null,
    status: j.status,
    appliedDate: iso(j.appliedDate),
    followUpDate: iso(j.followUpDate),
    notes: j.notes,
    resumeVersionId: j.resumeVersionId,
    resumeVersionName: j.resumeVersion?.name ?? null,
    matchScore: j.matchScore,
    scoreDetail: (j.scoreDetail as unknown as ScoreDetail | null) ?? null,
    statusChangedAt: j.statusChangedAt.toISOString(),
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
    documentCount: j._count?.documents ?? 0,
    hasInterviewPrep: Boolean(j.interviewPrep),
  };
}
