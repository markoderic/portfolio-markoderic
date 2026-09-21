import * as THREE from "three";
import { HorizontalBlurShader, VerticalBlurShader } from "three-stdlib";
import { FLOOR_Y } from "./sceneScale.js";

export const GROUND_SHADOW = {
  center: [.5, FLOOR_Y - .01, 1.5], width: 22, depth: 18,
  scanInterval: .5,
  motionInterval: 1 / 30,
  directional: { day: .20, night: .06, offset: -.015 },
  layers: [
    { name: "soft", far: 3.4, resolution: 512, blurStep: .12, day: .22, night: .16 },
    { name: "contact", far: .85, resolution: 1024, blurStep: .018, day: .70, night: .58 },
  ],
};
export const ignoreShadowRay = () => {};

// ShadowMaterial normally multiplies every shadow map, even a zero-intensity
// lamp's map. This ground receiver uses only the existing room key's map.
export function createDirectionalGroundMaterial(opacity) {
  const chunk = THREE.ShaderChunk.shadowmask_pars_fragment;
  const spot = chunk.indexOf('\n\t#if NUM_SPOT_LIGHT_SHADOWS');
  const end = chunk.lastIndexOf('\n\t#endif');
  if (spot < 0 || end < spot) throw new Error('Review directional ground mask for this Three version');
  const directionalMask = chunk.slice(0, spot) + chunk.slice(end);
  const material = new THREE.ShadowMaterial({ color: 0x000000, opacity, depthWrite: false });
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <shadowmask_pars_fragment>', directionalMask);
  };
  material.customProgramCacheKey = () => 'ground-directional-only-v1';
  return material;
}

// Ground furniture, including the desk's moving drawers; never a phone/page.
// Mesh UUIDs also catch delayed/replaced meshes even with unchanged bounds.
export function groundCasterSnapshot(refs) {
  const meshes = [], signature = [];
  for (const name of ["desk", "chair", "plant", "bin"]) {
    const root = refs[name]?.current;
    if (!root) return null;
    root.updateWorldMatrix(true, true);
    const start = meshes.length;
    root.traverseVisible(o => {
      if (!o.isMesh || !o.geometry?.attributes.position) return;
      meshes.push(o);
      signature.push(o.uuid, o.geometry.uuid, o.geometry.attributes.position.version,
        o.geometry.index?.version ?? 0, ...o.matrixWorld.elements);
    });
    if (meshes.length === start) return null;
  }
  return { meshes, key: signature.join(",") };
}
export function createShadowCaptureState() { return { key: null, elapsed: Infinity, dirty: true }; }
export function captureGroundIfNeeded(state, resources, gl, refs, dt) {
  state.elapsed += Math.max(0, Math.min(dt, GROUND_SHADOW.scanInterval));
  if (!state.dirty && state.elapsed < GROUND_SHADOW.scanInterval) return false;
  state.elapsed = 0;
  const snapshot = groundCasterSnapshot(refs);
  if (!snapshot) return false;
  if (!state.dirty && snapshot.key === state.key) return false;
  resources.capture(gl, snapshot.meshes);
  state.key = snapshot.key; state.dirty = false;
  return true;
}
export function createGroundShadowResources(config = GROUND_SHADOW) {
  const geometry = new THREE.PlaneGeometry(config.width, config.depth).rotateX(Math.PI / 2);
  const directional = config.directional ? {
    geometry: new THREE.PlaneGeometry(config.width, config.depth).rotateX(-Math.PI / 2),
    material: createDirectionalGroundMaterial(config.directional.day),
  } : null;
  const depth = new THREE.ShaderMaterial({
    vertexShader: 'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'void main(){float a=pow(1.0-clamp(gl_FragCoord.z,0.0,1.0),2.0);gl_FragColor=vec4(0.0,0.0,0.0,a);}',
    side: THREE.DoubleSide, blending: THREE.NoBlending, depthTest: true, depthWrite: true,
  });
  const quadGeometry = new THREE.PlaneGeometry(2, 2);
  const horizontal = new THREE.ShaderMaterial(HorizontalBlurShader);
  const vertical = new THREE.ShaderMaterial(VerticalBlurShader);
  for (const m of [horizontal, vertical]) { m.depthTest = false; m.depthWrite = false; m.blending = THREE.NoBlending; }
  const quad = new THREE.Mesh(quadGeometry, horizontal), blurScene = new THREE.Scene();
  blurScene.add(quad);
  const blurCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2); blurCamera.position.z = 1;
  const captureScene = new THREE.Scene();
  const layers = config.layers.map(layerConfig => {
    const target = new THREE.WebGLRenderTarget(layerConfig.resolution, layerConfig.resolution);
    const scratch = new THREE.WebGLRenderTarget(layerConfig.resolution, layerConfig.resolution, { depthBuffer: false });
    target.texture.generateMipmaps = scratch.texture.generateMipmaps = false;
    const camera = new THREE.OrthographicCamera(-config.width/2, config.width/2, config.depth/2, -config.depth/2, .001, layerConfig.far);
    camera.position.fromArray(config.center); camera.up.set(0, 0, 1);
    camera.lookAt(camera.position.clone().add(new THREE.Vector3(0, 1, 0))); camera.updateMatrixWorld();
    const material = new THREE.MeshBasicMaterial({ map: target.texture, transparent: true,
      opacity: layerConfig.day, depthWrite: false, depthTest: true, side: THREE.DoubleSide, forceSinglePass: true, toneMapped: false });
    return { config: layerConfig, target, scratch, camera, material };
  });
  return {
    geometry, layers, directional,
    capture(gl, meshes, names) {
      captureScene.clear();
      for (const source of meshes) {
        const mesh = new THREE.Mesh(source.geometry, depth);
        mesh.matrixAutoUpdate = false; mesh.matrix.copy(source.matrixWorld); captureScene.add(mesh);
      }
      const target = gl.getRenderTarget(), clear = gl.getClearColor(new THREE.Color()), alpha = gl.getClearAlpha(), autoClear = gl.autoClear;
      try {
        gl.autoClear = true; gl.setClearColor(0, 0);
        for (const layer of layers) {
          if (names && !names.includes(layer.config.name)) continue;
          gl.setRenderTarget(layer.target); gl.render(captureScene, layer.camera);
          quad.material = horizontal; horizontal.uniforms.tDiffuse.value = layer.target.texture;
          horizontal.uniforms.h.value = layer.config.blurStep / config.width;
          gl.setRenderTarget(layer.scratch); gl.render(blurScene, blurCamera);
          quad.material = vertical; vertical.uniforms.tDiffuse.value = layer.scratch.texture;
          vertical.uniforms.v.value = layer.config.blurStep / config.depth;
          gl.setRenderTarget(layer.target); gl.render(blurScene, blurCamera);
        }
      } finally {
        gl.setRenderTarget(target); gl.setClearColor(clear, alpha); gl.autoClear = autoClear;
        captureScene.clear(); // Drop borrowed geometry references, never dispose source assets.
      }
    },
    dispose() {
      directional?.geometry.dispose(); directional?.material.dispose();
      for (const layer of layers) { layer.target.dispose(); layer.scratch.dispose(); layer.material.dispose(); }
      geometry.dispose(); quadGeometry.dispose(); depth.dispose(); horizontal.dispose(); vertical.dispose(); captureScene.clear();
    },
  };
}

// The low capture bands need different updates: the top drawer is above both,
// middle travel changes the soft band, and bottom travel changes both. Bounds
// overlap includes triangles crossing a band, not merely vertices within it.
function layerCasterKey(snapshot, layer, boxes) {
  const center=GROUND_SHADOW.center;
  const band=new THREE.Box3(new THREE.Vector3(center[0]-GROUND_SHADOW.width/2,center[1]+.001,center[2]-GROUND_SHADOW.depth/2),
    new THREE.Vector3(center[0]+GROUND_SHADOW.width/2,center[1]+layer.far,center[2]+GROUND_SHADOW.depth/2));
  const box=new THREE.Box3(),signature=[];
  for(const mesh of snapshot.meshes){
    const g=mesh.geometry,version=g.attributes.position.version;
    if(boxes.get(g)!==version){g.computeBoundingBox();boxes.set(g,version);}
    box.copy(g.boundingBox).applyMatrix4(mesh.matrixWorld);
    if(!box.intersectsBox(band))continue;
    signature.push(mesh.uuid,g.uuid,version,g.index?.version??0,...mesh.matrixWorld.elements);
  }
  return signature.join(',');
}
// One batched update per frame at a 30 Hz target cadence, only changed layers. A final
// revision or context recovery bypasses the rate limit. No timers/backlog.
// Retain the exported name for the existing component/fixture API.
export function captureSettledGround(state, resources, gl, refs, dt, motion) {
  const moving=!!motion?.moving.size,changedRevision=motion&&state.motionRevision!==motion.revision;
  const started=moving&&!state.wasMoving;
  state.wasMoving=moving;
  state.elapsed+=Math.max(0,Math.min(dt,GROUND_SHADOW.scanInterval));
  const interval=moving?GROUND_SHADOW.motionInterval:GROUND_SHADOW.scanInterval;
  const immediate=state.dirty||changedRevision||started;
  if(!state.dirty&&!changedRevision&&!started&&state.elapsed+1e-9<interval)return false;
  const snapshot=groundCasterSnapshot(refs);
  if(!snapshot)return false;
  state.layerKeys ||= new Map();state.boxVersions ||= new WeakMap();
  const keys=GROUND_SHADOW.layers.map(layer=>[layer.name,layerCasterKey(snapshot,layer,state.boxVersions)]);
  const names=keys.filter(([name,key])=>state.dirty||state.layerKeys.get(name)!==key).map(([name])=>name);
  if(names.length)resources.capture(gl,snapshot.meshes,names);
  state.layerKeys=new Map(keys);state.key=snapshot.key;state.dirty=false;
  // Preserve fractional frame time (not whole missed intervals) at 75/144 Hz.
  // Start/final/context captures reset the phase; no catch-up renders on resume.
  state.elapsed=immediate?0:Math.max(0,state.elapsed-interval*Math.floor((state.elapsed+1e-9)/interval));
  if(motion)state.motionRevision=motion.revision;
  return names.length>0;
}
