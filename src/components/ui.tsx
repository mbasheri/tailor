"use client";

/** Spinner used inside buttons and loading states. */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block w-4 h-4 rounded-full border-2 border-current border-r-transparent animate-spin ${className}`}
      aria-hidden
    />
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
