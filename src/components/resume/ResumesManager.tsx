"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, jsonBody, putBody } from "@/lib/client";
import type { ResumeDTO } from "@/lib/dto";
import { emptyResumeContent, type ResumeContent } from "@/lib/schemas";
import { Spinner, ErrorBanner, EmptyState } from "@/components/ui";
import { ResumeContentEditor } from "@/components/resume/ResumeContentEditor";

type Draft = { id: string | null; name: string; baseContent: ResumeContent };

export function ResumesManager({ initial }: { initial: ResumeDTO[] }) {
  const router = useRouter();
  const [resumes, setResumes] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startNew() {
    setDraft({
      id: null,
      name: "",
      baseContent: structuredClone(emptyResumeContent),
    });
  }

  function edit(r: ResumeDTO) {
    setDraft({ id: r.id, name: r.name, baseContent: structuredClone(r.baseContent) });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { name: draft.name, baseContent: draft.baseContent };
      if (draft.id) {
        const updated = await api<ResumeDTO>(
          `/api/resumes/${draft.id}`,
          putBody(payload),
        );
        setResumes((rs) =>
          rs.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
        );
      } else {
        const created = await api<ResumeDTO>("/api/resumes", jsonBody(payload));
        setResumes((rs) => [created, ...rs]);
      }
      setDraft(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: ResumeDTO) {
    if (!confirm(`Delete "${r.name}"? Jobs using it keep their history.`)) return;
    try {
      await api(`/api/resumes/${r.id}`, { method: "DELETE" });
      setResumes((rs) => rs.filter((x) => x.id !== r.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (draft) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={error} />
        <div className="card p-5 space-y-4">
          <div>
            <label className="label">Version name</label>
            <input
              className="input max-w-sm"
              placeholder="e.g. FP&A / Finance"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <ResumeContentEditor
            value={draft.baseContent}
            onChange={(baseContent) => setDraft({ ...draft, baseContent })}
          />
        </div>
        <div className="flex justify-end gap-2 sticky bottom-4">
          <button onClick={() => setDraft(null)} className="btn">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !draft.name.trim()}
            className="btn btn-primary"
          >
            {saving ? <Spinner /> : draft.id ? "Save changes" : "Create resume"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} />
      <div className="flex justify-end">
        <button onClick={startNew} className="btn btn-primary">
          + New resume version
        </button>
      </div>

      {resumes.length === 0 ? (
        <EmptyState
          title="No resume versions yet"
          hint="Create a base resume for each role type you target — FP&A, Product, Data, etc."
          action={
            <button onClick={startNew} className="btn btn-primary">
              + Create your first
            </button>
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {resumes.map((r) => (
            <div key={r.id} className="card p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-text-dim text-xs">
                    {r.baseContent.experience.length} roles ·{" "}
                    {r.baseContent.skills.reduce(
                      (n, s) => n + s.items.length,
                      0,
                    )}{" "}
                    skills · updated {new Date(r.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className="text-text-muted text-sm line-clamp-2">
                {r.baseContent.summary ||
                  r.baseContent.experience[0]?.bullets[0] ||
                  "No summary"}
              </p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => edit(r)} className="btn !py-1.5 text-sm">
                  Edit
                </button>
                <button
                  onClick={() => remove(r)}
                  className="btn btn-danger btn-ghost !py-1.5 text-sm ml-auto"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
