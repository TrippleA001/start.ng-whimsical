/**
 * Card shaders — the tournament cards as deformable planes.
 *
 * The DOM stays authoritative for layout, hit-testing and accessibility;
 * these shaders only draw what the DOM card would draw, plus the things CSS
 * cannot do: bowing with scroll velocity, a spring lift toward the camera on
 * hover, and a rim that catches the section light along the bend.
 */

/**
 * Vertex:
 *  - `sin(uv.x * PI)` is zero at both card edges and one at the centre, so the
 *    plane bows between its two vertical edges without sliding off the DOM
 *    rectangle it is synchronised to.
 *  - uScrollVelocity is signed: scrolling down bends the top of the card
 *    toward the camera, scrolling up away from it.
 *  - uHover is a spring (0 → 1) driven by GSAP; it pushes the surface forward
 *    as a shallow dome and is also used to expand the UV boundary.
 */
export const cardVertex = /* glsl */ `
uniform float uTime;
uniform float uScrollVelocity;
uniform float uHover;
uniform float uDistortion;

varying vec2 vUv;
varying float vBend;
varying float vHover;

const float PI = 3.141592653589793;

void main() {
  vUv = uv;
  vHover = uHover;

  vec3 pos = position;

  // Horizontal bow driven by scroll velocity (spec: sin(uv.x * PI) * velocity)
  float bend = sin(uv.x * PI) * uScrollVelocity * uDistortion;

  // Vertical term so the card also flexes top-to-bottom under fast scroll
  bend += sin(uv.y * PI) * uScrollVelocity * uDistortion * 0.35;

  // Idle breathing so the surface is never perfectly flat at rest
  bend += sin(uv.y * PI * 2.0 + uTime * 1.4) * 0.012;

  // Hover: a shallow dome pushing the middle of the card toward the camera
  bend += uHover * 0.16 * sin(uv.x * PI) * sin(uv.y * PI);

  pos.z += bend;

  vBend = bend;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

/**
 * Fragment:
 *  - Samples the card texture, with the UV boundary expanding slightly on
 *    hover so the art appears to lean toward the pointer.
 *  - `abs(vBend)` is used as a rim term: wherever the surface is bent, the
 *    card edge catches light — the visual cue that makes the bow readable.
 *  - A rounded-rect alpha mask keeps the WebGL card's corners identical to
 *    the DOM card's border-radius.
 */
export const cardFragment = /* glsl */ `
precision highp float;

uniform sampler2D uMap;
uniform vec3 uAccent;
uniform vec3 uBase;
uniform float uTime;
uniform float uHover;
uniform float uScrollVelocity;

varying vec2 vUv;
varying float vBend;
varying float vHover;

void main() {
  // UV boundary expands toward the edges while hovered
  vec2 uv = (vUv - 0.5) / (1.0 + 0.035 * vHover) + 0.5;

  vec4 tex = texture2D(uMap, uv);
  vec3 colour = mix(uBase, tex.rgb, tex.a);

  // rim light along the curvature of the bend
  float rim = smoothstep(0.02, 0.14, abs(vBend));
  colour += uAccent * rim * 0.42;

  // hover lift adds a soft inner glow
  colour += uAccent * vHover * 0.1;

  // specular streak travelling across the surface with the scroll
  float streak = smoothstep(0.46, 0.5, fract(vUv.x * 0.7 - uTime * 0.05 + uScrollVelocity * 0.2));
  colour += vec3(1.0) * streak * 0.06;

  // rounded rectangle mask matching the DOM border radius (18px on 512px)
  float radius = 0.055;
  vec2 q = abs(vUv - 0.5) - (0.5 - radius);
  float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  float alpha = 1.0 - smoothstep(-0.003, 0.001, dist);

  // edges of the card darken slightly so it reads as a physical object
  float edge = smoothstep(0.0, 0.045, abs(dist));
  colour *= mix(0.72, 1.0, edge);

  gl_FragColor = vec4(colour, alpha);
}
`;
