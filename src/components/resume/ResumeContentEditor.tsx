"use client";

import type { ResumeContent } from "@/lib/schemas";

/**
 * Structured editor for a ResumeContent. Fully controlled — the parent owns the
 * value. Reused for base resumes and for tailored-resume documents.
 */
export function ResumeContentEditor({
  value,
  onChange,
}: {
  value: ResumeContent;
  onChange: (next: ResumeContent) => void;
}) {
  const set = (patch: Partial<ResumeContent>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="space-y-6">
      {/* Contact */}
      <Section title="Contact">
        <div className="grid sm:grid-cols-2 gap-3">
          {(
            [
              ["name", "Name"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["location", "Location"],
              ["linkedin", "LinkedIn"],
              ["website", "Website"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                className="input"
                value={value.contact[key] ?? ""}
                onChange={(e) =>
                  set({ contact: { ...value.contact, [key]: e.target.value } })
                }
              />
            </Field>
          ))}
        </div>
      </Section>

      {/* Summary */}
      <Section title="Summary">
        <textarea
          className="textarea min-h-[80px]"
          value={value.summary ?? ""}
          placeholder="Optional professional summary"
          onChange={(e) => set({ summary: e.target.value })}
        />
      </Section>

      {/* Experience */}
      <Section
        title="Experience"
        onAdd={() =>
          set({
            experience: [
              ...value.experience,
              {
                company: "",
                title: "",
                location: "",
                startDate: "",
                endDate: "",
                bullets: [""],
              },
            ],
          })
        }
      >
        {value.experience.map((exp, i) => (
          <EntryCard
            key={i}
            onRemove={() =>
              set({
                experience: value.experience.filter((_, j) => j !== i),
              })
            }
          >
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                className="input"
                placeholder="Company"
                value={exp.company}
                onChange={(e) =>
                  updateList(value.experience, i, { company: e.target.value }, (experience) => set({ experience }))
                }
              />
              <input
                className="input"
                placeholder="Title"
                value={exp.title}
                onChange={(e) =>
                  updateList(value.experience, i, { title: e.target.value }, (experience) => set({ experience }))
                }
              />
              <input
                className="input"
                placeholder="Location"
                value={exp.location ?? ""}
                onChange={(e) =>
                  updateList(value.experience, i, { location: e.target.value }, (experience) => set({ experience }))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input"
                  placeholder="Start"
                  value={exp.startDate}
                  onChange={(e) =>
                    updateList(value.experience, i, { startDate: e.target.value }, (experience) => set({ experience }))
                  }
                />
                <input
                  className="input"
                  placeholder="End"
                  value={exp.endDate ?? ""}
                  onChange={(e) =>
                    updateList(value.experience, i, { endDate: e.target.value }, (experience) => set({ experience }))
                  }
                />
              </div>
            </div>
            <BulletEditor
              bullets={exp.bullets}
              onChange={(bullets) =>
                updateList(value.experience, i, { bullets }, (experience) => set({ experience }))
              }
            />
          </EntryCard>
        ))}
      </Section>

      {/* Extracurricular */}
      <Section
        title="Leadership & Involvement"
        onAdd={() =>
          set({
            extracurricular: [
              ...value.extracurricular,
              { organization: "", role: "", startDate: "", endDate: "", bullets: [""] },
            ],
          })
        }
      >
        {value.extracurricular.map((x, i) => (
          <EntryCard
            key={i}
            onRemove={() =>
              set({
                extracurricular: value.extracurricular.filter((_, j) => j !== i),
              })
            }
          >
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                className="input"
                placeholder="Organization"
                value={x.organization}
                onChange={(e) =>
                  updateList(value.extracurricular, i, { organization: e.target.value }, (extracurricular) => set({ extracurricular }))
                }
              />
              <input
                className="input"
                placeholder="Role"
                value={x.role}
                onChange={(e) =>
                  updateList(value.extracurricular, i, { role: e.target.value }, (extracurricular) => set({ extracurricular }))
                }
              />
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <input
                  className="input"
                  placeholder="Start"
                  value={x.startDate ?? ""}
                  onChange={(e) =>
                    updateList(value.extracurricular, i, { startDate: e.target.value }, (extracurricular) => set({ extracurricular }))
                  }
                />
                <input
                  className="input"
                  placeholder="End"
                  value={x.endDate ?? ""}
                  onChange={(e) =>
                    updateList(value.extracurricular, i, { endDate: e.target.value }, (extracurricular) => set({ extracurricular }))
                  }
                />
              </div>
            </div>
            <BulletEditor
              bullets={x.bullets}
              onChange={(bullets) =>
                updateList(value.extracurricular, i, { bullets }, (extracurricular) => set({ extracurricular }))
              }
            />
          </EntryCard>
        ))}
      </Section>

      {/* Skills */}
      <Section
        title="Skills"
        onAdd={() =>
          set({ skills: [...value.skills, { category: "", items: [] }] })
        }
      >
        {value.skills.map((s, i) => (
          <EntryCard
            key={i}
            onRemove={() =>
              set({ skills: value.skills.filter((_, j) => j !== i) })
            }
          >
            <input
              className="input mb-2"
              placeholder="Category (e.g. Technical)"
              value={s.category}
              onChange={(e) =>
                updateList(value.skills, i, { category: e.target.value }, (skills) => set({ skills }))
              }
            />
            <input
              className="input"
              placeholder="Comma-separated skills"
              value={s.items.join(", ")}
              onChange={(e) =>
                updateList(
                  value.skills,
                  i,
                  { items: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) },
                  (skills) => set({ skills }),
                )
              }
            />
          </EntryCard>
        ))}
      </Section>

      {/* Education */}
      <Section
        title="Education"
        onAdd={() =>
          set({
            education: [
              ...value.education,
              { institution: "", degree: "", location: "", startDate: "", endDate: "", details: [] },
            ],
          })
        }
      >
        {value.education.map((ed, i) => (
          <EntryCard
            key={i}
            onRemove={() =>
              set({ education: value.education.filter((_, j) => j !== i) })
            }
          >
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                className="input"
                placeholder="Institution"
                value={ed.institution}
                onChange={(e) =>
                  updateList(value.education, i, { institution: e.target.value }, (education) => set({ education }))
                }
              />
              <input
                className="input"
                placeholder="Degree"
                value={ed.degree}
                onChange={(e) =>
                  updateList(value.education, i, { degree: e.target.value }, (education) => set({ education }))
                }
              />
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <input
                  className="input"
                  placeholder="Start"
                  value={ed.startDate ?? ""}
                  onChange={(e) =>
                    updateList(value.education, i, { startDate: e.target.value }, (education) => set({ education }))
                  }
                />
                <input
                  className="input"
                  placeholder="End"
                  value={ed.endDate ?? ""}
                  onChange={(e) =>
                    updateList(value.education, i, { endDate: e.target.value }, (education) => set({ education }))
                  }
                />
              </div>
            </div>
            <BulletEditor
              bullets={ed.details ?? []}
              label="Details"
              onChange={(details) =>
                updateList(value.education, i, { details }, (education) => set({ education }))
              }
            />
          </EntryCard>
        ))}
      </Section>
    </div>
  );
}

/* ---- helpers ------------------------------------------------------------- */

function updateList<T>(
  list: T[],
  index: number,
  patch: Partial<T>,
  commit: (next: T[]) => void,
) {
  commit(list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
}

function Section({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          {title}
        </h3>
        {onAdd ? (
          <button type="button" onClick={onAdd} className="btn btn-ghost !py-1 text-xs">
            + Add
          </button>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function EntryCard({
  onRemove,
  children,
}: {
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-bg-elevated p-3 space-y-2 relative">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 text-text-dim hover:text-bad text-xs"
        aria-label="Remove"
      >
        ✕
      </button>
      {children}
    </div>
  );
}

function BulletEditor({
  bullets,
  onChange,
  label = "Bullets",
}: {
  bullets: string[];
  onChange: (next: string[]) => void;
  label?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="label !mb-0">{label}</span>
        <button
          type="button"
          onClick={() => onChange([...bullets, ""])}
          className="text-xs text-accent hover:underline"
        >
          + bullet
        </button>
      </div>
      {bullets.map((b, i) => (
        <div key={i} className="flex gap-1.5 items-start">
          <textarea
            className="textarea min-h-[42px] text-xs"
            value={b}
            onChange={(e) =>
              onChange(bullets.map((x, j) => (j === i ? e.target.value : x)))
            }
          />
          <button
            type="button"
            onClick={() => onChange(bullets.filter((_, j) => j !== i))}
            className="text-text-dim hover:text-bad px-1 pt-2 shrink-0"
            aria-label="Remove bullet"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
