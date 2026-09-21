import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createLitLaptop, applyKeyboardLight, screenLightFrame, stepLaptopLight, SCREEN_LIGHT } from "./laptopLighting";
import { useGLTF } from "@react-three/drei";
import modelUrl from "./assets/laptop-m3.glb?url";
import { laptopHandlers, clearTrackpadInput } from "./trackpadInput";
import { LAPTOP } from "./deviceGeometry";

export function LoadedLaptop({ onStageReady, night, desktopDark, reduced }) {
  const { scene } = useGLTF(modelUrl);
  const instance = useMemo(() => createLitLaptop(scene), [scene]);
  const initial = useRef({ keyboard: night ? 1 : 0, screen: desktopDark ? SCREEN_LIGHT.dark : SCREEN_LIGHT.light }).current;
  const level = useRef({ ...initial }), spill = useRef();
  const frame = useMemo(screenLightFrame, []);
  const target = useMemo(() => {
    const object = new THREE.Object3D(); object.position.copy(frame.target); return object;
  }, [frame]);
  useEffect(() => () => instance.dispose(), [instance]);
  useEffect(() => { onStageReady("laptopModel"); }, [onStageReady]);
  useFrame((_, dt) => {
    level.current.keyboard = stepLaptopLight(level.current.keyboard, night ? 1 : 0, reduced, dt);
    level.current.screen = stepLaptopLight(level.current.screen, desktopDark ? SCREEN_LIGHT.dark : SCREEN_LIGHT.light, reduced, dt);
    applyKeyboardLight(instance.materials, level.current.keyboard);
    if (spill.current) spill.current.intensity = level.current.screen;
  });
  return <group>
    <primitive object={instance.model} scale={LAPTOP.modelScale} dispose={null} />
    {/* One front-hemisphere proxy for HTML brightness, in scene units, not model units.
        This is a soft-cone point source, not captured pixels or an exact area emitter. */}
    <spotLight ref={spill} position={frame.source} target={target}
      intensity={initial.screen} color={SCREEN_LIGHT.color}
      angle={SCREEN_LIGHT.angle} penumbra={SCREEN_LIGHT.penumbra}
      distance={SCREEN_LIGHT.distance} decay={SCREEN_LIGHT.decay}
      castShadow shadow-mapSize={[512, 512]} shadow-camera-near={.035}
      shadow-bias={-.0001} shadow-normalBias={.005} shadow-radius={3} />
    <primitive object={target} />
  </group>;
}

export default function LaptopModel({ onSelect, onTrackpad, input, enabled, screen, onStageReady, night, desktopDark, reduced }) {
  const owner = useRef();
  const local = useRef({});
  input ||= local.current;
  useEffect(() => { if (!enabled) clearTrackpadInput(input); return () => clearTrackpadInput(input); }, [input, enabled]);
  return (
    <group
      position={LAPTOP.position}
      ref={owner}
      {...laptopHandlers(input, enabled, owner, kind => {
        if (kind === "trackpad") onTrackpad();
        else onSelect("laptop");
      })}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => { document.body.style.cursor = ""; }}
    >
      <Suspense fallback={null}>
        <LoadedLaptop onStageReady={onStageReady} night={night} desktopDark={desktopDark} reduced={reduced} />
      </Suspense>
      {/* One reference in scene units, outside the scaled model child. The same
          plane owns camera fit, HTML projection, masks and the display hit target.
          The imported dark backing supplies pixels; this plane writes none. */}
      <mesh ref={screen} position={LAPTOP.screenPosition} rotation={LAPTOP.screenRotation}>
        <planeGeometry args={[LAPTOP.width, LAPTOP.height]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
    </group>
  );
}
