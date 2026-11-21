"use client";

import { CheckIcon, EditIcon, PlusIcon } from "@/components/icons";
import { Sheet } from "@/components/ui/Sheet";
import { INTERESTS, resolveInterests } from "./interestCatalog";
import { SectionTitle } from "./SectionTitle";
import s from "./me.module.css";

// Interests are stored on-device only (localStorage tcity.interests via useProfileInterests).
// Sending them to the backend (for perk and hunt suggestions) is the optional request in issue #94.

/** Selected interests on the profile, as colorful tags, with an Edit action. */
export function InterestsSection({ selected, onEdit }: { selected: string[]; onEdit: () => void }) {
  const items = resolveInterests(selected);
  return (
    <section aria-labelledby="me-interests" style={{ padding: "0 var(--space-4)" }}>
      <SectionTitle
        id="me-interests"
        title="Into"
        action={
          items.length ? (
            <button type="button" onClick={onEdit} className={s.press} style={linkBtn} aria-label="Edit interests">
              <EditIcon size={15} />
              Edit
            </button>
          ) : null
        }
      />
      {items.length ? (
        <ul style={{ listStyle: "none", display: "flex", flexWrap: "wrap", gap: 8 }}>
          {items.map(({ id, label, Icon, color }) => (
            <li key={id} className={s.tag} style={{ ["--chip" as string]: color }}>
              <span className={s.tagIcon}>
                <Icon size={16} weight={2.2} />
              </span>
              {label}
            </li>
          ))}
        </ul>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className={s.press}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: 14,
            borderRadius: "var(--radius-card)",
            border: "1.5px dashed var(--surface-3)",
            background: "var(--surface)",
            textAlign: "left",
          }}
        >
          <span style={{ display: "flex", flex: "none" }} aria-hidden="true">
            {INTERESTS.slice(0, 3).map(({ id, Icon, color }, i) => (
              <span
                key={id}
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 38,
                  height: 38,
                  marginLeft: i ? -10 : 0,
                  borderRadius: "50%",
                  background: color,
                  color: "var(--accent-ink)",
                  border: "3px solid var(--surface)",
                  transform: `rotate(${(i - 1) * 8}deg)`,
                }}
              >
                <Icon size={18} weight={2.2} />
              </span>
            ))}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 700 }}>What are you into?</span>
            <span style={{ display: "block", fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
              Pick a few so your city feels like yours.
            </span>
          </span>
          <span
            style={{
              display: "grid",
              placeItems: "center",
              flex: "none",
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--accent)",
              color: "var(--accent-ink)",
            }}
            aria-hidden="true"
          >
            <PlusIcon size={18} weight={2.4} />
          </span>
        </button>
      )}
    </section>
  );
}

/** Multi-select picker. Each tap saves immediately; "Done" just closes. */
export function InterestsSheet({
  open,
  onClose,
  selected,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const set = new Set(selected);
  const toggle = (id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    // keep catalog order so the profile tags read consistently
    onChange(INTERESTS.filter((i) => next.has(i.id)).map((i) => i.id));
  };

  return (
    <Sheet open={open} onClose={onClose} title="Your interests">
      <p style={{ fontSize: 14, color: "var(--muted)", marginTop: -4, marginBottom: 14 }}>
        Pick as many as you like. We&apos;ll use them to flavor hunts and perks near your stops.
      </p>
      <div role="group" aria-label="Interests" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        {INTERESTS.map(({ id, label, Icon, color }) => (
          <button
            key={id}
            type="button"
            aria-pressed={set.has(id)}
            onClick={() => toggle(id)}
            className={s.chip}
            style={{ ["--chip" as string]: color }}
          >
            <span className={s.chipIcon}>
              <Icon size={22} weight={2.1} />
              <span className={s.chipCheck} aria-hidden="true">
                <CheckIcon size={12} weight={3.2} />
              </span>
            </span>
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
          </button>
        ))}
      </div>
      <div
        style={{
          position: "sticky",
          bottom: -24,
          marginTop: 16,
          paddingTop: 12,
          paddingBottom: 4,
          background: "linear-gradient(transparent, var(--surface) 30%)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className={s.press}
          style={{
            width: "100%",
            minHeight: 52,
            border: "none",
            borderRadius: "var(--radius-pill)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontWeight: 800,
            fontSize: 16,
          }}
        >
          {selected.length ? `Done · ${selected.length} picked` : "Done"}
        </button>
      </div>
    </Sheet>
  );
}

const linkBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minHeight: "var(--tap-min)",
  padding: "0 4px 0 12px",
  border: "none",
  background: "transparent",
  color: "var(--muted)",
  fontWeight: 600,
  fontSize: 14,
};
