"use client";

import type { ReactNode } from "react";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  badge?: number;
}

/** Pill segmented control with a sliding lime thumb. Rendered as a tablist. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (v: T) => void;
  label: string;
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      role="tablist"
      aria-label={label}
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        padding: 4,
        borderRadius: "var(--radius-pill)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: 4,
          width: `calc((100% - 8px) / ${options.length})`,
          transform: `translateX(${idx * 100}%)`,
          borderRadius: "var(--radius-pill)",
          background: "var(--ink)",
          transition: "transform 260ms var(--ease-out)",
        }}
      />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            style={{
              position: "relative",
              minHeight: 44,
              border: "none",
              background: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 15.5,
              color: active ? "var(--bg)" : "var(--muted)",
              transition: "color 200ms",
            }}
          >
            {o.icon}
            {o.label}
            {o.badge ? (
              <span
                className="num"
                style={{
                  minWidth: 20,
                  height: 20,
                  padding: "0 6px",
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11.5,
                  background: active ? "var(--accent)" : "var(--surface-3)",
                  color: active ? "var(--accent-ink)" : "var(--ink)",
                }}
              >
                {o.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
