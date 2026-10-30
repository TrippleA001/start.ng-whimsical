"use client";

/**
 * The whole moment lives here, mounted once from the root layout so that a
 * route change (`/` → `/c/naija` → `/play/bingo`) swaps only the paper page
 * underneath it. The vortex and the player are never unmounted mid-flight.
 *
 *   paper ──press──▶ tear ──▶ dive ──▶ brake ──▶ orbit ──▶ focus ──▶ launch
 *                                                                    │
 *   paper  ◀────────── return ◀──────────────────────────────────────┘
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import Vortex from "~/components/vortex";
import Player, { type LaunchRect } from "~/components/player";
import { sound } from "~/lib/sound";
import { CATEGORIES, type CategoryKey } from "~/lib/games";

export type Phase = "idle" | "press" | "dive" | "orbit";

type ArcadeValue = {
  phase: Phase;
  category: CategoryKey | null;
  playing: string | null;
  /** category + the exact point the chip was pressed at (it becomes the
   *  vanishing point) */
  dive: (key: CategoryKey, origin: { x: number; y: number }) => void;
  launch: (slug: string, rect: LaunchRect | null) => void;
  exit: () => void;
  /** warm the game's subdomain so launch feels immediate */
  preconnect: (host: string | null) => void;
};

const Ctx = createContext<ArcadeValue | null>(null);

export function useArcade() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useArcade must be used inside <Arcade>");
  return value;
}

const CATEGORY_KEYS = new Set(CATEGORIES.map((c) => c.key));

function parse(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "c" && CATEGORY_KEYS.has(parts[1] as CategoryKey)) {
    return { category: parts[1] as CategoryKey, slug: null };
  }
  if (parts[0] === "play" && parts[1]) return { category: null, slug: parts[1] };
  return { category: null, slug: null };
}

export default function Arcade({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const route = parse(pathname);
  const lastPath = useRef(pathname);

  const [phase, setPhase] = useState<Phase>("idle");
  const [category, setCategory] = useState<CategoryKey | null>(route.category);
  const [origin, setOrigin] = useState({ x: 0.5, y: 0.46 });
  const [playing, setPlaying] = useState<string | null>(null);
  const [launchRect, setLaunchRect] = useState<LaunchRect | null>(null);

  const pushedVortex = useRef(false);
  const pushedPlayer = useRef(false);
  const timers = useRef<number[]>([]);

  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  useEffect(
    () => () => {
      for (const id of timers.current) window.clearTimeout(id);
    },
    [],
  );

  /* ---------------------------------------------------- route → state */
  useEffect(() => {
    const prev = lastPath.current;
    lastPath.current = pathname;

    // deep link / refresh: no dive, just be there
    if (prev === pathname && route.category) {
      setCategory(route.category);
      setOrigin({ x: 0.5, y: 0.46 });
      setPhase("dive");
      after(820, () => setPhase("orbit"));
      return;
    }

    if (route.category) {
      if (category === route.category && phase === "orbit") return;
      setCategory(route.category);
      if (phase === "idle") {
        setPhase("dive");
        after(820, () => setPhase("orbit"));
      }
    } else if (phase !== "idle") {
      // left the vortex (browser Back or Exit)
      setPhase("idle");
      setPlaying(null);
      pushedVortex.current = false;
      pushedPlayer.current = false;
      sound.play("back");
    }

    if (route.slug) setPlaying(route.slug);
    else setPlaying(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* --------------------------------------------------------- controls */

  const dive = useCallback(
    (key: CategoryKey, point: { x: number; y: number }) => {
      setOrigin(point);
      setCategory(key);
      if (phase === "idle") {
        setPhase("press");
        pushedVortex.current = true;
        sound.play("warp");
        after(120, () => setPhase("dive"));
        after(940, () => setPhase("orbit"));
      }
      if (pathname !== `/c/${key}`) router.push(`/c/${key}`);
    },
    [after, pathname, phase, router],
  );

  const launch = useCallback(
    (slug: string, rect: LaunchRect | null) => {
      sound.play("launch");
      setLaunchRect(rect);
      setPlaying(slug);
      pushedPlayer.current = true;
      router.push(`/play/${slug}`);
    },
    [router],
  );

  const exit = useCallback(() => {
    if (pushedPlayer.current) {
      pushedPlayer.current = false;
      router.back();
      return;
    }
    if (pushedVortex.current && phase !== "idle") {
      pushedVortex.current = false;
      router.back();
      return;
    }
    router.push("/");
  }, [phase, router]);

  /* ------------------------------------------------------- global keys */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (playing) return; // the player owns Escape while a game is up
      if (phase === "idle") return;
      event.preventDefault();
      exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exit, phase, playing]);

  /* -------------------------------------------------------- body scroll */
  const locked = phase !== "idle" || playing !== null;
  useEffect(() => {
    document.body.classList.toggle("is-locked", locked);
    return () => document.body.classList.remove("is-locked");
  }, [locked]);

  /* --------------------------------------------------- preconnect hint */
  const preconnect = useCallback((host: string | null) => {
    if (!host || document.querySelector(`link[data-preconnect="${host}"]`))
      return;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = host;
    link.crossOrigin = "";
    link.dataset.preconnect = host;
    document.head.appendChild(link);
  }, []);

  const value = useMemo<ArcadeValue>(
    () => ({ phase, category, playing, dive, launch, exit, preconnect }),
    [phase, category, playing, dive, launch, exit, preconnect],
  );

  return (
    <Ctx.Provider value={value}>
      <Vortex
        phase={phase}
        category={category}
        origin={origin}
        playing={playing}
      />
      <Player slug={playing} rect={launchRect} onExit={exit} />

      {/* the shockwave the click leaves on the page */}
      {playing && launchRect ? (
        <span
          className="burst"
          aria-hidden
          style={{
            left: `${launchRect.x + launchRect.w / 2}px`,
            top: `${launchRect.y + launchRect.h / 2}px`,
          }}
        />
      ) : null}

      <div
        className={`paper${
          phase !== "idle" ? " is-torn is-buried" : ""
        }${playing ? " is-receding" : ""}`}
        aria-hidden={locked}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}
