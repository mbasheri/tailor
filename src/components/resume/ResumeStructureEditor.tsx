"use client";

import type {
  ResumeStructure,
  ResumeSection,
  ResumeEntry,
} from "@/lib/schemas";

/**
 * Editor for the extracted resume structure. Fully controlled — the parent owns
 * the value. Lets the user tweak any wording before export while the section
 * order / headings / entry grouping stay as extracted.
 */
export function ResumeStructureEditor({
  value,
  onChange,
}: {
  value: ResumeStructure;
  onChange: (next: ResumeStructure) => void;
}) {
  const setContact = (patch: Partial<ResumeStructure["contact"]>) =>
    onChange({ ...value, contact: { ...value.contact, ...patch } });

  const setSection = (i: number, next: ResumeSection) =>
    onChange({
      ...value,
      sections: value.sections.map((s, j) => (j === i ? next : s)),
    });

  const removeSection = (i: number) =>
    onChange({ ...value, sections: value.sections.filter((_, j) => j !== i) });

  return (
    <div className="space-y-7">
      {/* Contact */}
      <div>
        <p className="label">Contact</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {(
            [
              ["name", "Name"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["location", "Location"],
              ["linkedin", "LinkedIn"],
              ["website", "Website"],
            ] as const
          ).map(([key, ph]) => (
            <input
              key={key}
              className="input"
              placeholder={ph}
              value={value.contact[key] ?? ""}
              onChange={(e) => setContact({ [key]: e.target.value })}
            />
          ))}
        </div>
      </div>

      {value.sections.map((section, i) => (
        <SectionEditor
          key={i}
          section={section}
          onChange={(next) => setSection(i, next)}
          onRemove={() => removeSection(i)}
        />
      ))}
    </div>
  );
}

function SectionEditor({
  section,
  onChange,
  onRemove,
}: {
  section: ResumeSection;
  onChange: (next: ResumeSection) => void;
  onRemove: () => void;
}) {
  const setEntry = (i: number, next: ResumeEntry) =>
    onChange({
      ...section,
      entries: section.entries.map((e, j) => (j === i ? next : e)),
    });

  const addEntry = () =>
    onChange({
      ...section,
      entries: [
        ...section.entries,
        { title: "", subtitle: "", dateRange: "", location: "", bullets: [], text: "" },
      ],
    });

  const removeEntry = (i: number) =>
    onChange({ ...section, entries: section.entries.filter((_, j) => j !== i) });

  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center gap-2 mb-3">
        <input
          className="input font-semibold"
          value={section.heading}
          onChange={(e) => onChange({ ...section, heading: e.target.value })}
          placeholder="Section heading"
        />
        <button
          type="button"
          onClick={onRemove}
          className="btn btn-ghost text-sm shrink-0"
        >
          remove
        </button>
      </div>

      <div className="space-y-3 pl-1">
        {section.entries.map((entry, i) => (
          <EntryEditor
            key={i}
            entry={entry}
            onChange={(next) => setEntry(i, next)}
            onRemove={() => removeEntry(i)}
          />
        ))}
        <button
          type="button"
          onClick={addEntry}
          className="text-sm text-brown hover:underline"
        >
          + add entry
        </button>
      </div>
    </div>
  );
}

function EntryEditor({
  entry,
  onChange,
  onRemove,
}: {
  entry: ResumeEntry;
  onChange: (next: ResumeEntry) => void;
  onRemove: () => void;
}) {
  const set = (patch: Partial<ResumeEntry>) => onChange({ ...entry, ...patch });

  const setBullets = (bullets: string[]) => set({ bullets });

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="grid sm:grid-cols-2 gap-2">
        <input
          className="input"
          placeholder="Title / role / degree"
          value={entry.title}
          onChange={(e) => set({ title: e.target.value })}
        />
        <input
          className="input"
          placeholder="Subtitle / employer"
          value={entry.subtitle}
          onChange={(e) => set({ subtitle: e.target.value })}
        />
        <input
          className="input"
          placeholder="Date range"
          value={entry.dateRange}
          onChange={(e) => set({ dateRange: e.target.value })}
        />
        <input
          className="input"
          placeholder="Location"
          value={entry.location}
          onChange={(e) => set({ location: e.target.value })}
        />
      </div>

      {entry.text || entry.bullets.length === 0 ? (
        <textarea
          className="textarea min-h-[54px]"
          placeholder="Text (summary or skills line) — leave blank if this entry uses bullets"
          value={entry.text}
          onChange={(e) => set({ text: e.target.value })}
        />
      ) : null}

      {entry.bullets.length > 0 ? (
        <div className="space-y-1.5">
          {entry.bullets.map((b, i) => (
            <div key={i} className="flex gap-1.5 items-start">
              <textarea
                className="textarea min-h-[42px] text-sm"
                value={b}
                onChange={(e) =>
                  setBullets(
                    entry.bullets.map((x, j) => (j === i ? e.target.value : x)),
                  )
                }
              />
              <button
                type="button"
                onClick={() =>
                  setBullets(entry.bullets.filter((_, j) => j !== i))
                }
                className="btn btn-ghost text-sm shrink-0"
              >
                remove
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setBullets([...entry.bullets, ""])}
          className="text-sm text-brown hover:underline"
        >
          + add bullet
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-sm text-text-dim hover:text-bad"
        >
          remove entry
        </button>
      </div>
    </div>
  );
}
