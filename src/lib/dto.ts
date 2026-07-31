import type {
  CoverLetterContent,
  JobStatusValue,
  ParsedRequirements,
  ResumeContent,
  ScoreDetail,
} from "@/lib/schemas";

/**
 * Serialized shapes handed from server components to client components. Dates
 * become ISO strings and JSON columns get their real types so the UI is fully
 * typed end to end.
 */

export interface ResumeDTO {
  id: string;
  name: string;
  baseContent: ResumeContent;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDTO {
  id: string;
  jobId: string;
  type: "resume" | "coverLetter";
  label: string | null;
  content: ResumeContent | CoverLetterContent;
  pdfBlobUrl: string | null;
  portfolioId: string | null;
  createdAt: string;
}

export interface JobDTO {
  id: string;
  company: string;
  title: string;
  url: string | null;
  rawDescription: string;
  parsedRequirements: ParsedRequirements | null;
  status: JobStatusValue;
  appliedDate: string | null;
  followUpDate: string | null;
  notes: string | null;
  resumeVersionId: string | null;
  resumeVersionName: string | null;
  matchScore: number | null;
  scoreDetail: ScoreDetail | null;
  statusChangedAt: string;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
  hasInterviewPrep: boolean;
}

export interface PortfolioDTO {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  link: string | null;
  relevantSkills: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InterviewPrepDTO {
  id: string;
  jobId: string;
  questions: {
    question: string;
    category: "behavioral" | "technical" | "ask-them";
    suggestedApproach: string;
  }[];
  updatedAt: string;
}
