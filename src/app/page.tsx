import { TailorApp } from "@/components/TailorApp";

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Tailor your resume to a job
        </h1>
        <p className="text-text-muted text-sm mt-1 max-w-2xl">
          Paste a posting and your resume. Runway reads the role, applies the
          resume conventions for that kind of job, and rewrites yours to match —
          using only what&apos;s already in it. Review, edit, export a PDF.
          Nothing is saved; each visit is a fresh session.
        </p>
      </div>
      <TailorApp />
    </div>
  );
}
