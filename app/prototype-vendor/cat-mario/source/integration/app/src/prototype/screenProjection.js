import { PAPER_WIDTH, PAPER_HEIGHT } from "./paperGeometry.js";
import { LAPTOP } from "./deviceGeometry.js";
import * as THREE from "three";
import handsetOutline from "./assets/phone-hull.json" with { type: "json" };

// A plane's CSS pixels use the same homogeneous projection as its WebGL mesh.
// There is one DOM tree per display: no screenshot texture or second overlay.
const clip = new THREE.Matrix4();
const origin = new THREE.Vector4();
const horizontal = new THREE.Vector4();
const vertical = new THREE.Vector4();
const center = new THREE.Vector3(),
  normal = new THREE.Vector3(),
  toCamera = new THREE.Vector3();
export function projectionVisible(plane, camera, physical) {
  plane.updateWorldMatrix(true, false);
  plane.getWorldPosition(center);
  normal.set(0, 0, 1).transformDirection(plane.matrixWorld);
  if (normal.dot(toCamera.copy(camera.position).sub(center)) <= 0.002)
    return false;
  for (const x of [-physical[0] / 2, physical[0] / 2])
    for (const y of [-physical[1] / 2, physical[1] / 2]) {
      const p = new THREE.Vector3(x, y, 0)
        .applyMatrix4(plane.matrixWorld)
        .applyMatrix4(camera.matrixWorldInverse);
      if (!Number.isFinite(p.z) || p.z >= -camera.near) return false;
    }
  return true;
}
export function projectScreen(
  element,
  plane,
  camera,
  viewport,
  physical,
  pixels,
) {
  if (!element || !plane) return;
  if (!projectionVisible(plane, camera, physical)) {
    element.style.visibility = "hidden";
    return;
  }
  clip
    .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    .multiply(plane.matrixWorld);
  origin.set(-physical[0] / 2, physical[1] / 2, 0, 1).applyMatrix4(clip);
  horizontal.set(physical[0] / pixels.width, 0, 0, 0).applyMatrix4(clip);
  vertical.set(0, -physical[1] / pixels.height, 0, 0).applyMatrix4(clip);
  const column = (p) => [
    (viewport.width / 2) * (p.x + p.w),
    (viewport.height / 2) * (p.w - p.y),
    0,
    p.w,
  ];
  const values = [
    ...column(horizontal),
    ...column(vertical),
    0,
    0,
    1,
    0,
    ...column(origin),
  ];
  const transform = `matrix3d(${values.map((v) => v / origin.w).join(",")})`;
  if (element.style.transform !== transform)
    element.style.transform = transform;
  element.style.visibility = origin.w > 0 ? "visible" : "hidden";
}
export function roundedOutline(w, h, r, segments = 12) {
  const points = [];
  for (const [cx, cy, start] of [
    [w - r, h - r, 0],
    [-w + r, h - r, 90],
    [-w + r, -h + r, 180],
    [w - r, -h + r, 270],
  ]) {
    for (let i = 0; i <= segments; i++) {
      const a = ((start + (i / segments) * 90) * Math.PI) / 180;
      points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return points;
}
// Occlusion lives in display-local CSS pixels, never in a full-viewport fixed mask.
// Project camera rays through each physical silhouette onto the rear screen plane.
// Nested phone/paper clips form a union even where the objects overlap.
export function occlusionPath(
  occluder,
  outline,
  camera,
  laptop,
  physical,
  pixels,
) {
  if (!occluder?.visible || !laptop) return "none";
  occluder.updateWorldMatrix(true, false);
  laptop.updateWorldMatrix(true, false);
  const inverse = laptop.matrixWorld.clone().invert();
  const eye = camera
    .getWorldPosition(new THREE.Vector3())
    .applyMatrix4(inverse);
  const points = [];
  for (const [x, y, z = 0] of outline) {
    const p = new THREE.Vector3(x, y, z)
      .applyMatrix4(occluder.matrixWorld)
      .applyMatrix4(inverse);
    const t = -eye.z / (p.z - eye.z);
    // Occluder must lie between eye and display along every silhouette ray.
    if (!Number.isFinite(t) || t <= 1) return "none";
    p.sub(eye).multiplyScalar(t).add(eye);
    points.push([
      (p.x / physical[0] + 0.5) * pixels.width,
      (0.5 - p.y / physical[1]) * pixels.height,
    ]);
  }
  if (
    points.every((p) => p[0] < 0) ||
    points.every((p) => p[0] > pixels.width) ||
    points.every((p) => p[1] < 0) ||
    points.every((p) => p[1] > pixels.height)
  )
    return "none";
  const hull = convexHull(points).map((p) =>
    p.map((v) => v.toFixed(3)).join(" "),
  );
  return `path(evenodd, "M 0 0 H ${pixels.width} V ${pixels.height} H 0 Z M ${hull.join(" L ")} Z")`;
}
export function convexHull(points) {
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (a, b, c) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const half = (values) => {
    const h = [];
    for (const p of values) {
      while (h.length > 1 && cross(h.at(-2), h.at(-1), p) <= 0) h.pop();
      h.push(p);
    }
    return h.slice(0, -1);
  };
  return [...half(sorted), ...half(sorted.slice().reverse())];
}
// Measured convex exterior of the original GLB, in the Phone pivot coordinates.
// Cache settled poses: the 3D silhouette only needs reprojecting during movement.
const phoneMaskCache = new WeakMap();
export function maskPhone(
  element,
  pivot,
  camera,
  viewport,
  laptop,
  pixels = viewport,
) {
  if (!element) return;
  if (!pivot || !laptop) {
    element.style.clipPath = "none";
    phoneMaskCache.delete(element);
    return;
  }
  pivot.updateWorldMatrix(true, false);
  laptop.updateWorldMatrix(true, false);
  camera.updateWorldMatrix(true, false);
  const key = [pivot.visible, pixels.width, pixels.height,
    ...pivot.matrixWorld.elements, ...laptop.matrixWorld.elements,
    ...camera.matrixWorld.elements].join(",");
  if (phoneMaskCache.get(element) === key) return;
  phoneMaskCache.set(element, key);
  element.style.clipPath = occlusionPath(
    pivot, handsetOutline, camera, laptop,
    [LAPTOP.width, LAPTOP.height], pixels,
  );
}
export function maskPaper(element, paper, camera, laptop, pixels) {
  if (element)
    element.style.clipPath = occlusionPath(
      paper,
      paper?.userData.crumpled
        ? Array.from(
            { length: paper.geometry.attributes.position.count },
            (_, i) => [
              paper.geometry.attributes.position.getX(i),
              paper.geometry.attributes.position.getY(i),
              paper.geometry.attributes.position.getZ(i),
            ],
          )
        : [
            [-PAPER_WIDTH/2, PAPER_HEIGHT/2],
            [PAPER_WIDTH/2, PAPER_HEIGHT/2],
            [PAPER_WIDTH/2, -PAPER_HEIGHT/2],
            [-PAPER_WIDTH/2, -PAPER_HEIGHT/2],
          ],
      camera,
      laptop,
      [LAPTOP.width, LAPTOP.height],
      pixels,
    );
}
