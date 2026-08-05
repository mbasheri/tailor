"use client";

import { useMemo, useRef, useState } from "react";
import { api, jsonBody } from "@/lib/client";
import type { DocxLine, ParsedDocxLine, ResumeJson } from "@/lib/schemas";
import { Spinner, ErrorBanner } from "@/components/ui";

interface DocxState {
  base64: string;
  fileName: string;
  lines: ParsedDocxLine[];
  warnings: string[];
}

interface Result {
  roleType: string;
  changeNotes: string[];
  lines: DocxLine[];
}

interface FetchJobResponse {
  ok: boolean;
  reason?: string;
  description?: string;
}

type ExportKind = "docx" | "json";

export function TailourApp() {
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

  const [tailouring, setTailouring] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setParsing(true);
    setError(null);
    setResult(null);
    setDocx(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/parse-resume", { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "couldn't read that file.");
      setDocx({
        base64: body.docxBase64,
        fileName: file.name,
        lines: body.lines,
        warnings: body.warnings ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "couldn't read that file.");
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
        setFetchNote({ kind: "ok", text: "pulled the description — review it below." });
      } else {
        setJobMode("text");
        setFetchNote({
          kind: "warn",
          text: (res.reason ?? "couldn't auto-pull. paste the description below.").toLowerCase(),
        });
      }
    } catch {
      setJobMode("text");
      setFetchNote({ kind: "warn", text: "fetch failed — paste the description below." });
    } finally {
      setFetching(false);
    }
  }

  async function tailour() {
    if (!docx) return;
    setTailouring(true);
    setError(null);
    try {
      const res = await api<Result>(
        "/api/tailour-docx",
        jsonBody({
          jobText,
          lines: docx.lines.map((l) => ({ id: l.id, text: l.text })),
        }),
      );
      setResult(res);
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "tailouring failed");
    } finally {
      setTailouring(false);
    }
  }

  function editLine(id: string, text: string) {
    setResult((r) =>
      r ? { ...r, lines: r.lines.map((l) => (l.id === id ? { ...l, text } : l)) } : r,
    );
  }

  function triggerDownload(blob: Blob, filename: string) {
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(href);
  }

  async function downloadBlob(kind: ExportKind) {
    if (!docx || !result) return;
    setExporting(kind);
    setError(null);
    setExportError(null);
    try {
      const payload = { docxBase64: docx.base64, edits: result.lines };
      if (kind === "json") {
        const data = await api<ResumeJson>("/api/structure-json", jsonBody(payload));
        triggerDownload(
          new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
          "resume-tailoured.json",
        );
      } else {
        const res = await fetch("/api/export-docx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          // read a json error message if there is one; otherwise surface the
          // status/body so failures are never silent.
          let msg = `docx export failed (${res.status})`;
          const raw = await res.text().catch(() => "");
          try {
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed?.error) msg = parsed.error;
          } catch {
            if (raw) msg = `${msg}: ${raw.slice(0, 200)}`;
          }
          throw new Error(msg);
        }
        const blob = await res.blob();
        if (blob.size === 0) {
          throw new Error("docx export came back empty — the server produced no file.");
        }
        triggerDownload(blob, "resume-tailoured.docx");
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : `${kind} export failed`);
    } finally {
      setExporting(null);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Group changed bullets by the position they belong to, in first-seen order.
  const groups = useMemo(() => {
    if (!docx || !result) return [];
    const orig = new Map(docx.lines.map((l) => [l.id, l] as const));
    const order: string[] = [];
    const byGroup = new Map<
      string,
      { id: string; original: string; text: string }[]
    >();
    for (const line of result.lines) {
      const src = orig.get(line.id);
      if (!src || src.text === line.text) continue; // omit unchanged
      const key = src.group || "other";
      if (!byGroup.has(key)) {
        byGroup.set(key, []);
        order.push(key);
      }
      byGroup.get(key)!.push({ id: line.id, original: src.text, text: line.text });
    }
    return order.map((name) => ({ name, items: byGroup.get(name)! }));
  }, [docx, result]);

  const changedCount = groups.reduce((n, g) => n + g.items.length, 0);
  const canTailour = !!docx && jobText.trim().length > 0;

  return (
    <div className="space-y-10">
      <ErrorBanner message={error} />

      {/* resume */}
      <section className="space-y-3">
        <p className="label">your resume</p>
        <label className="flex flex-col items-center justify-center gap-1 border border-hairline py-10 cursor-pointer hover:border-black transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          {parsing ? (
            <Spinner />
          ) : docx ? (
            <span className="text-sm">file uploaded</span>
          ) : (
            <span className="text-sm text-muted">upload a .docx</span>
          )}
        </label>
        {docx?.warnings.map((w, i) => (
          <p key={i} className="text-sm text-muted">
            {w}
          </p>
        ))}
      </section>

      {/* job */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="label">job posting</p>
          <Toggle
            value={jobMode}
            onChange={setJobMode}
            options={[
              ["text", "paste text"],
              ["url", "from url"],
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
              {fetching ? <Spinner /> : "fetch"}
            </button>
          </div>
        ) : (
          <textarea
            className="textarea min-h-[180px] text-sm leading-relaxed"
            placeholder="paste the full job description here…"
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
          />
        )}
        {fetchNote ? (
          <p className={`text-sm ${fetchNote.kind === "ok" ? "text-black" : "text-muted"}`}>
            {fetchNote.text}
          </p>
        ) : null}
      </section>

      {/* action */}
      <div className="space-y-2">
        <button
          onClick={tailour}
          disabled={!canTailour || tailouring}
          className="btn btn-primary w-full"
        >
          {tailouring ? (
            <>
              <Spinner /> tailouring…
            </>
          ) : (
            "tailour my resume"
          )}
        </button>
        <p className="text-xs text-muted text-center">
          your name, email, phone and links are never sent to the ai.
        </p>
      </div>

      {/* result */}
      {result ? (
        <div ref={resultRef} className="space-y-6 pt-8 border-t border-hairline">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-medium">your tailoured resume</h2>
              <p className="text-sm text-muted mt-0.5">
                {changedCount} {changedCount === 1 ? "line" : "lines"} reworded ·
                formatting kept exactly
              </p>
            </div>
            <button onClick={reset} className="btn btn-ghost text-sm">
              start over
            </button>
          </div>

          {/* grouped diff */}
          {groups.length === 0 ? (
            <p className="text-sm text-muted">
              no lines needed rewording for this posting.
            </p>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <div
                  key={group.name}
                  className="pt-6 border-t border-hairline first:pt-0 first:border-0"
                >
                  <h3 className="text-[0.95rem] font-medium">{group.name}</h3>
                  <div className="mt-3 space-y-3">
                    {group.items.map((item) => (
                      <div key={item.id}>
                        <p className="text-[13px] leading-snug text-muted line-through">
                          {item.original}
                        </p>
                        <textarea
                          className="diff-line"
                          value={item.text}
                          rows={1}
                          onChange={(e) => editLine(item.id, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* export — the docx is the output; json is a small extra */}
          <div className="pt-2 space-y-3">
            <button
              onClick={() => downloadBlob("docx")}
              disabled={!!exporting}
              className="btn btn-primary w-full"
            >
              {exporting === "docx" ? <Spinner /> : "download your resume (.docx)"}
            </button>
            <p className="text-xs text-muted text-center">
              your reworded resume, formatting kept exactly.{" "}
              <button
                onClick={() => downloadBlob("json")}
                disabled={!!exporting}
                className="underline hover:text-black disabled:no-underline"
              >
                {exporting === "json" ? "preparing…" : "or download json"}
              </button>
            </p>
            {exportError ? (
              <div className="border border-black px-3 py-2 text-sm rounded-[3px]">
                {exportError}
              </div>
            ) : null}
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
          className={value === val ? "font-medium" : "text-muted hover:text-black"}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
