"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { JobDTO } from "@/lib/dto";
import {
  JOB_STATUSES,
  STATUS_LABELS,
  type JobStatusValue,
} from "@/lib/schemas";
import { needsFollowUp, businessDaysSinceApplied } from "@/lib/follow-up";
import { api, putBody } from "@/lib/client";
import { StatusBadge, ErrorBanner } from "@/components/ui";
import { scoreColor } from "@/components/ui";

export function JobsTable({ jobs: initial }: { jobs: JobDTO[] }) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<JobStatusValue | "all">("all");

  const shown =
    filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  async function setStatus(id: string, status: JobStatusValue) {
    const prev = jobs;
    setJobs((p) => p.map((j) => (j.id === id ? { ...j, status } : j)));
    try {
      await api(`/api/jobs/${id}`, putBody({ status }));
      router.refresh();
    } catch (err) {
      setJobs(prev);
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`chip ${filter === "all" ? "!border-accent !text-accent" : ""}`}
        >
          All ({jobs.length})
        </button>
        {JOB_STATUSES.map((s) => {
          const n = jobs.filter((j) => j.status === s).length;
          if (n === 0) return null;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`chip ${filter === s ? "!border-accent !text-accent" : ""}`}
            >
              {STATUS_LABELS[s]} ({n})
            </button>
          );
        })}
      </div>

      <ErrorBanner message={error} />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-text-muted border-b">
              <th className="px-3 py-2.5 font-medium">Company / Role</th>
              <th className="px-3 py-2.5 font-medium">Score</th>
              <th className="px-3 py-2.5 font-medium">Resume</th>
              <th className="px-3 py-2.5 font-medium">Applied</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((job) => {
              const days = businessDaysSinceApplied(job);
              const flag = needsFollowUp(job);
              return (
                <tr
                  key={job.id}
                  className="border-b last:border-0 hover:bg-bg-elevated/50"
                >
                  <td className="px-3 py-2.5">
                    <Link href={`/jobs/${job.id}`} className="hover:text-accent">
                      <span className="font-medium">{job.company}</span>
                      <span className="block text-text-muted text-xs">
                        {job.title}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    {job.matchScore != null ? (
                      <span
                        className="font-semibold"
                        style={{ color: scoreColor(job.matchScore) }}
                      >
                        {job.matchScore}
                      </span>
                    ) : (
                      <span className="text-text-dim">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-text-muted">
                    {job.resumeVersionName ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">
                    {days != null ? (
                      <span className={flag ? "text-warn" : ""}>
                        {days}bd ago {flag ? "⏰" : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={job.status}
                      onChange={(e) =>
                        setStatus(job.id, e.target.value as JobStatusValue)
                      }
                      className="select !py-1 !px-1.5 !w-auto text-xs"
                      aria-label="Change status"
                    >
                      {JOB_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
