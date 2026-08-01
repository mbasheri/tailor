import { TailorApp } from "@/components/TailorApp";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="pt-6 pb-2 text-center max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-1.5 chip !bg-white/70 !border-white/60 backdrop-blur mb-5">
          ✨ Free · nothing saved
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05] text-text">
          Tailor your resume
          <br className="hidden sm:block" /> to any job in seconds
        </h1>
        <p className="text-text-muted text-base sm:text-lg mt-4 max-w-2xl mx-auto">
          Paste a posting and your resume. Lyze reads the role, applies the
          resume conventions for that kind of job, and rewrites yours to match —
          using only what&apos;s already in it. Review, edit, export a PDF.
        </p>
      </div>
      <TailorApp />
    </div>
  );
}
