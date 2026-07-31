"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, putBody } from "@/lib/client";
import { BOARD_COLUMNS, type JobStatusValue } from "@/lib/schemas";
import type { JobDTO } from "@/lib/dto";
import { needsFollowUp } from "@/lib/follow-up";
import { ErrorBanner } from "@/components/ui";
import { JobCard } from "@/components/board/JobCard";

export function Board({ initialJobs }: { initialJobs: JobDTO[] }) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<JobStatusValue | null>(null);
  const [error, setError] = useState<string | null>(null);

  const followUps = jobs.filter(needsFollowUp).length;

  async function moveJob(jobId: string, status: JobStatusValue) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.status === status) return;

    const previous = jobs;
    // Optimistic update.
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, status, statusChangedAt: new Date().toISOString() }
          : j,
      ),
    );
    try {
      await api(`/api/jobs/${jobId}`, putBody({ status }));
      router.refresh();
    } catch (err) {
      setJobs(previous); // rollback
      setError(err instanceof Error ? err.message : "Failed to move job");
    }
  }

  return (
    <div className="space-y-4">
      {followUps > 0 ? (
        <div className="rounded-lg border border-warn/40 bg-warn-soft px-3 py-2 text-sm text-warn">
          ⏰ {followUps} applied {followUps === 1 ? "job has" : "jobs have"} had
          no update in 10+ business days — time to follow up.
        </div>
      ) : null}

      <ErrorBanner message={error} />

      <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-3 overflow-x-auto pb-3">
        {BOARD_COLUMNS.map((col) => {
          const colJobs = jobs.filter((j) => j.status === col.status);
          return (
            <div
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.status);
              }}
              onDragLeave={() => setOverCol((c) => (c === col.status ? null : c))}
              onDrop={() => {
                if (dragId) moveJob(dragId, col.status);
                setDragId(null);
                setOverCol(null);
              }}
              className={`card p-2.5 flex flex-col gap-2 min-h-[140px] transition-colors ${
                overCol === col.status ? "border-accent bg-bg-elevated" : ""
              }`}
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium">{col.label}</span>
                <span className="chip !px-1.5 !py-0 text-xs">
                  {colJobs.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {colJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    dragging={dragId === job.id}
                    onDragStart={() => setDragId(job.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                  />
                ))}
                {colJobs.length === 0 ? (
                  <p className="text-text-dim text-xs px-1 py-3 text-center">
                    Drop here
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
