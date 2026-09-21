import * as THREE from 'three';
import { LAPTOP } from './deviceGeometry.js';

// Conversion manifest: source mesh 33/material 24 -> Surface_21/material 21;
// source mesh 37/material 18 -> Surface_23/material 16. Match named geometry,
// never original material indices (several other materials were merged).
export const KEYBOARD_LIGHT = { legends: 'M3_Surface_21', edges: 'M3_Surface_23', legendIntensity: .7, edgeIntensity: .035, color: '#e0e9ff' };
export const SCREEN_LIGHT = { light: 2.2, dark: .35, color: '#e5edff', angle: 1.35, penumbra: .65, distance: Math.max(LAPTOP.width, LAPTOP.height) * 1.27, decay: 2, offset: .025 };
export function screenLightFrame() {
  const rotation = new THREE.Euler(...LAPTOP.screenRotation);
  const normal = new THREE.Vector3(0, 0, 1).applyEuler(rotation);
  const source = new THREE.Vector3(...LAPTOP.screenPosition).addScaledVector(normal, SCREEN_LIGHT.offset);
  return { source, normal, target: source.clone().add(normal), width: LAPTOP.width, height: LAPTOP.height };
}
export function stepLaptopLight(value, target, reduced, dt) {
  if (reduced) return target;
  return value + (target - value) * (1 - Math.exp(-7 * Math.max(0, Math.min(dt, .05))));
}
export function keyEdgeWeight(normalY) { return 1 - THREE.MathUtils.smoothstep(Math.abs(normalY), .25, .65); }
export function createLitLaptop(scene) {
  const model = scene.clone(true), owned = [], materials = {};
  model.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = object.name !== 'M3_DisplayBacking';
    object.receiveShadow = object.name !== 'M3_DisplayBacking';
    const kind = object.name === KEYBOARD_LIGHT.legends ? 'legends' : object.name === KEYBOARD_LIGHT.edges ? 'edges' : null;
    if (!kind) return;
    const material = object.material.clone();
    material.emissive.set(KEYBOARD_LIGHT.color); material.emissiveIntensity = 0;
    if (kind === 'edges') {
      // Geometry normals are in the baked asset frame: +Y is the key face.
      // Only low vertical sidewalls glow; top faces keep zero added emission.
      material.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vKeyEdge;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvKeyEdge=1.0-smoothstep(0.25,0.65,abs(normal.y));');
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vKeyEdge;')
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vKeyEdge;');
      };
      material.customProgramCacheKey = () => 'm3-key-sidewall-emission-v1';
    }
    object.material = material; owned.push(material); materials[kind] = material;
  });
  return { model, materials, dispose() { owned.forEach(material => material.dispose()); } };
}
export function applyKeyboardLight(materials, level) {
  if (materials.legends) materials.legends.emissiveIntensity = KEYBOARD_LIGHT.legendIntensity * level;
  if (materials.edges) materials.edges.emissiveIntensity = KEYBOARD_LIGHT.edgeIntensity * level;
}
