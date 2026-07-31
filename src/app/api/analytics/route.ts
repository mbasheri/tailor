import { prisma, CURRENT_USER_ID } from "@/lib/prisma";
import { ok, route } from "@/lib/api";
import { businessDaysBetween } from "@/lib/dates";
import type { JobStatusValue } from "@/lib/schemas";

/**
 * All figures are computed live from persisted Job/TailoredDocument history —
 * never from any client cache.
 */
export async function GET() {
  return route(async () => {
    const jobs = await prisma.job.findMany({
      where: { userId: CURRENT_USER_ID },
      include: { resumeVersion: { select: { id: true, name: true } } },
    });

    const isApplied = (s: JobStatusValue) =>
      s === "applied" ||
      s === "interviewing" ||
      s === "offer" ||
      s === "rejected";
    const reachedInterview = (s: JobStatusValue) =>
      s === "interviewing" || s === "offer";

    const applied = jobs.filter((j) => isApplied(j.status as JobStatusValue));
    const interviewing = jobs.filter((j) =>
      reachedInterview(j.status as JobStatusValue),
    );
    const offers = jobs.filter((j) => j.status === "offer");
    // A "response" = moved past applied (interview, offer, or an explicit reject).
    const responded = jobs.filter(
      (j) =>
        j.status === "interviewing" ||
        j.status === "offer" ||
        j.status === "rejected",
    );

    const appliedCount = applied.length;
    const responseRate = appliedCount
      ? Math.round((responded.length / appliedCount) * 100)
      : 0;
    const interviewRate = appliedCount
      ? Math.round((interviewing.length / appliedCount) * 100)
      : 0;
    const offerRate = appliedCount
      ? Math.round((offers.length / appliedCount) * 100)
      : 0;

    // Average business days from applied -> first response (status change).
    const responseGaps = responded
      .filter((j) => j.appliedDate)
      .map((j) =>
        businessDaysBetween(new Date(j.appliedDate as Date), j.statusChangedAt),
      );
    const avgDaysToResponse = responseGaps.length
      ? Math.round(
          (responseGaps.reduce((a, b) => a + b, 0) / responseGaps.length) * 10,
        ) / 10
      : null;

    // Applications over time (by applied month).
    const byMonth = new Map<string, number>();
    for (const j of applied) {
      if (!j.appliedDate) continue;
      const d = new Date(j.appliedDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }
    const applicationsOverTime = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));

    // Funnel.
    const funnel = [
      { stage: "Applied", count: appliedCount },
      { stage: "Interviewing", count: interviewing.length },
      { stage: "Offer", count: offers.length },
    ];

    // Per resume version.
    const byResume = new Map<
      string,
      { name: string; applied: number; interviews: number; offers: number }
    >();
    for (const j of applied) {
      const key = j.resumeVersion?.id ?? "none";
      const name = j.resumeVersion?.name ?? "No version";
      const row =
        byResume.get(key) ??
        { name, applied: 0, interviews: 0, offers: 0 };
      row.applied += 1;
      if (reachedInterview(j.status as JobStatusValue)) row.interviews += 1;
      if (j.status === "offer") row.offers += 1;
      byResume.set(key, row);
    }
    const byResumeVersion = [...byResume.values()].map((r) => ({
      ...r,
      interviewRate: r.applied
        ? Math.round((r.interviews / r.applied) * 100)
        : 0,
    }));

    // Status distribution across every job (incl. saved/tailoring/withdrawn).
    const statusCounts = jobs.reduce<Record<string, number>>((acc, j) => {
      acc[j.status] = (acc[j.status] ?? 0) + 1;
      return acc;
    }, {});

    const documentCount = await prisma.tailoredDocument.count({
      where: { job: { userId: CURRENT_USER_ID } },
    });

    return ok({
      totals: {
        totalJobs: jobs.length,
        applications: appliedCount,
        interviews: interviewing.length,
        offers: offers.length,
        documents: documentCount,
      },
      rates: { responseRate, interviewRate, offerRate, avgDaysToResponse },
      applicationsOverTime,
      funnel,
      byResumeVersion,
      statusCounts,
    });
  });
}
