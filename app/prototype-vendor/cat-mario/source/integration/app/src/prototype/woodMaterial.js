import * as T from 'three';
import { DESK } from './sceneScale.js';

// Original solid-walnut field, sampled once. Packed alpha is linear roughness.
// One full-board image (no UV repeat), plus both thin end faces in one atlas.
export const WOOD_MAP = { width: 1024, height: 512, endWidth: 512, endHeight: 64 };
const smooth = x => x * x * (3 - 2 * x);
const hash = (x, y) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ 1973;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), u = smooth(x - ix), v = smooth(y - iy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
export function woodSample(x, y, z) {
  const wander = (noise(x * .24 + 4, z * .65 + 8) - .5) * .36;
  const radius = Math.hypot((z + .7 + wander) * .64, (y + 1.65) * 1.8);
  const phase = radius * 13 + (noise(x * .18, z * 1.2) - .5) * 2.6;
  const ring = Math.pow(Math.max(0, Math.sin(phase)), 7);
  const broad = noise(x * .18 + 13, z * 1.1 + 4) - .5;
  const fibers = noise(x * .4 + 12, (z + wander) * 29) - .5;
  const fine = noise(x * 1.6, (z + wander) * 65) - .5;
  const tone = broad * 25 + fibers * 10 + fine * 3 - ring * (5 + noise(x * .3, z * 3) * 9);
  return [75 + tone, 53 + tone * .78, 39 + tone * .57,
    255 * (.73 + broad * .08 + ring * .055 + fibers * .025)].map(n => Math.round(T.MathUtils.clamp(n, 0, 255)));
}
export function woodPixels(end = false) {
  const width = end ? WOOD_MAP.endWidth : WOOD_MAP.width;
  const height = end ? WOOD_MAP.endHeight : WOOD_MAP.height;
  const data = new Uint8Array(width * height * 4);
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const side = i < width / 2 ? -1 : 1;
    const x = end ? side * DESK.width / 2 : (i / (width - 1) - .5) * DESK.width;
    const y = end ? (j / (height - 1) - .5) * DESK.thickness : DESK.thickness / 2;
    const z = ((end ? (i % (width / 2)) / (width / 2 - 1) : j / (height - 1)) - .5) * DESK.depth;
    data.set(woodSample(x, y, z), (j * width + i) * 4);
  }
  return { data, width, height };
}
export function createWoodMaterial() {
  const textures = [false, true].map(end => {
    const { data, width, height } = woodPixels(end);
    const texture = new T.DataTexture(data, width, height, T.RGBAFormat);
    texture.colorSpace = T.SRGBColorSpace;
    texture.minFilter = T.LinearMipmapLinearFilter;
    texture.magFilter = T.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  });
  const material = new T.MeshStandardMaterial({ color: '#ffffff', roughness: .75, metalness: 0 });
  material.name = 'office-walnut';
  material.onBeforeCompile = shader => {
    shader.uniforms.officeWoodTop = { value: textures[0] };
    shader.uniforms.officeWoodEnd = { value: textures[1] };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 officeWoodPosition;\nvarying vec3 officeWoodNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nofficeWoodPosition=position;\nofficeWoodNormal=normal;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 officeWoodPosition;\nvarying vec3 officeWoodNormal;\nuniform sampler2D officeWoodTop;\nuniform sampler2D officeWoodEnd;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 woodTopUV=vec2(officeWoodPosition.x/${DESK.width.toFixed(2)}+.5,officeWoodPosition.z/${DESK.depth.toFixed(2)}+.5);
        float woodSide=step(0.0,officeWoodPosition.x);
        vec2 woodEndUV=vec2(woodSide*.5+(0.5+clamp(woodTopUV.y,0.0,1.0)*255.0)/512.0,
          (0.5+clamp(officeWoodPosition.y/${DESK.thickness.toFixed(2)}+.5,0.0,1.0)*63.0)/64.0);
        vec4 officeWoodSample=mix(texture2D(officeWoodTop,woodTopUV),texture2D(officeWoodEnd,woodEndUV),pow(abs(normalize(officeWoodNormal).x),4.0));
        diffuseColor.rgb *= officeWoodSample.rgb;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=officeWoodSample.a;');
  };
  material.customProgramCacheKey = () => 'office-walnut-packed-v2';
  // Owned by Desk. No per-frame work, retained global cache, or shared disposal.
  material.addEventListener('dispose', () => textures.forEach(texture => texture.dispose()));
  material.userData.woodTextures = textures;
  return material;
}
