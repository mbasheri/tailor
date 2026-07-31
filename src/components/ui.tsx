"use client";

import type { JobStatusValue } from "@/lib/schemas";
import { STATUS_LABELS } from "@/lib/schemas";

/** Spinner used inside buttons and loading states. */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block w-4 h-4 rounded-full border-2 border-current border-r-transparent animate-spin ${className}`}
      aria-hidden
    />
  );
}

const STATUS_STYLES: Record<JobStatusValue, string> = {
  saved: "bg-bg-elevated text-text-muted border-border-strong",
  tailoring: "bg-accent-soft text-accent border-accent/40",
  applied: "bg-accent-soft text-accent border-accent/40",
  interviewing: "bg-warn-soft text-warn border-warn/40",
  offer: "bg-good-soft text-good border-good/40",
  rejected: "bg-bad-soft text-bad border-bad/40",
  withdrawn: "bg-bg-elevated text-text-dim border-border",
};

export function StatusBadge({ status }: { status: JobStatusValue }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function scoreColor(score: number): string {
  if (score >= 80) return "var(--good)";
  if (score >= 60) return "var(--accent)";
  if (score >= 40) return "var(--warn)";
  return "var(--bad)";
}

/** Circular match-score gauge. */
export function ScoreRing({
  score,
  size = 56,
}: {
  score: number;
  size?: number;
}) {
  const stroke = size >= 48 ? 5 : 4;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - score / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill={color}
        fontSize={size * 0.3}
        fontWeight={700}
      >
        {score}
      </text>
    </svg>
  );
}

export function KeywordChip({
  label,
  kind,
}: {
  label: string;
  kind: "matched" | "missing";
}) {
  const style =
    kind === "matched"
      ? "bg-good-soft text-good border-good/40"
      : "bg-bad-soft text-bad border-bad/40";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border ${style}`}
    >
      {kind === "matched" ? "✓" : "＋"} {label}
    </span>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card p-10 text-center flex flex-col items-center gap-3">
      <p className="text-text font-medium">{title}</p>
      {hint ? <p className="text-text-muted text-sm max-w-md">{hint}</p> : null}
      {action}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-bad/40 bg-bad-soft px-3 py-2 text-sm text-bad">
      {message}
    </div>
  );
}
