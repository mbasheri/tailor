"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { api } from "@/lib/client";
import type { DocumentDTO } from "@/lib/dto";
import type { CoverLetterContent, ResumeContent } from "@/lib/schemas";
import { Spinner, EmptyState } from "@/components/ui";
import { DocumentEditor } from "@/components/job/DocumentEditor";

export function DocumentsPanel({
  documents,
  setDocuments,
  onError,
  onChanged,
}: {
  documents: DocumentDTO[];
  setDocuments: Dispatch<SetStateAction<DocumentDTO[]>>;
  onError: (m: string) => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<DocumentDTO | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const resumes = documents.filter((d) => d.type === "resume");
  const letters = documents.filter((d) => d.type === "coverLetter");

  async function exportPdf(doc: DocumentDTO) {
    setBusyId(doc.id);
    onError("");
    try {
      const res = await fetch(`/api/documents/${doc.id}/pdf`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Export failed (${res.status})`);
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const { pdfBlobUrl } = await res.json();
        setDocuments((d) =>
          d.map((x) => (x.id === doc.id ? { ...x, pdfBlobUrl } : x)),
        );
        if (pdfBlobUrl) window.open(pdfBlobUrl, "_blank");
      } else {
        // No Blob token: browser download of the returned bytes.
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          res.headers
            .get("content-disposition")
            ?.match(/filename="(.+)"/)?.[1] ?? "document.pdf";
        a.click();
        URL.revokeObjectURL(url);
      }
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(doc: DocumentDTO) {
    if (!confirm("Delete this document? This can't be undone.")) return;
    setBusyId(doc.id);
    try {
      await api(`/api/documents/${doc.id}`, { method: "DELETE" });
      setDocuments((d) => d.filter((x) => x.id !== doc.id));
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  function card(doc: DocumentDTO) {
    return (
      <div key={doc.id} className="card p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm">
              {doc.type === "resume" ? "Tailored resume" : "Cover letter"}
              {doc.label ? (
                <span className="text-text-muted font-normal">
                  {" "}
                  · {doc.label}
                </span>
              ) : null}
            </p>
            <p className="text-text-dim text-xs">
              {new Date(doc.createdAt).toLocaleString()}
            </p>
          </div>
          {doc.pdfBlobUrl ? (
            <a
              href={doc.pdfBlobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="chip !text-accent !border-accent/40"
            >
              PDF saved ↗
            </a>
          ) : null}
        </div>

        <DocPreview doc={doc} />

        <div className="flex gap-2 flex-wrap pt-1">
          <button
            className="btn !py-1.5 text-sm"
            onClick={() => setEditing(doc)}
            disabled={busyId === doc.id}
          >
            Edit
          </button>
          <button
            className="btn !py-1.5 text-sm"
            onClick={() => exportPdf(doc)}
            disabled={busyId === doc.id}
          >
            {busyId === doc.id ? <Spinner /> : "Export PDF"}
          </button>
          <button
            className="btn btn-danger btn-ghost !py-1.5 text-sm ml-auto"
            onClick={() => remove(doc)}
            disabled={busyId === doc.id}
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        title="No documents yet"
        hint="Use “Tailor resume” or “Cover letters” above to generate documents from your selected resume version. Nothing is ever sent anywhere — you review and export."
      />
    );
  }

  return (
    <div className="space-y-5">
      {resumes.length ? (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-text-muted">
            Tailored resumes
          </h3>
          <div className="grid md:grid-cols-2 gap-3">{resumes.map(card)}</div>
        </section>
      ) : null}

      {letters.length ? (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-text-muted">Cover letters</h3>
          <div className="grid md:grid-cols-2 gap-3">{letters.map(card)}</div>
        </section>
      ) : null}

      {editing ? (
        <DocumentEditor
          doc={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setDocuments((d) =>
              d.map((x) => (x.id === updated.id ? updated : x)),
            );
            setEditing(null);
            onChanged();
          }}
          onError={onError}
        />
      ) : null}
    </div>
  );
}

function DocPreview({ doc }: { doc: DocumentDTO }) {
  if (doc.type === "coverLetter") {
    const c = doc.content as CoverLetterContent;
    return (
      <p className="text-text-muted text-xs line-clamp-3">
        {c.paragraphs[0] ?? c.greeting}
      </p>
    );
  }
  const r = doc.content as ResumeContent;
  return (
    <p className="text-text-muted text-xs line-clamp-2">
      {r.summary ||
        r.experience[0]?.bullets[0] ||
        `${r.experience.length} roles · ${r.skills.length} skill groups`}
    </p>
  );
}
