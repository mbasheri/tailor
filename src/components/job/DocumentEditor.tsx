"use client";

import { useState } from "react";
import { api, putBody } from "@/lib/client";
import type { DocumentDTO } from "@/lib/dto";
import type { CoverLetterContent, ResumeContent } from "@/lib/schemas";
import { Spinner, ErrorBanner } from "@/components/ui";
import { ResumeContentEditor } from "@/components/resume/ResumeContentEditor";

/**
 * Full-screen modal for editing a tailored document before export. Validates on
 * the server (the PUT route re-parses against the type's schema) and clears the
 * stored PDF so a re-export reflects the edits.
 */
export function DocumentEditor({
  doc,
  onClose,
  onSaved,
  onError,
}: {
  doc: DocumentDTO;
  onClose: () => void;
  onSaved: (updated: DocumentDTO) => void;
  onError: (m: string) => void;
}) {
  const [content, setContent] = useState(doc.content);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setLocalError(null);
    try {
      const updated = await api<DocumentDTO>(
        `/api/documents/${doc.id}`,
        putBody({ content }),
      );
      onSaved(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setLocalError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4">
      <div className="card w-full max-w-3xl my-6">
        <div className="sticky top-0 bg-bg-raised border-b px-5 py-3 flex items-center justify-between rounded-t-[12px] z-10">
          <h2 className="font-semibold">
            Edit {doc.type === "resume" ? "tailored resume" : "cover letter"}
            {doc.label ? (
              <span className="text-text-muted font-normal"> · {doc.label}</span>
            ) : null}
          </h2>
          <button onClick={onClose} className="btn btn-ghost !py-1">
            Close
          </button>
        </div>

        <div className="p-5 space-y-4">
          <ErrorBanner message={localError} />
          {doc.type === "resume" ? (
            <ResumeContentEditor
              value={content as ResumeContent}
              onChange={(next) => setContent(next)}
            />
          ) : (
            <CoverLetterEditor
              value={content as CoverLetterContent}
              onChange={(next) => setContent(next)}
            />
          )}
        </div>

        <div className="sticky bottom-0 bg-bg-raised border-t px-5 py-3 flex justify-end gap-2 rounded-b-[12px]">
          <button onClick={onClose} className="btn">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="btn btn-primary">
            {saving ? <Spinner /> : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CoverLetterEditor({
  value,
  onChange,
}: {
  value: CoverLetterContent;
  onChange: (next: CoverLetterContent) => void;
}) {
  const set = (patch: Partial<CoverLetterContent>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Greeting</label>
        <input
          className="input"
          value={value.greeting}
          onChange={(e) => set({ greeting: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="label !mb-0">Body paragraphs</label>
          <button
            type="button"
            onClick={() => set({ paragraphs: [...value.paragraphs, ""] })}
            className="text-xs text-accent hover:underline"
          >
            + paragraph
          </button>
        </div>
        {value.paragraphs.map((p, i) => (
          <div key={i} className="flex gap-1.5 items-start">
            <textarea
              className="textarea min-h-[90px] text-sm"
              value={p}
              onChange={(e) =>
                set({
                  paragraphs: value.paragraphs.map((x, j) =>
                    j === i ? e.target.value : x,
                  ),
                })
              }
            />
            <button
              type="button"
              onClick={() =>
                set({
                  paragraphs: value.paragraphs.filter((_, j) => j !== i),
                })
              }
              className="text-text-dim hover:text-bad px-1 pt-2 shrink-0"
              aria-label="Remove paragraph"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div>
        <label className="label">Closing</label>
        <input
          className="input"
          value={value.closing}
          onChange={(e) => set({ closing: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Signature</label>
        <input
          className="input"
          value={value.signature}
          onChange={(e) => set({ signature: e.target.value })}
        />
      </div>
    </div>
  );
}
