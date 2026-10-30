import * as THREE from "three";

/**
 * DOM → WebGL synchronisation.
 *
 * The Tournament cards live in HTML. Their meshes are placed every frame by
 * reading the DOM rect and solving for the world-space point that projects to
 * the same screen pixel, so the WebGL layer tracks scrolling, resizing and any
 * layout change for free — nothing about the layout exists in JS.
 *
 * Coordinate conversion, in words:
 *   1. screen pixels → Normalised Device Coordinates (-1 … 1)
 *   2. unproject the NDC point onto the plane the mesh lives on (z = depth)
 *   3. convert the card's pixel size into world units at that same depth
 */

const _ndc = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _point = new THREE.Vector3();

export type ViewportRect = {
  /** CSS pixels */
  width: number;
  height: number;
  /** offset of the viewport inside the document (canvas is page-positioned) */
  left: number;
  top: number;
};

export function syncDOMToWebGL(
  domElement: HTMLElement,
  mesh: THREE.Mesh,
  camera: THREE.PerspectiveCamera,
  viewport: ViewportRect,
  depth = 0,
): DOMRect {
  const rect = domElement.getBoundingClientRect();

  // 1. screen pixels → NDC, relative to the canvas' own box
  const centreX = rect.left + rect.width / 2 - viewport.left;
  const centreY = rect.top + rect.height / 2 - viewport.top;
  const ndcX = viewport.width > 0 ? (centreX / viewport.width) * 2 - 1 : 0;
  const ndcY = viewport.height > 0 ? -((centreY / viewport.height) * 2 - 1) : 0;

  // 2. unproject onto the plane the mesh sits on
  _ndc.set(ndcX, ndcY, 0.5).unproject(camera);
  _dir.copy(_ndc).sub(camera.position).normalize();
  const distance = (depth - camera.position.z) / _dir.z;
  _point.copy(camera.position).addScaledVector(_dir, distance);

  mesh.position.set(_point.x, _point.y, depth);

  // 3. pixels → world units at that depth
  const worldHeight =
    2 * Math.tan(((camera.fov * Math.PI) / 180) / 2) * Math.abs(distance);
  const worldPerPixel = worldHeight / (viewport.height || 1);
  mesh.scale.set(
    rect.width * worldPerPixel,
    rect.height * worldPerPixel,
    1,
  );

  return rect;
}

/** World units covered by the visible height of the camera at a given depth. */
export function worldHeightAt(
  camera: THREE.PerspectiveCamera,
  depth: number,
): number {
  return (
    2 * Math.tan(((camera.fov * Math.PI) / 180) / 2) * Math.abs(camera.position.z - depth)
  );
}
