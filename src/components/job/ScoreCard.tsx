"use client";

import type { JobDTO } from "@/lib/dto";
import { ScoreRing, KeywordChip } from "@/components/ui";

export function ScoreCard({ job }: { job: JobDTO }) {
  if (job.matchScore == null || !job.scoreDetail) {
    return (
      <div className="card p-5 text-sm text-text-muted">
        No match score yet. Pick a resume version above and hit{" "}
        <span className="text-text">Score match</span> to see how it stacks up
        against this posting.
      </div>
    );
  }

  const d = job.scoreDetail;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start gap-4">
        <ScoreRing score={job.matchScore} size={72} />
        <div className="min-w-0">
          <h2 className="font-semibold">Match score</h2>
          <p className="text-text-muted text-sm mt-1">{d.summary}</p>
          <p className="text-text-dim text-xs mt-2">
            Scored {new Date(d.scoredAt).toLocaleString()}
            {job.resumeVersionName ? ` · ${job.resumeVersionName}` : ""}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="label text-good">
            Matched ({d.matchedKeywords.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {d.matchedKeywords.length ? (
              d.matchedKeywords.map((k) => (
                <KeywordChip key={k} label={k} kind="matched" />
              ))
            ) : (
              <span className="text-text-dim text-sm">None</span>
            )}
          </div>
        </div>
        <div>
          <p className="label text-bad">
            Missing ({d.missingKeywords.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {d.missingKeywords.length ? (
              d.missingKeywords.map((k) => (
                <KeywordChip key={k} label={k} kind="missing" />
              ))
            ) : (
              <span className="text-text-dim text-sm">Nothing obvious</span>
            )}
          </div>
        </div>
      </div>

      {d.parsedRequirements?.seniority ? (
        <p className="text-xs text-text-dim">
          Posting seniority read as:{" "}
          <span className="text-text-muted">{d.parsedRequirements.seniority}</span>
        </p>
      ) : null}
    </div>
  );
}
