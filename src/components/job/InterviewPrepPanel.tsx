"use client";

import type { InterviewPrepDTO } from "@/lib/dto";
import type { JobStatusValue } from "@/lib/schemas";
import { Spinner, EmptyState } from "@/components/ui";

const CATEGORY_META: Record<
  InterviewPrepDTO["questions"][number]["category"],
  { label: string; className: string }
> = {
  behavioral: { label: "Behavioral", className: "text-accent border-accent/40" },
  technical: { label: "Technical", className: "text-warn border-warn/40" },
  "ask-them": {
    label: "Ask them",
    className: "text-good border-good/40",
  },
};

const ORDER: InterviewPrepDTO["questions"][number]["category"][] = [
  "behavioral",
  "technical",
  "ask-them",
];

export function InterviewPrepPanel({
  prep,
  jobStatus,
  generating,
  onGenerate,
}: {
  prep: InterviewPrepDTO | null;
  jobStatus: JobStatusValue;
  generating: boolean;
  onGenerate: () => void;
}) {
  if (!prep) {
    return (
      <EmptyState
        title="No interview prep yet"
        hint={
          jobStatus === "interviewing"
            ? "Generate 8-10 likely questions mapped to your real experience, plus questions to ask them."
            : "You can generate prep now, or it's most useful once you move this job to “Interviewing”."
        }
        action={
          <button onClick={onGenerate} disabled={generating} className="btn btn-primary">
            {generating ? <Spinner /> : "Generate interview prep"}
          </button>
        }
      />
    );
  }

  const grouped = ORDER.map((cat) => ({
    cat,
    items: prep.questions.filter((q) => q.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-text-dim text-xs">
          Generated {new Date(prep.updatedAt).toLocaleString()}
        </p>
        <button onClick={onGenerate} disabled={generating} className="btn !py-1.5 text-sm">
          {generating ? <Spinner /> : "Regenerate"}
        </button>
      </div>

      {grouped.map(({ cat, items }) => {
        const meta = CATEGORY_META[cat];
        return (
          <section key={cat} className="space-y-3">
            <h3 className="text-sm font-medium text-text-muted">{meta.label}</h3>
            <div className="space-y-2">
              {items.map((q, i) => (
                <div key={i} className="card p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <span
                      className={`chip !text-[11px] shrink-0 ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                    <p className="font-medium text-sm">{q.question}</p>
                  </div>
                  <p className="text-text-muted text-sm pl-1 border-l-2 border-border ml-1">
                    <span className="text-text-dim">Approach: </span>
                    {q.suggestedApproach}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
