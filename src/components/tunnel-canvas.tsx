"use client";

import { useEffect, useRef } from "react";

/**
 * The tunnel. Same primitive as `vortex-canvas.tsx` (GPU point sprites on
 * spiral arms, composited through a framebuffer so every spark smears into a
 * long-exposure trail), but driven by a transition controller instead of a
 * scroll progress ref: speed, vanishing point, palette, pause.
 *
 * The vanishing point is whatever the category chip was pressed at, so the
 * hole the catalogue tears open and the tunnel behind it share one focal
 * point — the reason it reads as one space rather than two layers.
 */

export type TunnelState = {
  /** 0 idle drift → 1 full rush */
  speed: number;
  /** extra fly-through multiplier during the dive */
  fly: number;
  /** normalised vanishing point 0…1 */
  ox: number;
  oy: number;
  /** palette: hue of this category's light, in degrees */
  hue: number;
  /** 1 = render, 0 = leave the last frame alone */
  playing: boolean;
};

const TAU = Math.PI * 2;
const ARMS = 5;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const PARTICLE_VS = `
precision highp float;

attribute float aRadius;
attribute float aAngle;
attribute float aHue;
attribute float aSize;
attribute float aSpeed;
attribute float aPhase;
attribute float aTrail;

uniform float uTime;
uniform float uP;
uniform float uFly;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uBase;
uniform float uZoom;
uniform float uRoll;
uniform float uDpr;
uniform float uHueBase;

varying vec3 vColor;
varying float vAlpha;

vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

void main() {
  float trail = aTrail;
  float isTail = step(0.5, trail);
  float r = mod(aRadius - uTime * (0.0026 + uP * 0.0104), 1.0);
  float angle = aAngle
    + uTime * (0.09 + 0.5 / (r + 0.22)) * aSpeed
      * (1.0 + uP * 0.4 + uFly * 1.7)
    - isTail * trail * 0.034
    + sin(uTime * 0.55 + aPhase * 6.2831) * 0.016;

  float px = cos(angle) * r;
  float py = sin(angle) * r;
  float depth = py * 0.581;
  float y = py * 0.814;
  float cr = cos(uRoll);
  float sr = sin(uRoll);
  float rx = px * cr - y * sr;
  float ry = px * sr + y * cr;
  float persp = 1.0 / (1.0 + (depth + 1.0) * 0.22);

  vec2 xy = uCenter + vec2(rx, ry) * uBase * persp * uZoom;
  vec2 clip = vec2((xy.x / uRes.x) * 2.0 - 1.0, 1.0 - (xy.y / uRes.y) * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);

  float sizeScale = 1.0 - isTail * trail * 0.24;
  gl_PointSize = min(
    18.0,
    aSize * persp * (0.72 + uP * 0.75) * sizeScale * uDpr * 3.4
  );

  float edge = smoothstep(0.0, 0.06, r) * (1.0 - smoothstep(0.92, 1.03, r));
  float twinkle = 0.7 + 0.3 * sin(uTime * 1.4 + aPhase * 6.2831);
  float alphaScale = 1.0 - isTail * trail * 0.3;
  vAlpha = edge * twinkle * alphaScale * (0.55 + persp * 0.8);

  /* one category light: base hue plus two cooler arms for separation */
  float hue = uHueBase + aHue * 26.0;
  float sat = 0.66 + abs(aHue) * 0.06;
  vColor = hsv2rgb(vec3(hue / 360.0, sat, 1.0));
}
`;

const PARTICLE_FS = `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 d = gl_PointCoord - 0.5;
  float dist = length(d);
  if (dist > 0.5) discard;
  float core = smoothstep(0.5, 0.0, dist);
  float glow = pow(core, 1.3);
  gl_FragColor = vec4(vColor * 1.5, vAlpha * glow);
}
`;

const CORE_VS = `
precision highp float;
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const CORE_FS = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uBase;
uniform float uP;
uniform vec3 uAccent;

void main() {
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  float r = length(px - uCenter) / (uBase * (0.3 + uP * 0.16));
  float a = smoothstep(1.0, 0.0, r);
  vec3 col = mix(uAccent, vec3(0.16, 0.9, 0.82), pow(r, 1.6));
  gl_FragColor = vec4(col, pow(a, 2.4) * (0.7 + uP * 0.3));
}
`;

const QUAD_VS = `
precision highp float;
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FADE_FS = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uFade;
void main() {
  gl_FragColor = texture2D(uTex, vUv) * uFade;
}
`;

const COPY_FS = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
void main() {
  gl_FragColor = texture2D(uTex, vUv);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const int = parseInt(
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value,
    16,
  );
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}

export default function TunnelCanvas({
  stateRef,
  accent,
  className,
}: {
  stateRef: { current: TunnelState };
  accent: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const gl =
      canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        powerPreference: "high-performance",
      }) ??
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    if (!gl) {
      canvas.style.opacity = "0";
      return;
    }

    const coarse = window.matchMedia("(max-width: 860px)").matches;
    const rendererInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = rendererInfo
      ? String(gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL))
      : "";
    const software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(
      renderer,
    );
    const useFeedback = !software;

    let raf = 0;
    let visible = true;
    let w = 1;
    let h = 1;
    let dpr = 1;
    let clock = 0;
    let smoothP = 0;
    let smoothFly = 0;
    let smoothX = 0;
    let smoothY = 0;
    let hue = 76;
    let prev = performance.now();

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const makeProgram = (vs: string, fs: string) => {
      const vertex = compile(gl.VERTEX_SHADER, vs);
      const fragment = compile(gl.FRAGMENT_SHADER, fs);
      if (!vertex || !fragment) return null;
      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
      }
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      return program;
    };

    const particleProgram = makeProgram(PARTICLE_VS, PARTICLE_FS);
    const coreProgram = makeProgram(CORE_VS, CORE_FS);
    const fadeProgram = makeProgram(QUAD_VS, FADE_FS);
    const copyProgram = makeProgram(QUAD_VS, COPY_FS);

    if (!particleProgram || !coreProgram || !fadeProgram || !copyProgram) {
      canvas.style.opacity = "0";
      return;
    }

    /* ---------------- geometry ---------------- */

    const baseCount = coarse ? 1800 : 5200;
    const trailCount = 3;
    const particleData = new Float32Array(baseCount * trailCount * 7);
    let offset = 0;
    for (let i = 0; i < baseCount; i++) {
      const arm = i % ARMS;
      const radius = 0.07 + Math.pow(Math.random(), 0.72) * 0.98;
      const hueOffset = (arm - (ARMS - 1) / 2) * (arm % 2 ? 1 : -1);
      const size = 1.2 + Math.random() * 2.6;
      const speed = 0.7 + Math.random() * 0.6;
      const phase = Math.random();
      const angle =
        arm * (TAU / ARMS) +
        Math.log(radius * 4 + 1) * 1.45 +
        (Math.random() - 0.5) * 0.3;

      for (let t = 0; t < trailCount; t++) {
        particleData[offset++] = radius;
        particleData[offset++] = angle;
        particleData[offset++] = hueOffset;
        particleData[offset++] = size;
        particleData[offset++] = speed;
        particleData[offset++] = phase;
        particleData[offset++] = t;
      }
    }

    const particleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, particleData, gl.STATIC_DRAW);

    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    /* ---------------- motion-blur targets ---------------- */

    type Target = {
      fbo: WebGLFramebuffer;
      tex: WebGLTexture;
      w: number;
      h: number;
    };

    let targets: Target[] = [];
    let front = 0;

    const makeTarget = (): Target | null => {
      const tex = gl.createTexture();
      const fbo = gl.createFramebuffer();
      if (!tex || !fbo) return null;

      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        canvas.width,
        canvas.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tex,
        0,
      );
      const complete =
        gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      if (!complete) {
        gl.deleteFramebuffer(fbo);
        gl.deleteTexture(tex);
        return null;
      }
      return { fbo, tex, w: canvas.width, h: canvas.height };
    };

    const clearTargets = () => {
      for (const target of targets) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    const ensureTargets = () => {
      if (
        targets.length === 2 &&
        targets[0].w === canvas.width &&
        targets[0].h === canvas.height
      ) {
        return;
      }
      for (const target of targets) {
        gl.deleteFramebuffer(target.fbo);
        gl.deleteTexture(target.tex);
      }
      targets = [];
      if (!useFeedback) return;

      const a = makeTarget();
      const b = makeTarget();
      if (a && b) {
        targets = [a, b];
        front = 0;
        clearTargets();
      }
    };

    /* ---------------- uniforms ---------------- */

    const particleLoc = {
      aRadius: gl.getAttribLocation(particleProgram, "aRadius"),
      aAngle: gl.getAttribLocation(particleProgram, "aAngle"),
      aHue: gl.getAttribLocation(particleProgram, "aHue"),
      aSize: gl.getAttribLocation(particleProgram, "aSize"),
      aSpeed: gl.getAttribLocation(particleProgram, "aSpeed"),
      aPhase: gl.getAttribLocation(particleProgram, "aPhase"),
      aTrail: gl.getAttribLocation(particleProgram, "aTrail"),
      uTime: gl.getUniformLocation(particleProgram, "uTime"),
      uP: gl.getUniformLocation(particleProgram, "uP"),
      uFly: gl.getUniformLocation(particleProgram, "uFly"),
      uRes: gl.getUniformLocation(particleProgram, "uRes"),
      uCenter: gl.getUniformLocation(particleProgram, "uCenter"),
      uBase: gl.getUniformLocation(particleProgram, "uBase"),
      uZoom: gl.getUniformLocation(particleProgram, "uZoom"),
      uRoll: gl.getUniformLocation(particleProgram, "uRoll"),
      uDpr: gl.getUniformLocation(particleProgram, "uDpr"),
      uHueBase: gl.getUniformLocation(particleProgram, "uHueBase"),
    };

    const coreLoc = {
      aPos: gl.getAttribLocation(coreProgram, "aPos"),
      uRes: gl.getUniformLocation(coreProgram, "uRes"),
      uCenter: gl.getUniformLocation(coreProgram, "uCenter"),
      uBase: gl.getUniformLocation(coreProgram, "uBase"),
      uP: gl.getUniformLocation(coreProgram, "uP"),
      uAccent: gl.getUniformLocation(coreProgram, "uAccent"),
    };

    const fadeLoc = {
      aPos: gl.getAttribLocation(fadeProgram, "aPos"),
      uTex: gl.getUniformLocation(fadeProgram, "uTex"),
      uFade: gl.getUniformLocation(fadeProgram, "uFade"),
    };

    const copyLoc = {
      aPos: gl.getAttribLocation(copyProgram, "aPos"),
      uTex: gl.getUniformLocation(copyProgram, "uTex"),
    };

    const accentRgb = hexToRgb(accent);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.3 : 1.6);
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      ensureTargets();
    };

    const draw = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;

      const state = stateRef.current;
      const raw = Math.min(48, now - prev);
      prev = now;
      const dt = Math.max(0.001, Math.min(0.05, raw / 1000));

      const follow = 1 - Math.exp(-dt * 6.5);
      const flyTarget = clamp(state.fly, 0, 1);
      /* accelerate hard into the dive, bleed off slowly on the brake */
      const flyRate = flyTarget > smoothFly ? 9 : 3.1;
      smoothP += (clamp(state.speed, 0, 1) - smoothP) * follow;
      smoothFly += (flyTarget - smoothFly) * (1 - Math.exp(-dt * flyRate));
      smoothX += (state.ox - smoothX) * (1 - Math.exp(-dt * 5));
      smoothY += (state.oy - smoothY) * (1 - Math.exp(-dt * 5));
      hue += (state.hue - hue) * (1 - Math.exp(-dt * 3.2));

      clock += dt * (0.7 + smoothP * 1.1);

      const zoom = 1 + smoothP * 0.62 + smoothFly * 0.35;
      const base = Math.max(w, h) * 0.47;
      const cx = w * (0.22 + smoothX * 0.56);
      const cy = h * (0.22 + smoothY * 0.56);
      const roll = clock * 0.05 + smoothP * 0.5;

      const feedback = targets.length === 2;
      const writeIndex = feedback ? 1 - front : 0;

      gl.disable(gl.DEPTH_TEST);

      if (feedback) {
        const read = targets[front];
        const write = targets[writeIndex];
        gl.bindFramebuffer(gl.FRAMEBUFFER, write.fbo);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.disable(gl.BLEND);
        gl.useProgram(fadeProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.enableVertexAttribArray(fadeLoc.aPos);
        gl.vertexAttribPointer(fadeLoc.aPos, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, read.tex);
        gl.uniform1i(fadeLoc.uTex, 0);
        gl.uniform1f(fadeLoc.uFade, 0.905);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
      }

      /* mouth of the tunnel */
      gl.useProgram(coreProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.enableVertexAttribArray(coreLoc.aPos);
      gl.vertexAttribPointer(coreLoc.aPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(coreLoc.uRes, w, h);
      gl.uniform2f(coreLoc.uCenter, cx, cy);
      gl.uniform1f(coreLoc.uBase, base);
      gl.uniform1f(coreLoc.uP, smoothP);
      gl.uniform3f(coreLoc.uAccent, accentRgb[0], accentRgb[1], accentRgb[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      gl.useProgram(particleProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
      const stride = 7 * 4;
      gl.enableVertexAttribArray(particleLoc.aRadius);
      gl.vertexAttribPointer(particleLoc.aRadius, 1, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(particleLoc.aAngle);
      gl.vertexAttribPointer(particleLoc.aAngle, 1, gl.FLOAT, false, stride, 4);
      gl.enableVertexAttribArray(particleLoc.aHue);
      gl.vertexAttribPointer(particleLoc.aHue, 1, gl.FLOAT, false, stride, 8);
      gl.enableVertexAttribArray(particleLoc.aSize);
      gl.vertexAttribPointer(particleLoc.aSize, 1, gl.FLOAT, false, stride, 12);
      gl.enableVertexAttribArray(particleLoc.aSpeed);
      gl.vertexAttribPointer(particleLoc.aSpeed, 1, gl.FLOAT, false, stride, 16);
      gl.enableVertexAttribArray(particleLoc.aPhase);
      gl.vertexAttribPointer(particleLoc.aPhase, 1, gl.FLOAT, false, stride, 20);
      gl.enableVertexAttribArray(particleLoc.aTrail);
      gl.vertexAttribPointer(particleLoc.aTrail, 1, gl.FLOAT, false, stride, 24);

      gl.uniform1f(particleLoc.uTime, clock);
      gl.uniform1f(particleLoc.uP, smoothP);
      gl.uniform1f(particleLoc.uFly, smoothFly);
      gl.uniform2f(particleLoc.uRes, w, h);
      gl.uniform2f(particleLoc.uCenter, cx, cy);
      gl.uniform1f(particleLoc.uBase, base);
      gl.uniform1f(particleLoc.uZoom, zoom);
      gl.uniform1f(particleLoc.uRoll, roll);
      gl.uniform1f(particleLoc.uDpr, dpr);
      gl.uniform1f(particleLoc.uHueBase, hue);

      gl.drawArrays(gl.POINTS, 0, baseCount * trailCount);

      if (feedback) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(copyProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.enableVertexAttribArray(copyLoc.aPos);
        gl.vertexAttribPointer(copyLoc.aPos, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, targets[writeIndex].tex);
        gl.uniform1i(copyLoc.uTex, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        front = writeIndex;
      }

      if (state.playing && !document.hidden) {
        raf = requestAnimationFrame(draw);
      } else {
        if (targets.length) clearTargets();
      }
    };

    const start = () => {
      if (raf || !visible || document.hidden) return;
      prev = performance.now();
      if (targets.length) clearTargets();
      raf = requestAnimationFrame(draw);
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      stop();
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => resize())
        : null;

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    canvas.addEventListener("webglcontextlost", onContextLost);
    resize();
    start();

    /* one shared clock: the canvas rAF calls itself only while `playing` is
       true, so external state changes just need a nudge to restart */
    const watcher = window.setInterval(() => {
      if (stateRef.current.playing) start();
      else stop();
    }, 120);

    resizeObserver?.observe(canvas);

    return () => {
      stop();
      window.clearInterval(watcher);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      gl.deleteBuffer(particleBuffer);
      gl.deleteBuffer(quadBuffer);
      for (const target of targets) {
        gl.deleteFramebuffer(target.fbo);
        gl.deleteTexture(target.tex);
      }
      gl.deleteProgram(particleProgram);
      gl.deleteProgram(coreProgram);
      gl.deleteProgram(fadeProgram);
      gl.deleteProgram(copyProgram);
    };
  }, [stateRef, accent]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
