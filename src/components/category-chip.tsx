"use client";

/**
 * A category chip in start.ng's own `.chips` language. Pressing it is beat 0
 * of the dive: the chip locks, the catalogue desaturates, and the exact point
 * you clicked becomes the vanishing point of the tunnel.
 */

import { useArcade } from "~/components/arcade";
import type { Category } from "~/lib/games";

export default function CategoryChip({
  category,
  count,
}: {
  category: Category;
  count: number;
}) {
  const { dive, phase } = useArcade();

  return (
    <button
      type="button"
      className={phase !== "idle" ? "on" : undefined}
      style={{ "--dot-color": category.accent } as React.CSSProperties}
      onMouseMove={(event) => {
        /* magnetic — the chip leans toward the pointer, never far */
        const el = event.currentTarget;
        const rect = el.getBoundingClientRect();
        const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
        el.style.setProperty("--mx", `${dx * 5}px`);
        el.style.setProperty("--my", `${dy * 4}px`);
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.setProperty("--mx", "0px");
        event.currentTarget.style.setProperty("--my", "0px");
      }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const fromKeyboard = event.clientX === 0 && event.clientY === 0;
        const point = fromKeyboard
          ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
          : { x: event.clientX, y: event.clientY };
        dive(category.key, {
          x: point.x / window.innerWidth,
          y: point.y / window.innerHeight,
        });
      }}
      aria-label={`Dive into ${category.label} — ${category.blurb}, ${count} games`}
    >
      <i aria-hidden />
      {category.label}
      <span className="count">{count}</span>
    </button>
  );
}
