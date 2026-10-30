/**
 * Ribbon shaders — the liquid background.
 *
 * A TubeGeometry swept along a CatmullRomCurve3. The vertex shader
 * displaces every vertex along its own normal with layered 3D simplex noise,
 * so the tube waves continuously instead of translating rigidly; the fragment
 * shader turns that noise into a glowing liquid gradient with a fresnel edge.
 *
 * Simplex noise: Ashima Arts' implementation (MIT), used verbatim.
 */

const SIMPLEX_NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

export const ribbonVertex = /* glsl */ `
uniform float uTime;
uniform float uScroll;
uniform float uNoiseAmp;

varying vec2 vUv;
varying float vNoise;
varying vec3 vNormalW;
varying vec3 vWorld;

${SIMPLEX_NOISE}

void main() {
  vUv = uv;

  vec3 pos = position;

  // Two octaves of 3D noise sampled in object space: the low octave carries
  // the slow organic sway, the high octave the fine liquid shimmer.
  float slow = snoise(pos * 0.32 + vec3(0.0, uTime * 0.16, uScroll * 0.35));
  float fine = snoise(pos * 0.95 + vec3(uTime * 0.22, 0.0, uScroll * 0.8));
  float n = slow + fine * 0.45;

  // Displace along the surface normal so the tube keeps its cross-section
  // while its spine waves — this is what reads as liquid rather than sliding.
  pos += normal * n * uNoiseAmp;

  vNoise = n;

  vec4 world = modelMatrix * vec4(pos, 1.0);
  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);

  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const ribbonFragment = /* glsl */ `
precision highp float;

uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uAccent;
uniform float uTime;
uniform float uScroll;

varying vec2 vUv;
varying float vNoise;
varying vec3 vNormalW;
varying vec3 vWorld;

void main() {
  // the noise field drives the colour gradient along the tube
  float gradient = smoothstep(-1.1, 1.1, vNoise);
  vec3 colour = mix(uColorA, uColorB, gradient);

  // fresnel: grazing angles brighten, which is what sells "liquid" on a tube
  vec3 viewDir = normalize(cameraPosition - vWorld);
  float fresnel = pow(1.0 - abs(dot(normalize(vNormalW), viewDir)), 2.4);
  colour += uAccent * fresnel * 0.85;

  // travelling highlight so the ribbon always feels like it is flowing
  float flow = 0.5 + 0.5 * sin(vUv.x * 26.0 - uTime * 2.2 - uScroll * 6.0);
  colour += uAccent * pow(flow, 6.0) * 0.5;

  // the ends of the tube fade out so it never shows a hard cut
  float ends = smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x));

  gl_FragColor = vec4(colour, ends * 0.92);
}
`;
