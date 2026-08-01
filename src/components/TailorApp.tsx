"use client";

import { useRef, useState } from "react";
import { api, jsonBody } from "@/lib/client";
import type { ResumeContent } from "@/lib/schemas";
import { Spinner, ErrorBanner } from "@/components/ui";
import { ResumeContentEditor } from "@/components/resume/ResumeContentEditor";

interface TailorResponse {
  roleType: string;
  conventions: string[];
  changeNotes: string[];
  content: ResumeContent;
}

interface FetchJobResponse {
  ok: boolean;
  reason?: string;
  title?: string;
  company?: string;
  description?: string;
}

export function TailorApp() {
  // Job input
  const [jobMode, setJobMode] = useState<"url" | "text">("text");
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchNote, setFetchNote] = useState<{ kind: "ok" | "warn"; text: string } | null>(
    null,
  );

  // Resume input
  const [resumeMode, setResumeMode] = useState<"upload" | "text">("upload");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Result
  const [tailoring, setTailoring] = useState(false);
  const [result, setResult] = useState<TailorResponse | null>(null);
  const [edited, setEdited] = useState<ResumeContent | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function fetchJob() {
    if (!jobUrl.trim()) return;
    setFetching(true);
    setFetchNote(null);
    setError(null);
    try {
      const res = await api<FetchJobResponse>("/api/fetch-job", jsonBody({ url: jobUrl }));
      if (res.ok && res.description) {
        setJobText(res.description);
        setJobMode("text");
        setFetchNote({
          kind: "ok",
          text: "Pulled the description — review it below before tailoring.",
        });
      } else {
        setJobMode("text");
        setFetchNote({
          kind: "warn",
          text: res.reason ?? "Couldn't auto-pull. Paste the description below.",
        });
      }
    } catch (err) {
      setJobMode("text");
      setFetchNote({
        kind: "warn",
        text: err instanceof Error ? err.message : "Fetch failed — paste manually.",
      });
    } finally {
      setFetching(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setParsing(true);
    setError(null);
    setResumeFileName(file.name);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/parse-resume", { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Couldn't read PDF (${res.status})`);
      setResumeText(body.text);
      setResumeMode("text");
    } catch (err) {
      setResumeFileName(null);
      setError(err instanceof Error ? err.message : "Couldn't read that PDF");
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function tailor() {
    setTailoring(true);
    setError(null);
    try {
      const res = await api<TailorResponse>(
        "/api/tailor",
        jsonBody({ jobText, resumeText }),
      );
      setResult(res);
      setEdited(res.content);
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tailoring failed");
    } finally {
      setTailoring(false);
    }
  }

  async function exportPdf() {
    if (!edited) return;
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: edited }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] ??
        "resume-tailored.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  function reset() {
    setResult(null);
    setEdited(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const canTailor = jobText.trim().length > 0 && resumeText.trim().length > 0;

  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />

      {/* Inputs */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Job */}
        <section className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">1 · Job posting</h2>
            <Toggle
              value={jobMode}
              onChange={setJobMode}
              options={[
                ["text", "Paste text"],
                ["url", "From URL"],
              ]}
            />
          </div>

          {jobMode === "url" ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder="https://boards.greenhouse.io/…"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                />
                <button
                  onClick={fetchJob}
                  disabled={fetching || !jobUrl.trim()}
                  className="btn shrink-0"
                >
                  {fetching ? <Spinner /> : "Fetch"}
                </button>
              </div>
              <p className="text-text-dim text-xs">
                Best-effort. LinkedIn and login-walled sites won&apos;t work —
                paste the text instead.
              </p>
            </div>
          ) : (
            <textarea
              className="textarea min-h-[220px] font-mono text-xs leading-relaxed"
              placeholder="Paste the full job description here…"
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
            />
          )}

          {fetchNote ? (
            <p className={`text-sm ${fetchNote.kind === "ok" ? "text-good" : "text-warn"}`}>
              {fetchNote.text}
            </p>
          ) : null}
        </section>

        {/* Resume */}
        <section className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">2 · Your resume</h2>
            <Toggle
              value={resumeMode}
              onChange={setResumeMode}
              options={[
                ["upload", "Upload PDF"],
                ["text", "Paste text"],
              ]}
            />
          </div>

          {resumeMode === "upload" ? (
            <div className="space-y-2">
              <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-border-strong rounded-lg py-8 cursor-pointer hover:border-accent transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
                {parsing ? (
                  <Spinner />
                ) : (
                  <>
                    <span className="text-sm text-text-muted">
                      {resumeFileName ?? "Click to upload a PDF"}
                    </span>
                    <span className="text-text-dim text-xs">
                      Text is extracted locally; contact details are stripped
                      before anything is sent to the AI.
                    </span>
                  </>
                )}
              </label>
              {resumeText ? (
                <p className="text-good text-sm">
                  ✓ Extracted {resumeText.length.toLocaleString()} characters —
                  switch to “Paste text” to review or edit.
                </p>
              ) : null}
            </div>
          ) : (
            <textarea
              className="textarea min-h-[220px] font-mono text-xs leading-relaxed"
              placeholder="Paste your full resume text here…"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          )}
        </section>
      </div>

      {/* Tailor action */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={tailor}
          disabled={!canTailor || tailoring}
          className="btn btn-primary"
        >
          {tailoring ? (
            <>
              <Spinner /> Tailoring…
            </>
          ) : (
            "Tailor my resume"
          )}
        </button>
        {!canTailor ? (
          <span className="text-text-muted text-sm">
            Add both a job posting and your resume to continue.
          </span>
        ) : null}
        <span className="text-text-muted text-xs ml-auto inline-flex items-center gap-1">
          🔒 Name, email, phone &amp; profile links are never sent to the model.
        </span>
      </div>

      {/* Result */}
      {result && edited ? (
        <div ref={resultRef} className="space-y-5 pt-2">
          <div className="card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-semibold text-lg">Tailored resume</h2>
                <p className="text-text-muted text-sm mt-0.5">
                  Read as{" "}
                  <span className="text-accent">{result.roleType}</span>. Review
                  and edit anything below, then export.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={reset} className="btn">
                  Start over
                </button>
                <button
                  onClick={exportPdf}
                  disabled={exporting}
                  className="btn btn-primary"
                >
                  {exporting ? <Spinner /> : "Export PDF"}
                </button>
              </div>
            </div>

            {result.conventions.length ? (
              <div>
                <p className="label">Conventions applied for this role</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.conventions.map((c, i) => (
                    <span key={i} className="chip">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {result.changeNotes.length ? (
              <details open>
                <summary className="label cursor-pointer">
                  What changed ({result.changeNotes.length})
                </summary>
                <ul className="mt-2 space-y-1 text-sm text-text-muted list-disc pl-5">
                  {result.changeNotes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>

          <div className="card p-5">
            <ResumeContentEditor value={edited} onChange={setEdited} />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={reset} className="btn">
              Start over
            </button>
            <button
              onClick={exportPdf}
              disabled={exporting}
              className="btn btn-primary"
            >
              {exporting ? <Spinner /> : "Export PDF"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Toggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="inline-flex rounded-lg border border-border-strong overflow-hidden text-xs">
      {options.map(([val, label]) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={`px-2.5 py-1 transition-colors ${
            value === val
              ? "bg-accent text-white font-medium"
              : "text-text-muted hover:text-text"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
