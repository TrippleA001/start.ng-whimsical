import * as THREE from "three";
import gsap from "gsap";
import { cardVertex, cardFragment } from "./shaders/card";
import { ribbonVertex, ribbonFragment } from "./shaders/ribbon";
import { syncDOMToWebGL, worldHeightAt } from "./sync-dom";
import { createCardTexture, loadCover, type CardTexture } from "./textures";

/**
 * The Tournament scene.
 *
 * Two things only: a liquid ribbon behind the section, and one plane per DOM
 * card, re-placed every frame from the card's own bounding box. Everything
 * that must stay true for accessibility — real links, real focus, real hit
 * areas — lives in the DOM; this class is only the paint on top of it.
 */

export type CardSpec = {
  slug: string;
  title: string;
  by: string;
  cover: string;
  metric: string;
};

type Card = {
  element: HTMLElement;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  texture: CardTexture;
  /** animated by a spring; metres of forward travel on hover */
  lift: number;
};

/** depth of the card plane in world space */
const CARD_DEPTH = 0;
/** depth of the ribbon, well behind the cards */
const RIBBON_DEPTH = -3.4;
/** how far a hovered card travels toward the camera (world units) */
const HOVER_LIFT = 0.62;

export class TournamentScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

  private cards: Card[] = [];
  private ribbon?: {
    mesh: THREE.Mesh<THREE.TubeGeometry, THREE.ShaderMaterial>;
    geometry: THREE.TubeGeometry;
    material: THREE.ShaderMaterial;
  };
  private sharedCardGeometry = new THREE.PlaneGeometry(1, 1, 28, 18);
  private width = 1;
  private height = 1;
  private reduced: boolean;

  constructor(canvas: HTMLCanvasElement, reduced = false) {
    this.reduced = reduced;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    // Clamp DPR: retina/4K fill-rate is the usual way these scenes tank.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 0, 10);

    this.buildRibbon();
  }

  /* ------------------------------------------------------------ ribbon */

  private buildRibbon() {
    const worldWidth = worldHeightAt(this.camera, RIBBON_DEPTH) * this.camera.aspect;

    // A spline that sweeps the width of the section and undulates in both Y
    // and Z, so the tube passes in front of and behind its own axis.
    const points: THREE.Vector3[] = [];
    const span = worldWidth * 1.25;
    const steps = 11;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const x = -span / 2 + t * span;
      const y = Math.sin(t * Math.PI * 2.1) * 1.15 + Math.cos(t * Math.PI * 3.4) * 0.42;
      const z = RIBBON_DEPTH + Math.sin(t * Math.PI * 1.7) * 1.05;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.6);
    const geometry = new THREE.TubeGeometry(curve, this.reduced ? 90 : 260, 0.34, 20, false);

    const material = new THREE.ShaderMaterial({
      vertexShader: ribbonVertex,
      fragmentShader: ribbonFragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uNoiseAmp: { value: 0.34 },
        uColorA: { value: new THREE.Color("#1b2a12") },
        uColorB: { value: new THREE.Color("#0a0910") },
        uAccent: { value: new THREE.Color("#d8fd71") },
      },
    });

    if (this.ribbon) {
      this.scene.remove(this.ribbon.mesh);
      this.ribbon.geometry.dispose();
      this.ribbon.material.dispose();
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = -1;
    this.scene.add(mesh);
    this.ribbon = { mesh, geometry, material };
  }

  /* -------------------------------------------------------------- cards */

  setCards(cards: CardSpec[]) {
    for (const card of this.cards) {
      this.scene.remove(card.mesh);
      card.mesh.material.dispose();
      card.texture.dispose();
    }
    this.cards = [];

    cards.forEach((spec, index) => {
      const texture = createCardTexture({
        title: spec.title,
        by: spec.by,
        metric: spec.metric,
        accent: "#d8fd71",
      });

      const material = new THREE.ShaderMaterial({
        vertexShader: cardVertex,
        fragmentShader: cardFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uMap: { value: texture.texture },
          uAccent: { value: new THREE.Color("#d8fd71") },
          uBase: { value: new THREE.Color("#0c0b10") },
          uTime: { value: 0 },
          uScrollVelocity: { value: 0 },
          uHover: { value: 0 },
          uDistortion: { value: 0.42 },
        },
      });

      const mesh = new THREE.Mesh(this.sharedCardGeometry, material);
      mesh.renderOrder = index;
      mesh.visible = false; // hidden until its DOM element is measured
      this.scene.add(mesh);

      const card: Card = { element: document.createElement("div"), mesh, texture, lift: 0 };
      this.cards.push(card);

      // The cover is drawn into a 2D canvas locally, so a cross-origin
      // failure can never break the texture upload.
      loadCover(spec.cover, (image) => {
        if (image) texture.setCover(image);
      });
    });
  }

  /** Called with the DOM elements, in the same order as `setCards`. */
  bind(elements: HTMLElement[]) {
    this.cards.forEach((card, index) => {
      card.element = elements[index] ?? card.element;
    });
  }

  /**
   * Spring the hovered card toward the camera and open its shader. GSAP's
   * elastic ease gives the overshoot that makes a lift feel physical.
   */
  setHover(index: number, active: boolean) {
    const card = this.cards[index];
    if (!card) return;
    const uniforms = card.mesh.material.uniforms;
    gsap.to(card, {
      lift: active ? HOVER_LIFT : 0,
      duration: 0.85,
      ease: active ? "elastic.out(1, 0.45)" : "power2.out",
      overwrite: true,
    });
    gsap.to(uniforms.uHover, {
      value: active ? 1 : 0,
      duration: 0.7,
      ease: "power3.out",
      overwrite: true,
    });
  }

  /* ----------------------------------------------------------- lifecycle */

  resize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.buildRibbon();
  }

  render(
    elapsed: number,
    scrollVelocity: number,
    scroll: number,
    viewport: { width: number; height: number; left: number; top: number },
  ) {
    const time = this.reduced ? 0 : elapsed;
    this.width = viewport.width;
    this.height = viewport.height;

    for (const card of this.cards) {
      const rect = syncDOMToWebGL(
        card.element,
        card.mesh,
        this.camera,
        viewport,
        CARD_DEPTH + card.lift,
      );
      const visible =
        rect.top - viewport.top > -80 &&
        rect.top - viewport.top < viewport.height + 80;
      card.mesh.visible = visible;
      const uniforms = card.mesh.material.uniforms;
      uniforms.uTime.value = time;
      uniforms.uScrollVelocity.value = scrollVelocity;
    }

    if (this.ribbon) {
      const uniforms = this.ribbon.material.uniforms;
      uniforms.uTime.value = time;
      uniforms.uScroll.value = scroll;
      // slow parallax drift against the page scroll
      this.ribbon.mesh.position.y = -scroll * 1.6;
      this.ribbon.mesh.rotation.z = scroll * 0.12;
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    for (const card of this.cards) {
      this.scene.remove(card.mesh);
      card.mesh.material.dispose();
      card.texture.dispose();
      gsap.killTweensOf(card);
      gsap.killTweensOf(card.mesh.material.uniforms.uHover);
    }
    this.cards = [];

    if (this.ribbon) {
      this.scene.remove(this.ribbon.mesh);
      this.ribbon.geometry.dispose();
      this.ribbon.material.dispose();
      this.ribbon = undefined;
    }

    this.sharedCardGeometry.dispose();
    this.renderer.dispose();
    // NOTE: no forceContextLoss() — it detaches the context from the canvas,
    // and React (StrictMode, HMR) reuses the same <canvas> on the next mount.
  }
}
