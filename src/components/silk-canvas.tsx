"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export type SilkHandle = {
  clear: () => void;
  exportPNG: () => string;
  burst: (x?: number, y?: number) => void;
};

type Props = {
  className?: string;
  /** rotational symmetry arms */
  symmetry?: number;
  /** HSL hues, one per arm, cycling over time */
  hues?: number[];
  /** keep painting even when the pointer is still */
  ambient?: boolean;
  interactive?: boolean;
  listenOn?: "self" | "window";
  /** @deprecated use fadeAfter */
  fade?: number;
  /** how long a stroke stays visible before it has fully dissolved, in seconds */
  fadeAfter?: number;
  baseWidth?: number;
  bg?: string;
  mirror?: boolean;
  /** pause painting while the stage is offscreen (keeps the canvas mounted) */
  activeRef?: { current: boolean };
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
};

const SilkCanvas = forwardRef<SilkHandle, Props>(function SilkCanvas(
  {
    className,
    symmetry = 6,
    hues = [258, 330, 172, 54, 276],
    ambient = true,
    interactive = true,
    listenOn = "self",
    fadeAfter = 30,
    baseWidth = 2.4,
    bg = "#08070c",
    mirror = false,
    activeRef,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const api = useRef<SilkHandle>({
    clear: () => {},
    exportPNG: () => "",
    burst: () => {},
  });
  const huesRef = useRef(hues);
  huesRef.current = hues;

  useImperativeHandle(ref, () => ({
    clear: () => api.current.clear(),
    exportPNG: () => api.current.exportPNG(),
    burst: (x, y) => api.current.burst(x, y),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let w = 1;
    let h = 1;
    let cx = 0;
    let cy = 0;

    let lastX = -1;
    let lastY = -1;
    let curX = -1;
    let curY = -1;
    let targetX = -1;
    let targetY = -1;
    let pointerSeen = 0;
    let hasPointer = false;

    const sparks: Spark[] = [];
    const started = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      cx = w / 2;
      cy = h / 2;
      lastX = -1;
      lastY = -1;
    };

    resize();

    const stroke = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      width: number,
      hue: number,
      alpha: number,
      light = 64,
    ) => {
      ctx.strokeStyle = `hsla(${hue}, 100%, ${light}%, ${alpha})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    const paint = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      speed: number,
      time: number,
    ) => {
      const arms = Math.max(1, symmetry);
      const palette = huesRef.current;
      for (let i = 0; i < arms; i++) {
        const a = (i / arms) * Math.PI * 2;
        const cos = Math.cos(a);
        const sin = Math.sin(a);

        const rx1 = cx + (x1 - cx) * cos - (y1 - cy) * sin;
        const ry1 = cy + (x1 - cx) * sin + (y1 - cy) * cos;
        const rx2 = cx + (x2 - cx) * cos - (y2 - cy) * sin;
        const ry2 = cy + (x2 - cx) * sin + (y2 - cy) * cos;

        /* one stable hue per arm, drifting very slowly. Cycling the hue every
           second used to smear every colour together into grey. */
        const hue =
          (palette[i % palette.length] ?? palette[0]) +
          Math.sin(time * 0.00012 + i * 1.3) * 12;
        const wobble = 1 + Math.sin(time * 0.0016 + i * 1.7) * 0.35;
        const width = Math.max(
          0.5,
          (baseWidth - Math.min(speed * 0.018, 2)) * wobble,
        );

        /* bloom stays additive, the body is painted source-over so the
           stroke keeps its chroma instead of accumulating to white */
        ctx.globalCompositeOperation = "lighter";
        stroke(rx1, ry1, rx2, ry2, width * 4.4, hue, 0.05, 62);

        ctx.globalCompositeOperation = "source-over";
        stroke(rx1, ry1, rx2, ry2, width, hue, 0.62, 60);
        stroke(
          rx1,
          ry1,
          rx2,
          ry2,
          Math.max(0.4, width * 0.38),
          hue,
          0.5,
          78,
        );

        if (mirror) {
          stroke(2 * cx - rx1, ry1, 2 * cx - rx2, ry2, width, hue, 0.3, 60);
        }
      }

      ctx.globalCompositeOperation = "lighter";
    };

    /* ---- static composition for reduced motion ---- */
    if (reduced) {
      ctx.lineCap = "round";
      let px = cx + Math.sin(0.2) * w * 0.25;
      let py = cy + Math.cos(0.4) * h * 0.2;
      for (let i = 0; i < 60; i++) {
        const t = i * 0.12;
        const nx = cx + Math.sin(t * 0.9) * w * 0.26;
        const ny = cy + Math.cos(t * 0.66) * h * 0.22;
        paint(px, py, nx, ny, 2, i * 40);
        px = nx;
        py = ny;
      }
      api.current = {
        clear: () => {},
        exportPNG: () => {
          const out = document.createElement("canvas");
          out.width = canvas.width;
          out.height = canvas.height;
          const octx = out.getContext("2d");
          if (!octx) return "";
          octx.fillStyle = bg;
          octx.fillRect(0, 0, out.width, out.height);
          octx.drawImage(canvas, 0, 0);
          return out.toDataURL("image/png");
        },
        burst: () => {},
      };
      return;
    }

    /* ---- pointer ---- */
    const setTarget = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      targetX = clientX - r.left;
      targetY = clientY - r.top;
      hasPointer = true;
      pointerSeen = performance.now();
    };

    const addSparks = (x: number, y: number, count = 14) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.6 + Math.random() * 2.4;
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          hue:
            huesRef.current[Math.floor(Math.random() * huesRef.current.length)] ??
            258,
        });
      }
      if (sparks.length > 180) sparks.splice(0, sparks.length - 180);
    };

    const onMove = (e: PointerEvent) => setTarget(e.clientX, e.clientY);
    const onDown = (e: PointerEvent) => {
      setTarget(e.clientX, e.clientY);
      const r = canvas.getBoundingClientRect();
      addSparks(e.clientX - r.left, e.clientY - r.top, 18);
    };

    if (interactive) {
      if (listenOn === "window") {
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerdown", onDown, { passive: true });
      } else {
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerdown", onDown);
      }
    }

    api.current = {
      clear: () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        lastX = -1;
        lastY = -1;
        sparks.length = 0;
      },
      exportPNG: () => {
        const out = document.createElement("canvas");
        out.width = canvas.width;
        out.height = canvas.height;
        const octx = out.getContext("2d");
        if (!octx) return "";
        octx.fillStyle = bg;
        octx.fillRect(0, 0, out.width, out.height);
        octx.drawImage(canvas, 0, 0);
        return out.toDataURL("image/png");
      },
      burst: (x, y) => addSparks(x ?? cx, y ?? cy, 26),
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let prev = performance.now();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);

      const dt = Math.min(64, now - prev);
      prev = now;

      if ((activeRef && !activeRef.current) || document.hidden) return;

      /* fade on elapsed time, not on frames: a stroke lives for fadeAfter
         seconds whether the screen runs at 30fps or 144fps */
      const fadeStep = Math.min(
        0.2,
        dt / (Math.max(4, fadeAfter) * 1000),
      );
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0, 0, 0, ${fadeStep})`;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const idle = !hasPointer || now - pointerSeen > 2400;

      if (ambient && idle) {
        const t = (now - started) / 1000;
        targetX =
          cx +
          Math.sin(t * 0.55) * w * 0.26 +
          Math.sin(t * 0.23 + 1.4) * w * 0.1;
        targetY =
          cy +
          Math.cos(t * 0.42) * h * 0.24 +
          Math.sin(t * 0.31) * h * 0.09;
        pointerSeen = now - 2400;
      }

      if (targetX >= 0 && targetY >= 0) {
        if (lastX < 0) {
          lastX = targetX;
          lastY = targetY;
        } else {
          const dx = targetX - lastX;
          const dy = targetY - lastY;
          const dist = Math.hypot(dx, dy);
          if (dist > 0.35) {
            paint(lastX, lastY, targetX, targetY, dist, now);
            lastX += dx * 0.4;
            lastY += dy * 0.4;
          }
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.018;
        s.vx *= 0.995;
        s.life -= 0.018;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.fillStyle = `hsl(${s.hue} 96% 72%)`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (interactive) {
        if (listenOn === "window") {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerdown", onDown);
        } else {
          canvas.removeEventListener("pointermove", onMove);
          canvas.removeEventListener("pointerdown", onDown);
        }
      }
    };
  }, [symmetry, ambient, interactive, listenOn, fadeAfter, baseWidth, bg, mirror, activeRef]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{ display: "block" }}
    />
  );
});

export default SilkCanvas;
