"use client";

import { useRef, useState } from "react";
import { api, jsonBody } from "@/lib/client";
import type { ResumeStructure } from "@/lib/schemas";
import { Spinner, ErrorBanner } from "@/components/ui";
import { ResumeStructureEditor } from "@/components/resume/ResumeStructureEditor";

interface TailorResponse {
  roleType: string;
  conventions: string[];
  changeNotes: string[];
  resume: ResumeStructure;
}

interface FetchJobResponse {
  ok: boolean;
  reason?: string;
  description?: string;
}

export function TailorApp() {
  const [resumeMode, setResumeMode] = useState<"upload" | "text">("upload");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jobMode, setJobMode] = useState<"text" | "url">("text");
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchNote, setFetchNote] = useState<{
    kind: "ok" | "warn";
    text: string;
  } | null>(null);

  const [tailoring, setTailoring] = useState(false);
  const [result, setResult] = useState<TailorResponse | null>(null);
  const [edited, setEdited] = useState<ResumeStructure | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

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
        setFetchNote({ kind: "ok", text: "Pulled the description — review it below." });
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

  async function tailor() {
    setTailoring(true);
    setError(null);
    try {
      const res = await api<TailorResponse>(
        "/api/tailor",
        jsonBody({ jobText, resumeText }),
      );
      setResult(res);
      setEdited(res.resume);
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
        body: JSON.stringify({ resume: edited }),
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
    <div className="space-y-8">
      <ErrorBanner message={error} />

      {/* Resume */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="label !mb-0">Your resume</label>
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
          <label className="flex flex-col items-center justify-center gap-1 border border-border-strong rounded-lg py-9 cursor-pointer hover:border-brown transition-colors">
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
              <span className="text-sm text-text-muted">
                {resumeFileName ?? "Click to upload a PDF"}
              </span>
            )}
          </label>
        ) : (
          <textarea
            className="textarea min-h-[200px] text-sm leading-relaxed"
            placeholder="Paste your full resume text here…"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
        )}
        {resumeMode === "upload" && resumeText ? (
          <p className="text-text-muted text-sm">
            Extracted {resumeText.length.toLocaleString()} characters — switch to
            “Paste text” to review.
          </p>
        ) : null}
      </section>

      {/* Job */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="label !mb-0">Job posting</label>
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
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="https://…"
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
        ) : (
          <textarea
            className="textarea min-h-[200px] text-sm leading-relaxed"
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

      {/* Action */}
      <div className="space-y-2">
        <button
          onClick={tailor}
          disabled={!canTailor || tailoring}
          className="btn btn-primary w-full"
        >
          {tailoring ? (
            <>
              <Spinner /> Tailoring…
            </>
          ) : (
            "Tailor my resume"
          )}
        </button>
        <p className="text-text-dim text-sm text-center">
          Your name, email, phone and links are removed before anything is sent
          to the AI.
        </p>
      </div>

      {/* Result */}
      {result && edited ? (
        <div ref={resultRef} className="space-y-6 pt-4 border-t border-border">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-brown">Tailored resume</h2>
              <p className="text-text-muted text-sm mt-0.5">
                Read as {result.roleType}. Section order and headings are kept
                from your original; edit anything, then export.
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

          {result.changeNotes.length ? (
            <details>
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

          <ResumeStructureEditor value={edited} onChange={setEdited} />

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
    <div className="inline-flex items-center gap-3 text-sm">
      {options.map(([val, label]) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={
            value === val
              ? "text-brown font-semibold"
              : "text-text-dim hover:text-text"
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}
