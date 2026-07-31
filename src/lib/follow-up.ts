import { businessDaysBetween, FOLLOW_UP_BUSINESS_DAYS } from "@/lib/dates";
import type { JobDTO } from "@/lib/dto";

/**
 * A job needs a follow-up nudge when it's been sitting in "applied" with no
 * status change for more than 10 business days. Pure function — safe on both
 * server and client.
 */
export function needsFollowUp(job: JobDTO): boolean {
  if (job.status !== "applied") return false;
  const since = job.appliedDate
    ? new Date(job.appliedDate)
    : new Date(job.statusChangedAt);
  return businessDaysBetween(since, new Date()) >= FOLLOW_UP_BUSINESS_DAYS;
}

export function businessDaysSinceApplied(job: JobDTO): number | null {
  if (!job.appliedDate) return null;
  return businessDaysBetween(new Date(job.appliedDate), new Date());
}
