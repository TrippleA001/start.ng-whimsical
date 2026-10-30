"use client";

/**
 * The vortex — the one element where the catalogue becomes a place.
 *
 * Holds the three states the design argues for:
 *   press  the chip locks, the catalogue burns away at the click point
 *   dive   800ms of rush: streaks stretch past the camera, the category
 *          name stretches into the wall of the tunnel
 *   orbit  the tunnel brakes and the ring of doors becomes the interface
 *
 * It never unmounts between categories — switching inside the vortex spirals
 * the old doors out and the new ones in, and the ring keeps its momentum.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useArcade } from "~/components/arcade";
import TunnelCanvas, { type TunnelState } from "~/components/tunnel-canvas";
import Orbit from "~/components/orbit";
import { loadPreviews, type PreviewMap } from "~/lib/previews";
import { categoryFor, gamesIn, type CategoryKey, type Game } from "~/lib/games";
import type { Phase } from "~/components/arcade";

const SPEED: Record<Phase, { speed: number; fly: number }> = {
  idle: { speed: 0, fly: 0 },
  press: { speed: 0.4, fly: 0.15 },
  dive: { speed: 1, fly: 1 },
  orbit: { speed: 0.22, fly: 0 },
};

function hueOf(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (!d) return 76;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

export default function Vortex({
  phase,
  category,
  origin,
  playing,
}: {
  phase: Phase;
  category: CategoryKey | null;
  origin: { x: number; y: number };
  playing: string | null;
}) {
  const { dive, exit } = useArcade();
  const open = phase !== "idle";
  const key = category ?? "runners";
  const active = categoryFor(key);
  const games = useMemo(() => gamesIn(key), [key]);

  const [previews, setPreviews] = useState<PreviewMap>({});
  const [outgoing, setOutgoing] = useState(false);
  const [calm, setCalm] = useState(false);
  const [display, setDisplay] = useState<{ key: CategoryKey; games: Game[] }>({
    key,
    games,
  });
  const [webgl, setWebgl] = useState(true);

  const tunnel = useRef<TunnelState>({
    speed: 0,
    fly: 0,
    ox: origin.x,
    oy: origin.y,
    hue: hueOf(active.accent),
    playing: false,
  });

  useEffect(() => {
    void loadPreviews().then(setPreviews);
  }, []);

  /* reduced motion → no dive, no grain, no wall: the ring crossfades in */
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setCalm(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  /* webgl probe — falls back to a CSS tunnel with the same card ring */
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      setWebgl(Boolean(canvas.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
  }, []);

  /* ------------------------------------------------ phase → motion */
  useEffect(() => {
    const target = SPEED[phase];
    tunnel.current = {
      ...tunnel.current,
      ...target,
      playing: phase !== "idle",
      ox: origin.x,
      oy: origin.y,
    };
  }, [phase, origin.x, origin.y]);

  /* ------------------------------------------------ accent → tint */
  useEffect(() => {
    tunnel.current.hue = hueOf(active.accent);
  }, [active.accent]);

  /* ------------------------------------------- switch inside the vortex */
  useEffect(() => {
    if (display.key === key) return;
    setOutgoing(true);
    const timer = window.setTimeout(() => {
      setOutgoing(false);
      setDisplay({ key, games });
    }, 260);
    return () => window.clearTimeout(timer);
  }, [key, games, display.key]);

  useEffect(() => {
    if (!open) setOutgoing(false);
  }, [open]);

  if (!category) return null;

  return (
    <div
      className={[
        "vortex",
        phase === "press" && "is-press",
        phase === "dive" && "is-dive",
        phase === "orbit" && "is-orbit",
        calm && "is-calm",
        playing && "is-receding",
        webgl ? "" : "vortex--css",
        open ? "is-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          "--tx": `${origin.x * 100}%`,
          "--ty": `${origin.y * 100}%`,
          "--accent": active.accent,
        } as React.CSSProperties
      }
      aria-hidden={!open}
      hidden={!open && phase === "idle"}
    >
      {webgl ? (
        <TunnelCanvas stateRef={tunnel} accent={active.accent} className="vortex__canvas" />
      ) : null}

      {/* the rim of the hole the catalogue tears open */}
      {phase === "press" || phase === "dive" ? (
        <span
          className="tear"
          aria-hidden
          style={{ left: `${origin.x * 100}%`, top: `${origin.y * 100}%` }}
        />
      ) : null}

      <div className="vortex__wall" aria-hidden>
        {active.label}
      </div>
      <div className="vortex__grain" aria-hidden />

      <div className="vortex__centre" aria-hidden>
        <b>{active.label}</b>
        <span>
          {active.label} · {games.length} games
        </span>
      </div>

      {/* mounted from the press onward so the ring can be stretched by the
          dive and then braked back into place */}
      {phase !== "idle" ? (
        <Orbit
          games={display.games}
          category={active}
          previews={previews}
          ready={open && !playing}
          outgoing={outgoing}
        />
      ) : null}

      <div className="hud">
        <nav className="hud__rail" aria-label="Categories">
          {(["runners", "naija", "catch", "brainy", "neon", "racing", "action"] as const).map(
            (item) => {
              const categoryInfo = categoryFor(item);
              return (
                <button
                  key={item}
                  type="button"
                  className="vchip"
                  aria-current={item === key}
                  style={
                    { "--vchip": categoryInfo.accent } as React.CSSProperties
                  }
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    dive(item, {
                      x: (rect.left + rect.width / 2) / window.innerWidth,
                      y: (rect.top + rect.height / 2) / window.innerHeight,
                    });
                  }}
                >
                  <span className="vchip__dot" aria-hidden />
                  {categoryInfo.label}
                </button>
              );
            },
          )}
        </nav>

        <button type="button" className="hud__exit" onClick={exit}>
          Esc · Back to the catalogue
        </button>

        <p className="hud__hint mono">
          drag or scroll to rotate · ← → to step · enter to play
        </p>
      </div>
    </div>
  );
}
