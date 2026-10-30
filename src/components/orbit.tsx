"use client";

/**
 * The Orbit: a helix of DOM cards in front of the WebGL tunnel.
 *
 * One rAF loop writes every card's transform straight to the DOM, so React
 * only re-renders when the focused card changes. Cards stay real <button>s —
 * real focus, real labels, real keyboard — which is why they are not WebGL
 * textures.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";
import { sound } from "~/lib/sound";
import { canAutoplayPreviews, type PreviewMap } from "~/lib/previews";
import type { Category, Game } from "~/lib/games";
import { useArcade } from "~/components/arcade";

const CULL = 1.5; // radians — cards beyond ±86° are hidden
const MAX_DOORS = 24;

function posterFor(game: Game) {
  return game.cover.startsWith("/") ? game.cover : game.cover;
}

type Slot = { game: Game; el: HTMLButtonElement | null };

export default function Orbit({
  games,
  category,
  previews,
  ready,
  outgoing = false,
}: {
  games: Game[];
  category: Category;
  previews: PreviewMap;
  ready: boolean;
  outgoing?: boolean;
}) {
  const { launch, playing, preconnect } = useArcade();
  const doors = useRef<Slot[]>([]);
  const ring = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(0);
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const entryAt = useRef(0);

  /* a new category spirals in from the tunnel; the ring keeps its momentum */
  useEffect(() => {
    entryAt.current = performance.now();
  }, [games]);

  const shown = games.slice(0, MAX_DOORS);
  const spacing = shown.length > 1 ? (Math.PI * 2) / shown.length : 0;
  const shownRef = useRef(shown);
  shownRef.current = shown;

  const state = useRef({
    rotation: -Math.PI / 2, // front card sits at angle 0
    dragging: false,
    lastX: 0,
    pointer: { x: 0.5, y: 0.5 },
    hover: -1,
    tiltX: 0,
    tiltY: 0,
  });

  /* ---------------------------------------------------------- focus */
  const focusSlot = useCallback(
    (next: number, tick = false) => {
      const count = shownRef.current.length;
      if (!count) return;
      const index = ((next % count) + count) % count;
      setFocused((current) => {
        if (current !== index && tick) sound.play("tick");
        return index;
      });
      state.current.rotation = -index * spacing;
      const slot = doors.current[index];
      if (slot?.el) {
        slot.el.style.display = ""; // it may still be culled this frame
        slot.el.focus({ preventScroll: true });
      }
    },
    [spacing],
  );

  /* ------------------------------------------------------- transform */
  useEffect(() => {
    if (!ready || playing) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    if (!entryAt.current) entryAt.current = performance.now();
    const born = entryAt.current;
    let centreX = window.innerWidth / 2;
    let centreY = window.innerHeight * 0.48;
    let radius = Math.min(window.innerWidth * 0.34, 620);

    const measure = () => {
      const rect = ring.current?.getBoundingClientRect();
      if (rect && rect.width) {
        centreX = rect.left + rect.width / 2;
        centreY = rect.top + rect.height * 0.5;
        radius = Math.min(rect.width * 0.36, 640);
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const s = state.current;

      if (!s.dragging && !reduced) s.rotation += dt * 0.07; // idle drift

      const px = (s.pointer.x - 0.5) * 34;
      const py = (s.pointer.y - 0.5) * 26;

      /* beat 1→2: the doors fall out of the tunnel towards you and brake
         onto the ring. 0 = deep in the hole, 1 = settled */
      const raw = Math.min(1, (now - born) / 940);
      const enter = 1 - Math.pow(1 - raw, 3);
      const rushing = enter < 0.999;

      let nearest = 0;
      let nearestDepth = -2;
      const total = shownRef.current.length;

      for (let i = 0; i < total; i++) {
        const slot = doors.current[i];
        if (!slot?.el) continue;
        const angle = spacing * i + s.rotation;
        const depth = Math.cos(angle);

        if (depth < Math.cos(CULL)) {
          if (slot.el.style.display !== "none") slot.el.style.display = "none";
          continue;
        }
        if (slot.el.style.display === "none") slot.el.style.display = "";

        if (depth > nearestDepth) {
          nearestDepth = depth;
          nearest = i;
        }

        const bob = reduced ? 0 : Math.sin(now * 0.0011 + i * 1.3) * 6;
        const hovered = s.hover === i;
        const forward = hovered ? 86 : 0;
        const x = Math.sin(angle) * radius + px;
        const y = Math.sin(angle) * 46 + py + bob;
        const z = (depth - 1) * 420 - forward - (1 - enter) * 2600;
        const scale =
          (0.72 + depth * 0.3 + (hovered ? 0.06 : 0)) * (0.55 + enter * 0.45);
        const yaw = Math.sin(angle) * -16 + (hovered ? s.tiltX * 7 : 0);
        const pitch = hovered ? s.tiltY * -5 : 0;

        slot.el.style.transform =
          `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) ` +
          `rotateY(${yaw.toFixed(2)}deg) rotateX(${pitch.toFixed(2)}deg) ` +
          `scale(${scale.toFixed(3)})`;
        slot.el.style.zIndex = String(200 + Math.round(depth * 100));
        slot.el.style.opacity = String(
          Math.min(1, 0.25 + depth * 1.25) * (0.15 + enter * 0.85),
        );

        if (rushing) {
          slot.el.style.filter = `blur(${((1 - enter) * 9).toFixed(2)}px)`;
        } else if (slot.el.style.filter) {
          slot.el.style.filter = "";
        }

        /* cover parallax: the art leans away from the pointer */
        const media = slot.el.querySelector(".door__media img") as HTMLElement | null;
        if (media) {
          if (hovered && !reduced) {
            media.style.transform = `scale(1.06) translate(${(-s.tiltX * 10).toFixed(
              1,
            )}px, ${(-s.tiltY * 8).toFixed(1)}px)`;
          } else if (media.style.transform) {
            media.style.transform = "";
          }
        }
      }

      if (nearest !== focused) setFocused(nearest);
    };

    measure();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [ready, playing, spacing, focused]);

  /* ----------------------------------------------------- interactions */
  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const s = state.current;
    s.dragging = true;
    s.lastX = event.clientX;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const s = state.current;
    s.pointer = {
      x: event.clientX / window.innerWidth,
      y: event.clientY / window.innerHeight,
    };
    s.tiltX = s.pointer.x * 2 - 1;
    s.tiltY = s.pointer.y * 2 - 1;
    if (!s.dragging) return;
    const dx = event.clientX - s.lastX;
    s.lastX = event.clientX;
    s.rotation += dx * 0.005;
  };

  const endDrag = () => {
    const s = state.current;
    if (!s.dragging) return;
    s.dragging = false;
    focusSlot(Math.round(-s.rotation / spacing), true); // snap
  };

  const onWheel = (event: React.WheelEvent) => {
    if (playing) return;
    state.current.rotation += event.deltaY * 0.0016;
    focusSlot(Math.round(-state.current.rotation / spacing));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusSlot(focused + 1, true);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusSlot(focused - 1, true);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusSlot(0, true);
    }
    // Enter is handled by the door itself — it is a real <button>
  };

  const watch = useCallback((index: number, active: boolean) => {
    state.current.hover = active ? index : -1;
  }, []);

  const canAuto = canAutoplayPreviews();

  /* a category switch inside the vortex unmounts these doors next render —
     keep the index inside the new ring */
  useEffect(() => {
    if (!shown.length) return;
    setFocused((current) => (current < shown.length ? current : 0));
  }, [shown.length]);

  return (
    <div
      className="vortex__ring"
      ref={ring}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      role="listbox"
      aria-label={`${category.label} games`}
    >
      {shown.map((game, index) => {
        const src = broken[game.slug] ? undefined : previews[game.slug];
        const isFront = index === focused;
        const live = Boolean(src) && (isFront || Math.abs(index - focused) <= 1);
        const poster = posterFor(game);

        return (
          <button
            key={game.slug}
            type="button"
            className={cn(
              "door",
              isFront && "is-front",
              live && canAuto && "is-live",
              outgoing && "is-out",
            )}
            style={
              {
                display: "none",
                "--door": category.accent,
                "--i": index,
              } as React.CSSProperties
            }
            aria-label={`Play ${game.title} by ${game.by}`}
            data-slug={game.slug}
            data-door={index}
            ref={(el) => {
              doors.current[index] = { game, el };
            }}
            onPointerEnter={() => {
              watch(index, true);
              try {
                preconnect(new URL(game.url).origin);
              } catch {
                /* malformed url — nothing to warm */
              }
            }}
            onPointerLeave={() => watch(index, false)}
            onFocus={() => focusSlot(index)}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              launch(game.slug, {
                x: rect.left,
                y: rect.top,
                w: rect.width,
                h: rect.height,
              });
            }}
          >
            <span className="door__body">
              <span className="door__media">
                <img src={poster} alt="" loading="lazy" decoding="async" />
                {src ? (
                  <video
                    src={src}
                    muted
                    loop
                    playsInline
                    preload={canAuto ? "auto" : "none"}
                    autoPlay={canAuto}
                    aria-hidden="true"
                    onError={() =>
                      setBroken((prev) => ({ ...prev, [game.slug]: true }))
                    }
                  />
                ) : null}
                <span className="door__sheen" aria-hidden />
                <span className="door__rarity" aria-hidden />
              </span>
              <span className="door__label">
                <span className="door__title">{game.title}</span>
                <span className="door__by">{game.by}</span>
              </span>
              <span className="door__cta" aria-hidden>
                Play
              </span>
              <span className="door__meta" aria-hidden>
                <span>{game.plays} plays</span>
                <span>{index + 1}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
