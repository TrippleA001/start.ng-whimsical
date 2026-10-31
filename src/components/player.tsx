"use client";

/**
 * The player: the card you clicked IS the loading screen.
 *
 * The overlay FLIPs from the card's measured screen rect to full viewport,
 * the game's preview (or its cover) plays full-bleed behind a lime progress
 * line, and the iframe crossfades in underneath when it finally loads. No
 * spinner, no blank white rectangle.
 *
 * A focused game swallows Escape, so the chrome — Exit, Fullscreen, Open in
 * new tab — is never optional and never depends on a key press.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { gameFor } from "~/lib/games";
import { loadPreviews, type PreviewMap } from "~/lib/previews";

export type LaunchRect = { x: number; y: number; w: number; h: number };

const FLIP_IN = 460;
const FLIP_OUT = 340;

const SANDBOX = [
  "allow-scripts",
  "allow-same-origin",
  "allow-forms",
  "allow-popups",
  "allow-popups-to-escape-sandbox",
  "allow-pointer-lock",
  "allow-fullscreen",
].join(" ");

const ALLOW = [
  "fullscreen",
  "gamepad",
  "autoplay",
  "pointer-lock",
  "clipboard-write",
  "picture-in-picture",
].join("; ");

export default function Player({
  slug,
  rect,
  onExit,
}: {
  slug: string | null;
  rect: LaunchRect | null;
  onExit: () => void;
}) {
  const game = gameFor(slug);
  const overlay = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const idleTimer = useRef<number>(0);
  const [live, setLive] = useState(false);
  const [landed, setLanded] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [idle, setIdle] = useState(false);
  const [previews, setPreviews] = useState<PreviewMap>({});
  const [videoBroken, setVideoBroken] = useState(false);
  const [exitPos, setExitPos] = useState({ x: 0, y: 0 });
  const [exitLocked, setExitLocked] = useState(false);
  const [fleeCooldown, setFleeCooldown] = useState(false);
  const exitBtnRef = useRef<HTMLButtonElement>(null);
  const exitTimer = useRef<number>(0);
  const cooldownTimer = useRef<number>(0);
  const FLEE_LOCK_MS = 5000;
  const FLEE_COOLDOWN_MS = 1000;

  useEffect(() => {
    void loadPreviews().then(setPreviews);
  }, []);

  /* --------------------------------------------------- open / close */
  useEffect(() => {
    if (!game) return;
    const el = overlay.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setLive(false);
    setLanded(false);
    setNote(null);
    setVideoBroken(false);

    const land = window.setTimeout(() => setLanded(true), reduced ? 40 : FLIP_IN - 70);

    if (el && !reduced) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const from = rect ?? { x: vw / 2 - 120, y: vh / 2 - 75, w: 240, h: 150 };
      const dx = from.x + from.w / 2 - vw / 2;
      const dy = from.y + from.h / 2 - vh / 2;
      const sx = Math.max(0.04, from.w / vw);
      const sy = Math.max(0.04, from.h / vh);
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.86 },
          { transform: "none", opacity: 1 },
        ],
        { duration: FLIP_IN, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
      /* the cover arrives a beat late, like it is settling into place */
      el.querySelector<HTMLElement>(".player__poster")?.animate(
        [{ transform: "scale(1.16)" }, { transform: "scale(1)" }],
        { duration: FLIP_IN + 560, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      );
    }

    frame.current?.focus();
    return () => window.clearTimeout(land);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  /* --------------------------------------------- iframe readiness */
  const onLoad = useCallback(() => {
    // onLoad fires for error pages too — hold the poster, then crossfade
    window.setTimeout(() => setLive(true), 400);
  }, []);

  useEffect(() => {
    if (!game || live) return;
    const slow = window.setTimeout(() => setNote("Still loading…"), 8000);
    const stuck = window.setTimeout(
      () => setNote("Taking too long — open it in a new tab instead"),
      15000,
    );
    return () => {
      window.clearTimeout(slow);
      window.clearTimeout(stuck);
    };
  }, [game, live]);

  /* ------------------------------------------------ chrome autohide */
  const wake = useCallback(() => {
    setIdle(false);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), 3000);
  }, []);

  useEffect(() => {
    if (!game) return;
    wake();
    return () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [game, wake]);

  /* ------------------------------------------------------ exiting */
  const close = useCallback(() => {
    const el = overlay.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const to = rect ?? { x: vw / 2 - 120, y: vh / 2 - 75, w: 240, h: 150 };
    const dx = to.x + to.w / 2 - vw / 2;
    const dy = to.y + to.h / 2 - vh / 2;
    const sx = Math.max(0.04, to.w / vw);
    const sy = Math.max(0.04, to.h / vh);

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setLive(false);
      setLanded(false);
      onExit();
      // hand focus back to the door it came from
      if (slug) {
        window.requestAnimationFrame(() => {
          document
            .querySelector<HTMLElement>(`[data-slug="${slug}"]`)
            ?.focus({ preventScroll: true });
        });
      }
    };

    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    const animation = el.animate(
      [
        { transform: "none", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0 },
      ],
      { duration: FLIP_OUT, easing: "cubic-bezier(0.65, 0, 0.35, 1)" },
    );
    animation.onfinish = finish;
    window.setTimeout(finish, FLIP_OUT + 120);
  }, [onExit, rect, slug]);

  /* ------------------------------------------------ runaway exit */
  const flee = useCallback(() => {
    if (fleeCooldown) return;
    const btn = exitBtnRef.current;
    if (!btn) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const btnW = btn.offsetWidth || 100;
    const btnH = btn.offsetHeight || 40;
    const x = Math.random() * Math.max(0, vw - btnW - 40) + 20;
    const y = Math.random() * Math.max(0, vh - btnH - 40) + 20;
    setExitPos({ x, y });
    setExitLocked(true);
    if (exitTimer.current) window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(() => {
      setExitLocked(false);
      // give the user a 1s window to actually click before it can flee again
      setFleeCooldown(true);
      cooldownTimer.current = window.setTimeout(() => {
        setFleeCooldown(false);
      }, FLEE_COOLDOWN_MS);
    }, FLEE_LOCK_MS);
  }, [fleeCooldown]);

  const handleExitClick = useCallback(
    (event: React.MouseEvent) => {
      if (exitLocked) {
        event.preventDefault();
        flee(); // tease them again if they try to click while locked
        return;
      }
      close();
    },
    [exitLocked, flee, close],
  );

  useEffect(() => {
    return () => {
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
      if (cooldownTimer.current) window.clearTimeout(cooldownTimer.current);
    };
  }, []);

  if (!game) return null;

  const poster = game.cover.startsWith("/")
    ? "/cover-fallback.svg"
    : game.cover;
  const preview = previews[game.slug];

  return (
    <div
      className={`player${landed ? " is-landed" : ""}${idle ? " is-idle" : ""}`}
      ref={overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`${game.title} — playing`}
      onMouseMove={wake}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          close();
        }
      }}
    >
      <div className="player__stage">
        <img
          className={`player__poster${live ? " is-gone" : ""}`}
          src={poster}
          alt=""
          aria-hidden
        />
        {preview && !videoBroken && !live ? (
          <video
            key={preview}
            src={preview}
            muted
            loop
            playsInline
            autoPlay
            aria-hidden
            onError={() => setVideoBroken(true)}
          />
        ) : null}
        <iframe
          ref={frame}
          className={`player__frame${live ? " is-live" : ""}`}
          src={game.url}
          title={`${game.title} by ${game.by}`}
          sandbox={SANDBOX}
          allow={ALLOW}
          allowFullScreen
          onLoad={onLoad}
        />
        <div className={`player__progress${live ? " is-done" : ""}`} aria-hidden />
      </div>

      <div className="player__chrome">
        <button
          type="button"
          ref={exitBtnRef}
          className={`pbtn pbtn--exit${exitLocked ? " is-locked" : ""}`}
          onMouseEnter={flee}
          onClick={handleExitClick}
          style={{
            transform: `translate(${exitPos.x}px, ${exitPos.y}px)`,
            transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {exitLocked ? "Nope!" : "Exit"}
        </button>
        <div className="player__title">
          <b>{game.title}</b>
          <span>by {game.by}</span>
        </div>
        <div className="player__tools">
          <button
            type="button"
            className="pbtn"
            onClick={() => {
              const el = overlay.current;
              if (!el) return;
              if (document.fullscreenElement) void document.exitFullscreen();
              else void el.requestFullscreen?.().catch(() => {});
            }}
          >
            Fullscreen
          </button>
          <a
            className="pbtn"
            href={game.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            New tab
          </a>
        </div>
      </div>

      {note ? <p className="player__note">{note}</p> : null}
    </div>
  );
}
