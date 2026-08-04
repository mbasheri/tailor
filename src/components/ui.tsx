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

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="border border-black px-3 py-2 text-sm rounded-[3px]">
      {message}
    </div>
  );
}
