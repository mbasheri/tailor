"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, jsonBody } from "@/lib/client";
import type { ResumeDTO } from "@/lib/dto";
import { Spinner, ErrorBanner } from "@/components/ui";

interface FetchResult {
  ok: boolean;
  reason?: string;
  title?: string;
  company?: string;
  description?: string;
  host?: string;
}

export function NewJobForm({ resumes }: { resumes: ResumeDTO[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resumeVersionId, setResumeVersionId] = useState("");
  const [notes, setNotes] = useState("");

  const [fetching, setFetching] = useState(false);
  const [fetchNote, setFetchNote] = useState<{
    kind: "ok" | "warn";
    text: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function autoPull() {
    if (!url.trim()) return;
    setFetching(true);
    setFetchNote(null);
    setError(null);
    try {
      const res = await api<FetchResult>("/api/fetch-job", jsonBody({ url }));
      if (res.ok) {
        if (res.company && !company) setCompany(res.company);
        if (res.title && !title) setTitle(res.title);
        if (res.description) setDescription(res.description);
        setFetchNote({
          kind: "ok",
          text: "Pulled the description — review and edit before saving.",
        });
      } else {
        if (res.company && !company) setCompany(res.company);
        if (res.title && !title) setTitle(res.title);
        setFetchNote({
          kind: "warn",
          text: res.reason ?? "Couldn't auto-pull. Paste the description below.",
        });
      }
    } catch (err) {
      setFetchNote({
        kind: "warn",
        text: err instanceof Error ? err.message : "Fetch failed — paste manually.",
      });
    } finally {
      setFetching(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const job = await api<{ id: string }>(
        "/api/jobs",
        jsonBody({
          company,
          title,
          url: url || null,
          rawDescription: description,
          notes: notes || null,
          resumeVersionId: resumeVersionId || null,
        }),
      );
      router.push(`/jobs/${job.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save job");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Auto-pull */}
      <div className="card p-4 space-y-3">
        <label className="label">Auto-pull from a posting URL (optional)</label>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="https://boards.greenhouse.io/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="button"
            onClick={autoPull}
            disabled={fetching || !url.trim()}
            className="btn shrink-0"
          >
            {fetching ? <Spinner /> : "Fetch"}
          </button>
        </div>
        {fetchNote ? (
          <p
            className={`text-sm ${
              fetchNote.kind === "ok" ? "text-good" : "text-warn"
            }`}
          >
            {fetchNote.text}
          </p>
        ) : (
          <p className="text-text-dim text-xs">
            Best-effort. LinkedIn and login-walled sites won&apos;t work — just
            paste the text instead.
          </p>
        )}
      </div>

      <ErrorBanner message={error} />

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Company</label>
          <input
            className="input"
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">Job description</label>
        <textarea
          className="textarea min-h-[220px] font-mono text-xs leading-relaxed"
          required
          placeholder="Paste the full job description here…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Start from resume version (optional)</label>
          <select
            className="select"
            value={resumeVersionId}
            onChange={(e) => setResumeVersionId(e.target.value)}
          >
            <option value="">Decide later</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <input
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Referral, recruiter name, deadline…"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? <Spinner /> : "Save job"}
        </button>
      </div>
    </form>
  );
}
