"use client";

import Link from "next/link";
import type { JobDTO } from "@/lib/dto";
import { needsFollowUp, businessDaysSinceApplied } from "@/lib/follow-up";
import { ScoreRing } from "@/components/ui";

export function JobCard({
  job,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  job: JobDTO;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const days = businessDaysSinceApplied(job);
  const flag = needsFollowUp(job);

  return (
    <Link
      href={`/jobs/${job.id}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`block rounded-lg border bg-bg-elevated px-3 py-2.5 hover:border-accent transition-colors cursor-grab active:cursor-grabbing ${
        dragging ? "opacity-40" : ""
      } ${flag ? "border-warn/50" : "border-border"}`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{job.company}</p>
          <p className="text-text-muted text-xs truncate">{job.title}</p>
        </div>
        {job.matchScore != null ? (
          <ScoreRing score={job.matchScore} size={38} />
        ) : null}
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {job.resumeVersionName ? (
          <span className="chip !text-[11px]">{job.resumeVersionName}</span>
        ) : null}
        {days != null ? (
          <span className="chip !text-[11px]">{days}bd since applied</span>
        ) : null}
        {job.documentCount > 0 ? (
          <span className="chip !text-[11px]">📄 {job.documentCount}</span>
        ) : null}
        {flag ? (
          <span className="chip !text-[11px] !text-warn !border-warn/40">
            follow up
          </span>
        ) : null}
      </div>
    </Link>
  );
}
