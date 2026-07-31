"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, jsonBody, putBody } from "@/lib/client";
import type {
  DocumentDTO,
  InterviewPrepDTO,
  JobDTO,
  ResumeDTO,
} from "@/lib/dto";
import {
  JOB_STATUSES,
  STATUS_LABELS,
  type JobStatusValue,
} from "@/lib/schemas";
import { StatusBadge, ErrorBanner, Spinner } from "@/components/ui";
import { ScoreCard } from "@/components/job/ScoreCard";
import { DocumentsPanel } from "@/components/job/DocumentsPanel";
import { InterviewPrepPanel } from "@/components/job/InterviewPrepPanel";

type Tab = "overview" | "documents" | "interview";

export function JobDetail({
  job: initialJob,
  resumes,
  initialDocuments,
  initialPrep,
}: {
  job: JobDTO;
  resumes: ResumeDTO[];
  initialDocuments: DocumentDTO[];
  initialPrep: InterviewPrepDTO | null;
}) {
  const router = useRouter();
  const [job, setJob] = useState(initialJob);
  const [documents, setDocuments] = useState(initialDocuments);
  const [prep, setPrep] = useState(initialPrep);
  const [selectedResumeId, setSelectedResumeId] = useState(
    job.resumeVersionId ?? resumes[0]?.id ?? "",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [suggestion, setSuggestion] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  async function patchJob(patch: Record<string, unknown>) {
    const updated = await api<JobDTO & { resumeVersion?: { name: string } }>(
      `/api/jobs/${job.id}`,
      putBody(patch),
    );
    setJob((j) => ({ ...j, ...updated } as JobDTO));
    refresh();
  }

  async function changeStatus(status: JobStatusValue) {
    setError(null);
    const prev = job.status;
    setJob((j) => ({ ...j, status }));
    try {
      await patchJob({ status });
    } catch (err) {
      setJob((j) => ({ ...j, status: prev }));
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function run<T>(name: string, fn: () => Promise<T>) {
    setBusy(name);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function score() {
    const res = await run("score", () =>
      api<{ job: JobDTO; score: JobDTO["scoreDetail"] & { matchScore: number } }>(
        `/api/jobs/${job.id}/score`,
        jsonBody({ resumeVersionId: selectedResumeId || null }),
      ),
    );
    if (res) {
      setJob((j) => ({
        ...j,
        matchScore: res.job.matchScore,
        scoreDetail: res.job.scoreDetail,
        parsedRequirements: res.job.parsedRequirements,
        resumeVersionId: res.job.resumeVersionId,
      }));
      refresh();
    }
  }

  async function suggestResume() {
    const res = await run("suggest", () =>
      api<{ resumeId: string; resumeName: string; reasoning: string }>(
        `/api/jobs/${job.id}/suggest-resume`,
        jsonBody({}),
      ),
    );
    if (res) {
      setSelectedResumeId(res.resumeId);
      setSuggestion(`${res.resumeName}: ${res.reasoning}`);
    }
  }

  async function tailor() {
    const res = await run("tailor", () =>
      api<{ document: DocumentDTO }>(
        `/api/jobs/${job.id}/tailor`,
        jsonBody({ resumeVersionId: selectedResumeId || null }),
      ),
    );
    if (res) {
      setDocuments((d) => [res.document, ...d]);
      setTab("documents");
      refresh();
    }
  }

  async function coverLetters() {
    const res = await run("cover", () =>
      api<{ documents: DocumentDTO[] }>(
        `/api/jobs/${job.id}/cover-letters`,
        jsonBody({ resumeVersionId: selectedResumeId || null }),
      ),
    );
    if (res) {
      setDocuments((d) => [...res.documents, ...d]);
      setTab("documents");
      refresh();
    }
  }

  async function interviewPrep() {
    const res = await run("interview", () =>
      api<InterviewPrepDTO>(
        `/api/jobs/${job.id}/interview-prep`,
        jsonBody({ resumeVersionId: selectedResumeId || null }),
      ),
    );
    if (res) {
      setPrep(res);
      setTab("interview");
      refresh();
    }
  }

  const noResumes = resumes.length === 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">
                {job.company}
              </h1>
              <StatusBadge status={job.status} />
            </div>
            <p className="text-text-muted mt-0.5">{job.title}</p>
            {job.url ? (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent text-sm hover:underline inline-block mt-1"
              >
                View posting ↗
              </a>
            ) : null}
          </div>

          <div className="flex flex-col items-end gap-2">
            <label className="label !mb-0">Status</label>
            <select
              value={job.status}
              onChange={(e) => changeStatus(e.target.value as JobStatusValue)}
              className="select !w-auto"
            >
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resume selection + AI action row */}
        <div className="mt-4 pt-4 border-t flex flex-col gap-3">
          {noResumes ? (
            <p className="text-warn text-sm">
              Add a resume version first to score, tailor, or prep.
            </p>
          ) : (
            <>
              <div className="flex items-end gap-2 flex-wrap">
                <div className="min-w-[200px]">
                  <label className="label">Work from resume version</label>
                  <select
                    className="select"
                    value={selectedResumeId}
                    onChange={(e) => {
                      setSelectedResumeId(e.target.value);
                      setSuggestion(null);
                    }}
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={suggestResume}
                  disabled={!!busy}
                  className="btn"
                >
                  {busy === "suggest" ? <Spinner /> : "✨ Suggest best"}
                </button>
              </div>
              {suggestion ? (
                <p className="text-sm text-accent bg-accent-soft border border-accent/30 rounded-lg px-3 py-2">
                  {suggestion}
                </p>
              ) : null}

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={score}
                  disabled={!!busy}
                  className="btn btn-primary"
                >
                  {busy === "score" ? <Spinner /> : "Score match"}
                </button>
                <button onClick={tailor} disabled={!!busy} className="btn">
                  {busy === "tailor" ? <Spinner /> : "Tailor resume"}
                </button>
                <button onClick={coverLetters} disabled={!!busy} className="btn">
                  {busy === "cover" ? <Spinner /> : "Cover letters"}
                </button>
                <button
                  onClick={interviewPrep}
                  disabled={!!busy}
                  className="btn"
                >
                  {busy === "interview" ? <Spinner /> : "Interview prep"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(
          [
            ["overview", "Overview"],
            ["documents", `Documents (${documents.length})`],
            ["interview", "Interview prep"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === key
                ? "border-accent text-text font-medium"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="space-y-5">
          <ScoreCard job={job} />
          <JobMeta job={job} onSave={patchJob} onError={setError} />
        </div>
      ) : null}

      {tab === "documents" ? (
        <DocumentsPanel
          documents={documents}
          setDocuments={setDocuments}
          onError={setError}
          onChanged={refresh}
        />
      ) : null}

      {tab === "interview" ? (
        <InterviewPrepPanel
          prep={prep}
          jobStatus={job.status}
          generating={busy === "interview"}
          onGenerate={interviewPrep}
        />
      ) : null}
    </div>
  );
}

/* --- Notes + dates sub-panel --------------------------------------------- */

function JobMeta({
  job,
  onSave,
  onError,
}: {
  job: JobDTO;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  onError: (m: string) => void;
}) {
  const [notes, setNotes] = useState(job.notes ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = notes !== (job.notes ?? "");

  async function saveNotes() {
    setSaving(true);
    try {
      await onSave({ notes: notes || null });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save notes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <div>
          <span className="label">Applied</span>
          <p className="text-text-muted">
            {job.appliedDate
              ? new Date(job.appliedDate).toLocaleDateString()
              : "Not yet"}
          </p>
        </div>
        <div>
          <span className="label">Follow-up by</span>
          <p className="text-text-muted">
            {job.followUpDate
              ? new Date(job.followUpDate).toLocaleDateString()
              : "—"}
          </p>
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea
          className="textarea min-h-[100px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Recruiter contact, referral, salary range, deadlines…"
        />
        {dirty ? (
          <div className="flex justify-end mt-2">
            <button onClick={saveNotes} disabled={saving} className="btn btn-primary">
              {saving ? <Spinner /> : "Save notes"}
            </button>
          </div>
        ) : null}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-text-muted hover:text-text">
          Job description
        </summary>
        <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-text-muted max-h-80 overflow-y-auto bg-bg rounded-lg p-3 border">
          {job.rawDescription}
        </pre>
      </details>
    </div>
  );
}
