"use client";

import { useRef, useState } from "react";
import { api, jsonBody } from "@/lib/client";
import type { ResumeStructure, DocxLine } from "@/lib/schemas";
import { Spinner, ErrorBanner } from "@/components/ui";
import { ResumeStructureEditor } from "@/components/resume/ResumeStructureEditor";

interface DocxState {
  base64: string;
  fileName: string;
  lines: DocxLine[];
  warnings: string[];
}

type Result =
  | {
      kind: "pdf";
      roleType: string;
      conventions: string[];
      changeNotes: string[];
      resume: ResumeStructure;
    }
  | {
      kind: "docx";
      roleType: string;
      conventions: string[];
      changeNotes: string[];
      lines: DocxLine[];
      warnings: string[];
    };

interface FetchJobResponse {
  ok: boolean;
  reason?: string;
  description?: string;
}

export function TailorApp() {
  const [resumeMode, setResumeMode] = useState<"upload" | "text">("upload");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [docx, setDocx] = useState<DocxState | null>(null);
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
  const [result, setResult] = useState<Result | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setParsing(true);
    setError(null);
    setResumeFileName(file.name);
    setDocx(null);
    setResumeText("");
    // Any prior tailored result belongs to the previous file — drop it so an
    // export can never mix a new upload with a stale result.
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/parse-resume", { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Couldn't read file (${res.status})`);

      if (body.kind === "docx") {
        setDocx({
          base64: body.docxBase64,
          fileName: body.fileName,
          lines: body.lines,
          warnings: body.warnings ?? [],
        });
      } else {
        setResumeText(body.text);
        setResumeMode("text");
      }
    } catch (err) {
      setResumeFileName(null);
      setError(err instanceof Error ? err.message : "Couldn't read that file");
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function switchToText() {
    setResumeMode("text");
    setDocx(null);
    setResumeFileName(null);
    setResult(null);
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
      if (docx) {
        const res = await api<{
          roleType: string;
          conventions: string[];
          changeNotes: string[];
          lines: DocxLine[];
        }>("/api/tailor-docx", jsonBody({ jobText, lines: docx.lines }));
        setResult({ kind: "docx", ...res, warnings: docx.warnings });
      } else {
        const res = await api<{
          roleType: string;
          conventions: string[];
          changeNotes: string[];
          resume: ResumeStructure;
        }>("/api/tailor", jsonBody({ jobText, resumeText }));
        setResult({ kind: "pdf", ...res });
      }
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tailoring failed");
    } finally {
      setTailoring(false);
    }
  }

  async function exportFile() {
    if (!result) return;
    setExporting(true);
    setError(null);
    try {
      const [url, payload] =
        result.kind === "docx"
          ? ["/api/export-docx", { docxBase64: docx!.base64, edits: result.lines }]
          : ["/api/export-pdf", { resume: result.resume }];
      const res = await fetch(url as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download =
        res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] ??
        (result.kind === "docx" ? "resume-tailored.docx" : "resume-tailored.pdf");
      a.click();
      URL.revokeObjectURL(href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const resumeReady = docx ? docx.lines.length > 0 : resumeText.trim().length > 0;
  const canTailor = jobText.trim().length > 0 && resumeReady;

  const exportLabel =
    result?.kind === "docx" ? "Export .docx" : "Export PDF";

  // Map each reworded docx line back to its original text so we can show a
  // before/after and count how many actually changed.
  const docxOriginals =
    result?.kind === "docx" && docx
      ? new Map(docx.lines.map((l) => [l.id, l.text] as const))
      : null;
  const docxChangedCount =
    result?.kind === "docx"
      ? result.lines.filter(
          (l) => (docxOriginals?.get(l.id) ?? l.text) !== l.text,
        ).length
      : 0;

  return (
    <div className="space-y-8">
      <ErrorBanner message={error} />

      {/* Resume */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="label !mb-0">Your resume</label>
          <div className="inline-flex items-center gap-3 text-sm">
            <button
              onClick={() => setResumeMode("upload")}
              className={
                resumeMode === "upload"
                  ? "text-brown font-semibold"
                  : "text-text-dim hover:text-text"
              }
            >
              Upload
            </button>
            <button
              onClick={switchToText}
              className={
                resumeMode === "text"
                  ? "text-brown font-semibold"
                  : "text-text-dim hover:text-text"
              }
            >
              Paste text
            </button>
          </div>
        </div>

        {resumeMode === "upload" ? (
          <>
            <label className="flex flex-col items-center justify-center gap-1 border border-border-strong rounded-lg py-9 cursor-pointer hover:border-brown transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              {parsing ? (
                <Spinner />
              ) : (
                <>
                  <span className="text-sm text-text-muted">
                    {resumeFileName ?? "Click to upload a PDF or .docx"}
                  </span>
                  {!resumeFileName ? (
                    <span className="text-xs text-text-dim">
                      .docx keeps your file&apos;s exact formatting; PDF uses a
                      clean template
                    </span>
                  ) : null}
                </>
              )}
            </label>
            {docx ? (
              <p className="text-good text-sm">
                Loaded {docx.fileName} — {docx.lines.length} lines will be
                reworded in place, keeping all formatting.
              </p>
            ) : null}
            {docx?.warnings.map((w, i) => (
              <p key={i} className="text-warn text-sm">
                {w}
              </p>
            ))}
            {resumeText ? (
              <p className="text-text-muted text-sm">
                Extracted {resumeText.length.toLocaleString()} characters from a
                PDF — switch to “Paste text” to review.
              </p>
            ) : null}
          </>
        ) : (
          <textarea
            className="textarea min-h-[200px] text-sm leading-relaxed"
            placeholder="Paste your full resume text here…"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
        )}
      </section>

      {/* Job */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="label !mb-0">Job posting</label>
          <div className="inline-flex items-center gap-3 text-sm">
            <button
              onClick={() => setJobMode("text")}
              className={
                jobMode === "text"
                  ? "text-brown font-semibold"
                  : "text-text-dim hover:text-text"
              }
            >
              Paste text
            </button>
            <button
              onClick={() => setJobMode("url")}
              className={
                jobMode === "url"
                  ? "text-brown font-semibold"
                  : "text-text-dim hover:text-text"
              }
            >
              From URL
            </button>
          </div>
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
      {result ? (
        <div ref={resultRef} className="space-y-6 pt-4 border-t border-border">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-brown">Tailored resume</h2>
              <p className="text-text-muted text-sm mt-0.5">
                Read as {result.roleType}.{" "}
                {result.kind === "docx"
                  ? "Reworded in place inside your .docx — formatting untouched."
                  : "Your section order and headings are kept; edit anything, then export."}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="btn">
                Start over
              </button>
              <button
                onClick={exportFile}
                disabled={exporting}
                className="btn btn-primary"
              >
                {exporting ? <Spinner /> : exportLabel}
              </button>
            </div>
          </div>

          {result.kind === "docx" &&
            result.warnings.map((w, i) => (
              <p key={i} className="text-warn text-sm">
                {w}
              </p>
            ))}

          {result.kind === "docx" ? (
            <p className="text-sm text-text-muted">
              <span className="text-brown font-semibold">
                {docxChangedCount}
              </span>{" "}
              of {result.lines.length} lines reworded.
            </p>
          ) : null}

          {result.changeNotes.length ? (
            <details>
              <summary className="label cursor-pointer">
                {result.kind === "docx"
                  ? "Summary of key changes"
                  : `What changed (${result.changeNotes.length})`}
              </summary>
              <ul className="mt-2 space-y-1 text-sm text-text-muted list-disc pl-5">
                {result.changeNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </details>
          ) : null}

          {result.kind === "docx" ? (
            <div className="space-y-4">
              <p className="label !mb-0">
                Reworded lines — original shown struck through
              </p>
              {result.lines.map((line, i) => {
                const original = docxOriginals?.get(line.id) ?? "";
                const changed = original !== line.text;
                return (
                  <div key={line.id} className="space-y-1">
                    {changed && original ? (
                      <p className="text-xs text-text-dim line-through">
                        {original}
                      </p>
                    ) : (
                      <p className="text-xs text-text-dim">
                        unchanged from original
                      </p>
                    )}
                    <textarea
                      className={`textarea min-h-[48px] text-sm ${
                        changed ? "" : "opacity-60"
                      }`}
                      value={line.text}
                      onChange={(e) => {
                        const lines = result.lines.map((l, j) =>
                          j === i ? { ...l, text: e.target.value } : l,
                        );
                        setResult({ ...result, lines });
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <ResumeStructureEditor
              value={result.resume}
              onChange={(resume) => setResult({ ...result, resume })}
            />
          )}

          <div className="flex justify-end gap-2">
            <button onClick={reset} className="btn">
              Start over
            </button>
            <button
              onClick={exportFile}
              disabled={exporting}
              className="btn btn-primary"
            >
              {exporting ? <Spinner /> : exportLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
