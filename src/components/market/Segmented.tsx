"use client";

import type { ReactNode } from "react";
import s from "./market.module.css";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  badge?: number;
}

/** Paper folder tabs on a kraft well; a cream card slides under the active tab. Rendered as a tablist. */
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
    <div role="tablist" aria-label={label} className={s.seg} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      <span
        aria-hidden="true"
        className={s.segThumb}
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${idx * 100}%)` }}
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
              fontWeight: active ? 800 : 650,
              fontSize: 15.5,
              color: active ? "var(--ink)" : "#4f4333",
              textDecoration: active ? "underline" : "none",
              textDecorationThickness: 2,
              textUnderlineOffset: 5,
              textDecorationColor: "var(--brick)",
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
                  borderRadius: 3,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11.5,
                  background: active ? "var(--brick)" : "var(--cream-2)",
                  color: active ? "#fffaf0" : "var(--ink)",
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
