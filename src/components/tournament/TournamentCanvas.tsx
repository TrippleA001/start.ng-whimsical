"use client";

/**
 * TournamentCanvas — the Lusion-style WebGL layer for the Tournament section.
 *
 * The cards stay in the DOM. This component:
 *   1. proves WebGL is usable before it hides anything (Feature A, fallback),
 *   2. runs one RAF that measures each card and re-places its mesh (sync),
 *   3. drives `uScrollVelocity` from Lenis + pointer velocity (Feature B),
 *   4. springs the hovered card toward the camera (Feature B, hover),
 *   5. animates the liquid ribbon behind everything (Feature C).
 *
 * It disposes every geometry, material, texture, tween and listener it makes.
 */

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { TournamentScene, type CardSpec } from "./scene";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") || canvas.getContext("webgl"),
    );
  } catch {
    return false;
  }
}

export default function TournamentCanvas({ cards }: { cards: CardSpec[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  // static content: keep the identity stable so the WebGL layer is built once
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = document.querySelector<HTMLElement>("[data-tournament]");
    if (!canvas || !section) return;

    // Fallback first: no WebGL, or reduced motion → the DOM layout stays
    // exactly as designed and nothing is ever hidden.
    if (!webglAvailable()) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let scene: TournamentScene;
    try {
      scene = new TournamentScene(canvas, calm);
    } catch (error) {
      console.warn("[tournament] no WebGL context, keeping the CSS layout", error);
      return;
    }

    try {
      scene.setCards(cardsRef.current);
      const elements = Array.from(
        section.querySelectorAll<HTMLElement>("[data-tcard]"),
      );
      scene.bind(elements);
      setReady(true);
      // only now may the DOM card's own paint be hidden
      section.classList.add("tournament--gl");
    } catch (error) {
      console.warn("[tournament] WebGL layer unavailable, using CSS only", error);
      scene.dispose();
      return;
    }

    /* ------------------------------------------------------ sizing */
    let resizeFrame = 0;
    const resize = () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        const rect = section.getBoundingClientRect();
        scene.resize(rect.width, rect.height);
      });
    };
    resize();
    window.addEventListener("resize", resize);

    /* ------------------------------------------------- smooth scroll */
    const lenis = new Lenis({
      lerp: calm ? 1 : 0.105,
      smoothWheel: !calm,
      wheelMultiplier: 1,
    });

    let scrollVelocity = 0; // smoothed, normalised
    let pointerVelocity = 0;
    let scrollProgress = 0;
    let lastX = window.innerWidth / 2;
    let lastY = window.innerHeight / 2;
    let lastPointerT = performance.now();

    const onScroll = (event: { velocity: number; progress: number }) => {
      scrollProgress = event.progress || 0;
      // Lenis velocity is px/frame — normalise so the shader's distortion
      // strength is predictable across frame rates.
      scrollVelocity = clamp(event.velocity / 1400, -1, 1);
    };
    lenis.on("scroll", onScroll);

    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(8, now - lastPointerT);
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      lastPointerT = now;
      const speed = Math.hypot(dx, dy) / dt; // px per ms
      pointerVelocity = clamp(speed / 3.2, 0, 1) * (dy >= 0 ? 1 : -1);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    /* --------------------------------------------------------- hover */
    const elements = Array.from(
      section.querySelectorAll<HTMLElement>("[data-tcard]"),
    );
    const enter = (index: number) => () => {
      scene.setHover(index, true);
      elements[index]?.classList.add("is-t-hover");
    };
    const leave = (index: number) => () => {
      scene.setHover(index, false);
      elements[index]?.classList.remove("is-t-hover");
    };
    const off = elements.map((element, index) => {
      const onIn = enter(index);
      const onOut = leave(index);
      element.addEventListener("pointerenter", onIn);
      element.addEventListener("pointerleave", onOut);
      element.addEventListener("focusin", onIn);
      element.addEventListener("focusout", onOut);
      return () => {
        element.removeEventListener("pointerenter", onIn);
        element.removeEventListener("pointerleave", onOut);
        element.removeEventListener("focusin", onIn);
        element.removeEventListener("focusout", onOut);
      };
    });

    /* --------------------------------------------------- render loop */
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;

      lenis.raf(now);

      // spring the pointer component back to zero so a still cursor never
      // leaves the cards bent
      pointerVelocity += (0 - pointerVelocity) * (1 - Math.exp(-dt * 6));
      const velocity = clamp(
        scrollVelocity * 0.8 + pointerVelocity * 0.35,
        -1,
        1,
      );

      // The canvas is page-positioned inside the section, so its own rect is
      // the origin for every DOM → world conversion this frame.
      const box = canvas.getBoundingClientRect();
      scene.render(now / 1000, velocity, scrollProgress, {
        width: box.width,
        height: box.height,
        left: box.left,
        top: box.top,
      });
    };
    raf = requestAnimationFrame(frame);

    /* ------------------------------------------------------ teardown */
    return () => {
      cancelAnimationFrame(raf);
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      off.forEach((remove) => remove());
      lenis.destroy();
      section.classList.remove("tournament--gl");
      setReady(false);
      scene.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="tournament-canvas"
      data-ready={ready || undefined}
      aria-hidden="true"
    />
  );
}
