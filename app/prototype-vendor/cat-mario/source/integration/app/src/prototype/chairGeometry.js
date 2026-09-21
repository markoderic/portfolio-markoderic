import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

// Chair-only upholstery: rounded volume with a shallow seat crown or lumbar
// fullness. Keep the underside/rear mounting surfaces flat against their shells.
export function cushionGeometry(size, radius, back = false) {
  const [w, h, d] = size;
  const geometry = new THREE.BoxGeometry(w, h, d, 16, back ? 16 : 6, back ? 6 : 16);
  const half = new THREE.Vector3(w / 2, h / 2, d / 2);
  const core = half.clone().subScalar(radius);
  const p = new THREE.Vector3(), nearest = new THREE.Vector3();
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i);
    nearest.copy(p).clamp(core.clone().negate(), core);
    p.sub(nearest).normalize().multiplyScalar(radius).add(nearest);
    const across = Math.max(0, 1 - (p.x / half.x) ** 2);
    if (back) {
      const front = Math.max(0, -p.z / half.z);
      p.z -= .09 * front * across * Math.exp(-(((p.y / half.y + .45) / .45) ** 2));
    } else {
      p.y += .065 * Math.max(0, p.y / half.y) * across * Math.max(0, 1 - (p.z / half.z) ** 2);
    }
    positions.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.deleteAttribute("normal");
  geometry.deleteAttribute("uv"); // Solid upholstery; weld face seams before smoothing.
  const welded = mergeVertices(geometry);
  geometry.dispose();
  welded.computeVertexNormals();
  return welded;
}
