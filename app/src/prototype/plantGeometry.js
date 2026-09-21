import * as THREE from 'three';

// Authored snake-plant-like clump, in the unchanged pot's local coordinates.
// Separate roots, asymmetric heights and gently cupped/twisted solid blades.
export const PLANT_SOIL = { radius: .433, height: .724, rootHeight: .692 };
export const PLANT_LEAVES = [
  { root: [-.20,-.15], height: 1.93, width: .255, lean: [-.15,-.13], bow: .085, angle: -.22, twist: .38 },
  { root: [.015,-.27], height: 2.34, width: .240, lean: [.055,-.17], bow: -.075, angle: .28, twist: -.43 },
  { root: [.22,-.14], height: 2.06, width: .278, lean: [.17,-.10], bow: .11, angle: -.42, twist: .22 },
  { root: [-.245,.035], height: 1.69, width: .264, lean: [-.23,.045], bow: -.095, angle: -.35, twist: -.32 },
  { root: [-.04,-.015], height: 1.84, width: .224, lean: [-.04,.035], bow: .045, angle: .17, twist: .29 },
  { root: [.225,.075], height: 1.50, width: .272, lean: [.21,.14], bow: .10, angle: .42, twist: -.38 },
  { root: [-.16,.20], height: 1.35, width: .246, lean: [-.13,.18], bow: .095, angle: -.12, twist: .36 },
  { root: [.06,.27], height: 1.72, width: .257, lean: [.065,.31], bow: -.065, angle: .35, twist: -.26 },
  { root: [.06,.09], height: .91, width: .176, lean: [.02,.06], bow: .028, angle: -.42, twist: .45 },
];

function geometry(positions, colors, indices) {
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  result.setIndex(indices); result.computeVertexNormals();
  result.computeBoundingBox(); result.computeBoundingSphere();
  return result;
}
export function leafGeometry(spec, ordinal = 0) {
  const positions = [], colors = [], indices = [], rings = 32, sides = 12;
  const dark = new THREE.Color('#355839'), pale = new THREE.Color('#698064');
  for (let i = 0; i <= rings; i++) {
    const t = i / rings, angle = spec.angle + spec.twist * t * t;
    // Broad middle, narrow buried base and a small rounded tip, not a flat triangle.
    const fullness = .35 + .65 * Math.sin(Math.PI * Math.min(t / .9, 1) / 2);
    const tip = 1 - THREE.MathUtils.smoothstep(t, .64, 1);
    const width = spec.width * fullness * tip / 2 + .0006;
    const thickness = .008 * (1 - .85 * t);
    const cx = spec.root[0] + spec.lean[0] * t * t + spec.bow * Math.sin(Math.PI * t);
    const cz = spec.root[1] + spec.lean[1] * t * t;
    for (let j = 0; j < sides; j++) {
      const a = j * Math.PI * 2 / sides, u = Math.cos(a);
      const x = width * u, z = .20 * width * u * u + thickness * Math.sin(a);
      positions.push(cx + x * Math.cos(angle) + z * Math.sin(angle), PLANT_SOIL.rootHeight + spec.height * t, cz - x * Math.sin(angle) + z * Math.cos(angle));
      const band = .5 + .5 * Math.sin(t * 61 + .7 * Math.sin(t * 19 + u * 2) + ordinal);
      const edge = Math.pow(Math.abs(u), 12);
      const c = dark.clone().lerp(pale, .10 + .14 * band + .19 * edge + .018 * (ordinal % 3));
      // Restrained basal shade, not a trunk or a floating contact decal.
      c.multiplyScalar(.87 + .13 * Math.min(1, t * 12)); colors.push(c.r,c.g,c.b);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < sides; j++) {
    const a = i * sides + j, b = i * sides + (j + 1) % sides;
    indices.push(a,a+sides,b,b,a+sides,b+sides);
  }
  // Closed end caps keep thin edges solid from elevated and reverse views.
  for (let j = 1; j < sides - 1; j++) {
    indices.push(0,j,j+1);
    const a = rings * sides; indices.push(a,a+j+1,a+j);
  }
  return geometry(positions, colors, indices);
}
export function soilHeight(x,z) {
  const edge = Math.max(0, 1 - Math.hypot(x,z) / PLANT_SOIL.radius);
  return PLANT_SOIL.height + edge * (.010 * Math.sin(x*23+z*9) * Math.cos(z*29-x*7) + .004 * Math.sin(x*107-z*83) * Math.cos(z*173+x*151));
}
export function soilGeometry() {
  const positions = [0,soilHeight(0,0),0], colors = [], buckets = [[],[],[]];
  const segments = 96, rings = 32, brown = new THREE.Color('#49372a');
  for (let i = 1; i <= rings; i++) for (let j = 0; j < segments; j++) {
    const a = j * Math.PI * 2 / segments, r = PLANT_SOIL.radius * i / rings;
    const x = Math.cos(a) * r, z = Math.sin(a) * r; positions.push(x,soilHeight(x,z),z);
  }
  for (let k = 0; k < positions.length; k += 3) {
    const x = positions[k], z = positions[k+2];
    const grain = Math.sin(x*197+z*89) * Math.cos(z*157-x*73);
    const broad = Math.sin(x*23-z*37) * Math.cos(z*31);
    // Small contact areas about individual buried bases, never a clump-wide disk.
    let contact = 0;
    for (const leaf of PLANT_LEAVES) {
      const dx=x-leaf.root[0], dz=z-leaf.root[1];
      const across=dx*Math.cos(leaf.angle)-dz*Math.sin(leaf.angle), along=dx*Math.sin(leaf.angle)+dz*Math.cos(leaf.angle);
      contact = Math.max(contact, Math.exp(-((across/.056)**2+(along/.024)**2)));
    }
    const c = brown.clone().multiplyScalar(1 + .18*grain + .07*broad - .21*contact);
    colors.push(c.r,c.g,c.b);
  }
  const add = (a,b,c) => {const x=(positions[a*3]+positions[b*3]+positions[c*3])/3,z=(positions[a*3+2]+positions[b*3+2]+positions[c*3+2])/3;const v=Math.sin(x*97+z*43)*Math.cos(z*101);buckets[v<-.28?0:v>.28?2:1].push(a,b,c)};
  for (let j = 0; j < segments; j++) add(0,1+(j+1)%segments,1+j);
  for (let i = 0; i < rings-1; i++) for(let j = 0; j < segments; j++) {
    const a=1+i*segments+j,b=1+i*segments+(j+1)%segments;
    add(a,b,a+segments);add(b,b+segments,a+segments);
  }
  const result=geometry(positions,colors,buckets.flat());let start=0;
  for(let i=0;i<buckets.length;i++){result.addGroup(start,buckets[i].length,i);start+=buckets[i].length;}
  return result;
}
