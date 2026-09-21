import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { GROUND_SHADOW, ignoreShadowRay, createGroundShadowResources, createShadowCaptureState, captureSettledGround } from "./groundShadowPass.js";

export default function GroundShadows({ casters, night, reduced, motion, config = GROUND_SHADOW, capture = captureSettledGround }) {
  const resources = useMemo(() => createGroundShadowResources(config), [config]);
  const state = useMemo(createShadowCaptureState, []);
  const receiver = useRef(), context = useRef(null), mix = useRef(night ? 1 : 0);
  useEffect(() => () => {
    context.current?.remove();
    resources.dispose();
  }, [resources]);
  useFrame(({ gl }, dt) => {
    if (!context.current) {
      const lost = () => { state.dirty = true; if (receiver.current) receiver.current.visible = false; };
      const restored = () => { state.dirty = true; };
      gl.domElement.addEventListener("webglcontextlost", lost);
      gl.domElement.addEventListener("webglcontextrestored", restored);
      context.current = { remove() {
        gl.domElement.removeEventListener("webglcontextlost", lost);
        gl.domElement.removeEventListener("webglcontextrestored", restored);
      } };
    }
    if (gl.getContext().isContextLost()) return;
    if (capture(state, resources, gl, casters, dt, motion?.current) && receiver.current) receiver.current.visible = true;
    mix.current += ((night ? 1 : 0) - mix.current) * (reduced ? 1 : 1 - Math.exp(-5 * Math.min(dt, .05)));
    for (const { config, material } of resources.layers)
      material.opacity = config.day + (config.night - config.day) * mix.current;
    if (resources.directional) resources.directional.material.opacity =
      config.directional.day + (config.directional.night - config.directional.day) * mix.current;
  });
  return <group ref={receiver} dispose={null} visible={false} position={config.receiver || config.center} userData={{ shadowOnly: true }}>
    {resources.directional && <mesh name="directional-ground-shadow"
      geometry={resources.directional.geometry} material={resources.directional.material}
      position={[0, config.directional.offset, 0]} receiveShadow castShadow={false}
      raycast={ignoreShadowRay} renderOrder={0} userData={{ shadowOnly: true }}
    />}
    {resources.layers.map(({ config, material }, index) => <mesh
      key={config.name} geometry={resources.geometry} material={material}
      raycast={ignoreShadowRay} renderOrder={index + 1} userData={{ shadowOnly: true }}
    />)}
  </group>;
}
