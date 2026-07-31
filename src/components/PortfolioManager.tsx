"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, jsonBody, putBody } from "@/lib/client";
import type { PortfolioDTO } from "@/lib/dto";
import { Spinner, ErrorBanner, EmptyState } from "@/components/ui";

type Draft = {
  id: string | null;
  name: string;
  description: string;
  techStack: string;
  link: string;
  relevantSkills: string;
};

const emptyDraft: Draft = {
  id: null,
  name: "",
  description: "",
  techStack: "",
  link: "",
  relevantSkills: "",
};

const splitCsv = (s: string) =>
  s.split(",").map((t) => t.trim()).filter(Boolean);

export function PortfolioManager({ initial }: { initial: PortfolioDTO[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function edit(p: PortfolioDTO) {
    setDraft({
      id: p.id,
      name: p.name,
      description: p.description,
      techStack: p.techStack.join(", "),
      link: p.link ?? "",
      relevantSkills: p.relevantSkills.join(", "),
    });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: draft.name,
        description: draft.description,
        techStack: splitCsv(draft.techStack),
        link: draft.link || null,
        relevantSkills: splitCsv(draft.relevantSkills),
      };
      if (draft.id) {
        const updated = await api<PortfolioDTO>(
          `/api/portfolio/${draft.id}`,
          putBody(payload),
        );
        setProjects((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await api<PortfolioDTO>("/api/portfolio", jsonBody(payload));
        setProjects((ps) => [created, ...ps]);
      }
      setDraft(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: PortfolioDTO) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try {
      await api(`/api/portfolio/${p.id}`, { method: "DELETE" });
      setProjects((ps) => ps.filter((x) => x.id !== p.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} />
      {!draft ? (
        <div className="flex justify-end">
          <button onClick={() => setDraft({ ...emptyDraft })} className="btn btn-primary">
            + Add project
          </button>
        </div>
      ) : null}

      {draft ? (
        <div className="card p-5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Link</label>
              <input
                className="input"
                placeholder="https://…"
                value={draft.link}
                onChange={(e) => setDraft({ ...draft, link: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="textarea min-h-[90px]"
              placeholder="What it does, what you built, the outcome."
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Tech stack (comma-separated)</label>
              <input
                className="input"
                value={draft.techStack}
                onChange={(e) =>
                  setDraft({ ...draft, techStack: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Relevant skills (comma-separated)</label>
              <input
                className="input"
                placeholder="product, data analysis, automation"
                value={draft.relevantSkills}
                onChange={(e) =>
                  setDraft({ ...draft, relevantSkills: e.target.value })
                }
              />
            </div>
          </div>
          <p className="text-text-dim text-xs">
            Relevant skills drive auto-selection — they&apos;re matched against a
            posting to pick which project (if any) to reference.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDraft(null)} className="btn">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !draft.name.trim() || !draft.description.trim()}
              className="btn btn-primary"
            >
              {saving ? <Spinner /> : draft.id ? "Save" : "Add project"}
            </button>
          </div>
        </div>
      ) : null}

      {projects.length === 0 && !draft ? (
        <EmptyState
          title="No projects yet"
          hint="Add a side project so Runway can reference it where it genuinely strengthens an application."
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {projects.map((p) => (
            <div key={p.id} className="card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{p.name}</p>
                {p.link ? (
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chip !text-accent !border-accent/40 shrink-0"
                  >
                    Link ↗
                  </a>
                ) : null}
              </div>
              <p className="text-text-muted text-sm line-clamp-3">
                {p.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {p.techStack.map((t) => (
                  <span key={t} className="chip !text-[11px]">
                    {t}
                  </span>
                ))}
              </div>
              {p.relevantSkills.length ? (
                <p className="text-text-dim text-xs">
                  Matches: {p.relevantSkills.join(", ")}
                </p>
              ) : null}
              <div className="flex gap-2 pt-1">
                <button onClick={() => edit(p)} className="btn !py-1.5 text-sm">
                  Edit
                </button>
                <button
                  onClick={() => remove(p)}
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
