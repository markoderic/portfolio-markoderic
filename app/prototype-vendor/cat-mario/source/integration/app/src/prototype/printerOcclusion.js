import * as THREE from "three";
import { convexHull } from "./screenProjection.js";
import { LAPTOP } from "./deviceGeometry.js";

// Each mounted printer mesh is convex (rounded boxes, cylinder, circle, seam).
// Keep parts separate: one hull for the whole printer would close tray/body gaps.
const geometryCache = new WeakMap();
const elementCache = new WeakMap();
const EPS = 1e-9;
function meshVertices(geometry) {
  const attribute = geometry.attributes.position;
  const key = `${attribute.version}:${geometry.index?.version ?? 0}`;
  let saved = geometryCache.get(geometry);
  if (saved?.attribute === attribute && saved.key === key) return saved;
  const vertices = [], remap = [], unique = new Map();
  for (let i = 0; i < attribute.count; i++) {
    const p = new THREE.Vector3().fromBufferAttribute(attribute, i);
    const id = p.toArray().join(",");
    if (!unique.has(id)) { unique.set(id, vertices.length); vertices.push(p); }
    remap.push(unique.get(id));
  }
  const indices = geometry.index?.array ?? remap.map((_, i) => i);
  const triangles = Array.from(indices, i => remap[i]);
  saved = { attribute, key, vertices, triangles };
  geometryCache.set(geometry, saved);
  return saved;
}
function visible(object) {
  for (let o = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}
// Sutherland–Hodgman for a convex polygon and an arbitrary linear half-space.
function clip(points, distance) {
  if (!points.length) return [];
  const result = [];
  let a = points.at(-1), da = distance(a);
  for (const b of points) {
    const db = distance(b), insideA = da >= 0, insideB = db >= 0;
    if (insideA !== insideB) {
      const t = da / (da - db);
      result.push(a.map((v, i) => v + (b[i] - v) * t));
    }
    if (insideB) result.push(b);
    a = b; da = db;
  }
  return result;
}
const cross = (a, b, p) => (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
const area = polygon => polygon.reduce((sum, a, i) => {
  const b = polygon[(i+1)%polygon.length]; return sum+a[0]*b[1]-b[0]*a[1];
}, 0) / 2;
const useful = p => p.length >= 3 && Math.abs(area(p)) > EPS;

// Subtract a convex hole from a convex visible cell. The emitted outside cells
// are disjoint. Repeating this yields rectangle minus the UNION of all parts,
// without the overlapping-hole XOR bug of a compound evenodd path.
export function subtractConvex(cells, hole) {
  const result = [];
  for (const cell of cells) {
    let remaining = cell;
    for (let i = 0; i < hole.length && useful(remaining); i++) {
      const a = hole[i], b = hole[(i+1)%hole.length];
      const outside = clip(remaining, p => -cross(a,b,p));
      if (useful(outside)) result.push(outside);
      remaining = clip(remaining, p => cross(a,b,p));
    }
  }
  return result;
}

export function printerPolygons(meshes, camera, laptop, pixels) {
  laptop.updateWorldMatrix(true, false);
  camera.updateWorldMatrix(true, false);
  const inverse = laptop.matrixWorld.clone().invert();
  const eye = camera.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse);
  if (eye.z <= EPS || pixels.width <= 0 || pixels.height <= 0) return [];
  // Camera near plane expressed in display-local coordinates, alongside z>0.
  const toCamera = camera.matrixWorldInverse.clone().multiply(laptop.matrixWorld);
  const c = toCamera.elements;
  const nearDistance = p => -(c[2]*p[0]+c[6]*p[1]+c[10]*p[2]+c[14])-camera.near;
  const frontDistance = p => p[2]-EPS;
  const holes = [];
  for (const mesh of meshes) {
    if (!visible(mesh)) continue;
    const data = meshVertices(mesh.geometry);
    const matrix = inverse.clone().multiply(mesh.matrixWorld);
    const points = data.vertices.map(v => v.clone().applyMatrix4(matrix).toArray());
    if (points.every(p => frontDistance(p)<0) || points.every(p => nearDistance(p)<0)) continue;
    const project = polygon => {
      const projected = [];
      for (const p of polygon) {
        const w = eye.z-p[2], t = eye.z/w;
        if (!Number.isFinite(t) || t < 1 || w<EPS) continue;
        const x = eye.x+(p[0]-eye.x)*t, y = eye.y+(p[1]-eye.y)*t;
        if (Number.isFinite(x) && Number.isFinite(y)) projected.push([
          (x/LAPTOP.width+.5)*pixels.width, (.5-y/LAPTOP.height)*pixels.height,
        ]);
      }
      let hole = convexHull(projected);
      for (const distance of [p=>p[0],p=>pixels.width-p[0],p=>p[1],p=>pixels.height-p[1]]) hole=clip(hole,distance);
      if (useful(hole)) holes.push(hole);
    };
    if (points.some(p => nearDistance(p)<0 || eye.z-p[2]<EPS)) {
      // Near-plane crossings cannot use a capped convex volume: the renderer
      // shows clipped front faces, not an invented cap. Retain those individual
      // polygons; homogeneous aperture clipping also avoids a horizon divide.
      const halfWidth=LAPTOP.width/2, halfHeight=LAPTOP.height/2;
      const bounds=[frontDistance,nearDistance,p=>eye.z-p[2]-EPS,
        p=>eye.z*p[0]-eye.x*p[2]+halfWidth*(eye.z-p[2]),
        p=>halfWidth*(eye.z-p[2])-(eye.z*p[0]-eye.x*p[2]),
        p=>eye.z*p[1]-eye.y*p[2]+halfHeight*(eye.z-p[2]),
        p=>halfHeight*(eye.z-p[2])-(eye.z*p[1]-eye.y*p[2])];
      for (let i=0; i<data.triangles.length; i+=3) {
        let face=data.triangles.slice(i,i+3).map(index=>points[index]);
        const [a,b,c]=face.map(p=>new THREE.Vector3(...p));
        const facing=b.clone().sub(a).cross(c.clone().sub(a)).dot(eye.clone().sub(a));
        const side=mesh.material.side;
        if (side!==THREE.DoubleSide && (side===THREE.BackSide ? facing>=0 : facing<=0)) continue;
        for (const distance of bounds) face=clip(face,distance);
        project(face);
      }
    } else {
      let clipped = points;
      if (points.some(p => frontDistance(p)<0)) {
        clipped = [];
        for (let i=0; i<data.triangles.length; i+=3) {
          const face=data.triangles.slice(i,i+3).map(index=>points[index]);
          clipped.push(...clip(face,frontDistance));
        }
      }
      project(clipped);
    }
  }
  // Large foreground parts often fully cover decals/vents: omit those redundant
  // silhouettes without connecting separated parts or filling empty gaps.
  holes.sort((a,b)=>Math.abs(area(b))-Math.abs(area(a)));
  return holes.filter((hole,i)=>!holes.slice(0,i).some(outer=>hole.every(p=>outer.every((a,k)=>cross(a,outer[(k+1)%outer.length],p)>=-EPS))));
}

export function printerClipPath(meshes, camera, laptop, pixels) {
  const holes = printerPolygons(meshes,camera,laptop,pixels);
  if (!holes.length) return "none";
  let cells = [[[0,0],[pixels.width,0],[pixels.width,pixels.height],[0,pixels.height]]];
  for (const hole of holes) cells=subtractConvex(cells,hole);
  if (!cells.length) return 'path("M 0 0 Z")'; // Only actual complete coverage.
  return `path("${cells.map(cell=>`M ${cell.map(p=>p.map(v=>Number(v.toFixed(5))).join(" ")).join(" L ")} Z`).join(" ")}")`;
}

export function maskPrinter(element, printer, camera, laptop, pixels) {
  if (!element) return;
  if (!printer || !laptop || !visible(printer)) {
    element.style.clipPath="none";
    elementCache.delete(element);
    return;
  }
  printer.updateWorldMatrix(true,true);
  laptop.updateWorldMatrix(true,false);
  camera.updateWorldMatrix(true,false);
  const meshes=[];
  printer.traverseVisible(object=>{
    if (object.isMesh && object.geometry?.attributes.position) meshes.push(object);
  });
  // Includes roller/seam transforms, not just the stationary printer root.
  const key=[pixels.width,pixels.height,camera.near,...camera.matrixWorld.elements,
    ...laptop.matrixWorld.elements,...meshes.flatMap(m=>[m.id,m.geometry.id,
      m.geometry.attributes.position.version,m.geometry.index?.version??0,...m.matrixWorld.elements])].join(",");
  if (elementCache.get(element)===key) return;
  element.style.clipPath=printerClipPath(meshes,camera,laptop,pixels);
  elementCache.set(element,key);
}
