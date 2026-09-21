import { createWoodMaterial } from "./woodMaterial";
import BinContents from "./BinContents";
import { PROP_PALETTE } from "./propPalette";
import DrawerCabinet from "./DrawerCabinet";
import { PLANT_LEAVES, leafGeometry, soilGeometry } from "./plantGeometry";
import { LAMP_LIGHT, advanceLamp } from "./lampLighting";
import { cushionGeometry } from "./chairGeometry";
import { FLOOR_Y, DESK, PRINTER, CHAIR } from "./sceneScale";
import React, { useEffect, useMemo, useRef } from "react";
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
export function Body({
  size,
  position,
  color = "#e6e4df",
  radius = 0.05,
  metalness = 0.1,
  roughness = 0.42,
  ...props
}) {
  return (
    <RoundedBox
      args={size}
      position={position}
      radius={Math.min(radius, ...size.map((v) => v * 0.45))}
      smoothness={3}
      castShadow
      receiveShadow
      {...props}
    >
      <meshStandardMaterial
        color={color}
        metalness={metalness}
        roughness={roughness}
      />
    </RoundedBox>
  );
}
function Rod({ a, b, r = 0.025, color = "#b3b7b8" }) {
  const { p, q, l } = useMemo(() => {
    const av = new THREE.Vector3(...a),
      bv = new THREE.Vector3(...b);
    return {
      p: av.clone().add(bv).multiplyScalar(0.5),
      l: av.distanceTo(bv),
      q: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        bv.sub(av).normalize(),
      ),
    };
  }, [a.join(), b.join()]);
  return (
    <mesh position={p} quaternion={q} castShadow>
      <cylinderGeometry args={[r, r, l, 16]} />
      <meshStandardMaterial color={color} metalness={0.75} roughness={0.3} />
    </mesh>
  );
}
function Lathe({ points, color, position, scale = 1 }) {
  return (
    <mesh position={position} scale={scale} castShadow receiveShadow>
      <latheGeometry args={[points.map((p) => new THREE.Vector2(...p)), 48]} />
      <meshStandardMaterial
        color={color}
        roughness={0.62}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
// Original procedural furniture, no external textures or purchased models.
export function Desk({ drawers, drawerEnabled, reduced, drawerInput, onDrawerToggle, drawerShadow, drawerAudio } = {}) {
  const wood = useMemo(createWoodMaterial, []);
  useEffect(() => () => wood.dispose(), [wood]);
  return <group>
    <RoundedBox args={[DESK.width,DESK.thickness,DESK.depth]} position={[0,-DESK.thickness/2,0]} radius={.055} smoothness={3} material={wood} castShadow receiveShadow />
    {/* Four substantial posts and an under-top frame, no thin loop feet. */}
    {[-4.85,4.85].flatMap(x=>[-2.45,2.45].map(z=><Body key={`${x}-${z}`} size={[.3,6.08,.34]} position={[x,-3.26,z]} color="#3b4142" roughness={.7} radius={.035}/>))}
    {[-2.45,2.45].map(z=><Body key={z} size={[9.85,.38,.22]} position={[0,-.42,z]} color="#3b4142" radius={.035}/>)}
    <DrawerCabinet open={drawers} enabled={drawerEnabled} reduced={reduced} input={drawerInput} onToggle={onDrawerToggle} shadow={drawerShadow} audio={drawerAudio}/>
    {[-.65,.65].flatMap(x=>[-1.35,1.35].map(z=><Body key={`${x}-${z}`} size={[.12,.2,.12]} position={[3.64+x,-6.2,-.5+z]} color="#303637"/>))}
    <Body size={[4.35,.012,2.36]} position={[-.02,.006,.02]} color="#66746e" metalness={0} roughness={1} radius={.025}/>
    <group position={[2.55,.025,-1.2]} rotation={[0,-.08,0]}>
      {[0,1].map(i=><group key={i} position={[i*.04,i*.12,0]} rotation={[0,i*.12,0]}>
        <Body size={[.65,.11,.88]} position={[0,.055,0]} color={i?"#566579":"#97745e"} metalness={0} roughness={.9} radius={.012}/>
        <Body size={[.62,.075,.84]} position={[.016,.055,.012]} color="#e0ddd1" metalness={0} roughness={1} radius={.003}/>
      </group>)}
    </group>
  </group>;
}
function ChairCushion({ size, radius, back = false, ...props }) {
  const geometry = useMemo(() => cushionGeometry(size, radius, back), [size.join(), radius, back]);
  return <mesh {...props} geometry={geometry} castShadow receiveShadow>
    <meshStandardMaterial color="#4b555d" roughness={.92} metalness={0} />
  </mesh>;
}
export function Chair() {
  const frame = "#596168", shell = "#303940";
  const backMount = x => new THREE.Vector3(x, .28, .20)
    .applyEuler(new THREE.Euler(CHAIR.backTilt, 0, 0))
    .add(new THREE.Vector3(...CHAIR.backPosition)).toArray();
  return <group name="office-chair" position={CHAIR.position} rotation={[0, CHAIR.yaw, 0]}>
    {[0,1,2,3,4].map(i=>{
      const a=i*Math.PI*2/5, x=Math.sin(a)*CHAIR.baseRadius, z=Math.cos(a)*CHAIR.baseRadius;
      return <group key={i}>
        <Rod a={[0,.70,0]} b={[x,.53,z]} r={.09} color={frame}/>
        <group name={`caster-${i}`} position={[x,0,z]} rotation={[0,a,0]}>
          <mesh name={`wheel-${i}`} position={[0,CHAIR.casterRadius,0]} rotation={[0,0,Math.PI/2]} castShadow>
            <cylinderGeometry args={[CHAIR.casterRadius,CHAIR.casterRadius,CHAIR.casterWidth,24]}/>
            <meshStandardMaterial color="#282e33" roughness={.8}/>
          </mesh>
          <Rod a={[-.185,CHAIR.casterRadius,0]} b={[.185,CHAIR.casterRadius,0]} r={.055} color={frame}/>
          {[-.165,.165].map(x=><Body key={x} size={[.05,.28,.14]} position={[x,.30,0]} color={shell} radius={.02}/>)}
          <Body size={[.38,.08,.18]} position={[0,.445,0]} color={shell} radius={.03}/>
          <Rod a={[0,.47,0]} b={[0,.55,0]} r={.055} color={frame}/>
        </group>
      </group>;
    })}
    <Rod a={[0,.62,0]} b={[0,2.5,0]} r={.17} color={shell}/>
    <Rod a={[0,2.4,0]} b={[0,3.6,0]} r={.115} color="#929a9e"/>
    <Body name="seat-mechanism" size={[.86,.28,1.2]} position={[0,3.50,.10]} color={shell} radius={.06}/>
    <Body name="seat-pan" size={[CHAIR.panWidth,.20,CHAIR.panDepth]} position={[0,CHAIR.panHeight,0]} color={shell} radius={.08}/>
    <ChairCushion name="seat-cushion" size={[CHAIR.seatWidth,CHAIR.seatThickness,CHAIR.seatDepth]} position={[0,CHAIR.seatHeight,0]} radius={.21}/>
    {[-.82,.82].map(x=><Rod key={x} a={[x,CHAIR.panHeight,.80]} b={backMount(x)} r={.085} color={frame}/>)}
    <Rod a={backMount(-.82)} b={backMount(.82)} r={.075} color={frame}/>
    <group name="backrest" position={CHAIR.backPosition} rotation={[CHAIR.backTilt,0,0]}>
      <Body name="back-shell" size={[CHAIR.backWidth+.1,CHAIR.backHeight+.08,.15]} position={[0,CHAIR.backHeight/2,.205]} color={shell} radius={.065}/>
      <ChairCushion name="back-cushion" size={[CHAIR.backWidth,CHAIR.backHeight,CHAIR.backThickness]} position={[0,CHAIR.backHeight/2,0]} radius={.21} back/>
    </group>
    {[-1,1].map(side=><group key={side}>
      <Rod a={[side*1.35,CHAIR.panHeight,.45]} b={[side*CHAIR.armX,CHAIR.panHeight,.45]} r={.085} color={frame}/>
      <Rod a={[side*CHAIR.armX,CHAIR.panHeight,.45]} b={[side*CHAIR.armX,CHAIR.armHeight-.04,.16]} r={.085} color={frame}/>
      <Body name={`arm-pad-${side}`} size={[.32,.24,CHAIR.armDepth]} position={[side*CHAIR.armX,CHAIR.armHeight,0]} color={shell} roughness={.85} radius={.105}/>
    </group>)}
  </group>;
}
export const BIN_POSITION = [-5.95, FLOOR_Y, 3.1];
export function Bin() {
  return (
    <group position={BIN_POSITION} scale={2.1}>
      <Lathe
        points={[
          [0, 0],
          [0.3, 0],
          [0.39, 0.72],
          [0.39, 0.76],
          [0.36, 0.76],
          [0.28, 0.05],
          [0, 0.05],
        ]}
        color="#7c8077"
      />
      <mesh
        position={[0, 0.075, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[0.285, 32]} />
        <meshStandardMaterial color="#41463e" roughness={1} />
      </mesh>
      <BinContents />
    </group>
  );
}
export function Plant() {
  const leaves = useMemo(() => PLANT_LEAVES.map(leafGeometry), []);
  const soil = useMemo(soilGeometry, []);
  const leafMaterial = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .71, metalness: 0 }), []);
  const soilMaterials = useMemo(() => [.90,.95,1].map(roughness => new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness: 0 })), []);
  // Prop-supplied resources are owned here, not declarative R3F children.
  useEffect(() => () => {
    leaves.forEach(geometry => geometry.dispose());
    soil.dispose(); leafMaterial.dispose();
    soilMaterials.forEach(material => material.dispose());
  }, [leaves, soil, leafMaterial, soilMaterials]);
  return (
    <group position={[7.0, FLOOR_Y, -1.0]} scale={2.6}>
      <Lathe
        points={[
          [0, 0],
          [0.36, 0],
          [0.4, 0.06],
          [0.48, 0.73],
          [0.49, 0.77],
          [0.45, 0.79],
          [0.44, 0.74],
          [0.37, 0.08],
          [0, 0.08],
        ]}
        color="#bba890"
      />
      <mesh name="plant-soil" geometry={soil} material={soilMaterials} receiveShadow castShadow />
      {leaves.map((geometry, i) => <mesh key={i} name={`plant-leaf-${i}`} geometry={geometry} material={leafMaterial} castShadow receiveShadow />)}
    </group>
  );
}
export function Lamp({ onToggle, night, reduced, palette = PROP_PALETTE }) {
  const emitter = useRef(), warm = useRef();
  const initial = useRef(night ? 1 : 0).current, mix = useRef(initial);
  const target = useMemo(() => {
    const object = new THREE.Object3D();
    object.position.fromArray(LAMP_LIGHT.target);
    return object;
  }, []);
  useFrame((_, dt) => {
    mix.current = advanceLamp(mix.current, night, reduced, dt);
    if (emitter.current) emitter.current.emissiveIntensity = LAMP_LIGHT.emission * mix.current;
    if (warm.current) warm.current.intensity = LAMP_LIGHT.intensity * mix.current;
  });
  return (
    <group
      position={LAMP_LIGHT.position}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta < 6) onToggle();
      }}
    >
      <Lathe
        points={[
          [0, 0],
          [0.33, 0],
          [0.36, 0.025],
          [0.35, 0.07],
          [0.28, 0.105],
          [0, 0.105],
        ]}
        color={palette.lamp}
      />
      <Rod a={[0, 0.1, 0]} b={[0.03, 1.03, -0.12]} r={0.035} />
      <Rod a={[0.07, 0.1, 0]} b={[0.1, 1.03, -0.12]} r={0.017} />
      <Rod a={[0.03, 1.03, -0.12]} b={[-0.55, 1.76, -0.15]} r={0.028} />
      <Rod a={[0.1, 1.03, -0.12]} b={[-0.46, 1.76, -0.15]} r={0.02} />
      {[
        [0.05, 1.03, -0.12],
        [-0.51, 1.76, -0.15],
      ].map((p, i) => (
        <mesh key={i} position={p} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.072, 0.072, 0.12, 24]} />
          <meshStandardMaterial
            color="#888e90"
            metalness={0.7}
            roughness={0.25}
          />
        </mesh>
      ))}
      <group name="lamp-head" position={LAMP_LIGHT.head} rotation={[LAMP_LIGHT.pitch, 0, LAMP_LIGHT.tilt]}>
        <Lathe
          points={[
            [0.07, 0.1],
            [0.11, 0.08],
            [0.29, -0.22],
            [0.3, -0.25],
            [0.28, -0.26],
            [0.09, 0.045],
          ]}
          color={palette.lamp}
        />
        {/* Front face points out/down; recess stays inside the existing inner wall. */}
        <mesh name="lamp-diffuser" position={[0, LAMP_LIGHT.diffuserY, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[LAMP_LIGHT.diffuserRadius, 48]} />
          <meshStandardMaterial
            color="#eee8da"
            roughness={.82}
            metalness={0}
            emissive={LAMP_LIGHT.color}
            emissiveIntensity={LAMP_LIGHT.emission * initial}
            ref={emitter}
          />
        </mesh>
        {/* Just outside the lip, aimed along the opening normal; no shade leak. */}
        <spotLight
          ref={warm}
          position={LAMP_LIGHT.source}
          target={target}
          intensity={LAMP_LIGHT.intensity * initial}
          color={LAMP_LIGHT.color}
          angle={LAMP_LIGHT.angle}
          penumbra={LAMP_LIGHT.penumbra}
          distance={LAMP_LIGHT.distance}
          decay={LAMP_LIGHT.decay}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-near={.035}
          shadow-normalBias={.008}
          shadow-bias={-.0001}
          shadow-radius={4}
        />
        <primitive object={target} />
      </group>
      <Body
        size={[0.1, 0.02, 0.07]}
        position={[0.16, 0.103, 0.04]}
        color="#6b7274"
        radius={0.012}
      />
    </group>
  );
}
export function Printer({ progress, onResume, occluderRef, palette = PROP_PALETTE }) {
  const roller = useRef(),
    indicator = useRef();
  useFrame(() => {
    const feeding = progress.current > 0 && progress.current < 1;
    if (roller.current) roller.current.rotation.y = progress.current * 12;
    if (indicator.current)
      indicator.current.emissiveIntensity = feeding ? 2 : 0;
  });
  return (
    <group
      ref={occluderRef}
      position={PRINTER.position}
      scale={PRINTER.scale}
      rotation={[0, PRINTER.rotation, 0]}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta < 6) onResume();
      }}
    >
      <Body size={[1.26, 0.53, 0.92]} position={[0, 0.29, 0]} radius={0.095} color={palette.printer} />
      <Body
        size={[1.19, 0.045, 0.84]}
        position={[0, 0.576, -0.015]}
        color={palette.lid}
      />
      <Body
        size={[1.08, 0.042, 0.49]}
        position={[0, 0.609, -0.02]}
        color={palette.inset}
        radius={0.02}
      />
      <Body
        size={[0.82, 0.014, 0.015]}
        position={[0, 0.637, 0.19]}
        color={palette.trim}
      />
      <Body
        size={[1.1, 0.13, 0.025]}
        position={[0, 0.2, 0.47]}
        color="#3b4242"
        radius={0.025}
      />
      <Body
        size={[1.1, 0.025, 0.49]}
        position={[0, 0.126, 0.64]}
        color="#b7c0c1"
        radius={0.02}
      />
      <Body
        size={[0.86, 0.018, 0.36]}
        position={[0, 0.14, 0.71]}
        color="#e0e3df"
        radius={0.01}
      />
      {[...Array(12)].map((_, i) => (
        <Body
          key={i}
          size={[0.009, 0.12, 0.19]}
          position={[0.632, 0.27, -0.29 + i * 0.03]}
          color="#9ca5a5"
          radius={0.002}
        />
      ))}
      <mesh position={[0.44, 0.526, 0.405]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.02, 12]} />
        <meshStandardMaterial
          color="#a3b9a8"
          emissive="#78dcb9"
          ref={indicator}
        />
      </mesh>
      <group position={[0, 0.19, 0.484]} rotation={[0, 0, Math.PI / 2]}>
        <group ref={roller}>
          <mesh>
            <cylinderGeometry args={[0.024, 0.024, 0.87, 16]} />
            <meshStandardMaterial color="#667172" />
          </mesh>
          <mesh position={[0.024, 0, 0]}>
            <boxGeometry args={[0.002, 0.85, 0.006]} />
            <meshStandardMaterial color="#384343" />
          </mesh>
        </group>
      </group>
      {/* Support the unchanged casing at y=.0725 with four recessed rubber feet. */}
      {[-.48,.48].flatMap(x=>[-.32,.32].map(z=><Body key={`${x}-${z}`} name="printer-foot"
        size={[.14,.07,.14]} position={[x,.035-PRINTER.position[1]/PRINTER.scale,z]}
        radius={.016} color="#242a2b" roughness={.92} metalness={0}/>))}
    </group>
  );
}
export function Lighting({ night, reduced }) {
  const amb = useRef(),
    key = useRef(),
    fill = useRef();
  const mix = useRef(night ? 1 : 0);
  const materials = useRef([]),
    scan = useRef(0);
  const colors = useMemo(
    () => ({
      day: new THREE.Color("#f2f1ec"),
      night: new THREE.Color("#111923"),
      floorDay: new THREE.Color("#e7e6e0"),
      floorNight: new THREE.Color("#222a33"),
    }),
    [],
  );
  useFrame(({ scene, gl }, dt) => {
    mix.current = THREE.MathUtils.lerp(
      mix.current,
      night ? 1 : 0,
      reduced ? 1 : 1 - Math.exp(-5 * Math.min(dt, 0.05)),
    );
    const t = mix.current;
    scan.current += dt;
    if (!materials.current.length || scan.current > 1) {
      const found = new Set();
      scene.traverse((o) => {
        if (o.isMesh)
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            if (m?.isMeshStandardMaterial) found.add(m);
      });
      materials.current = [...found];
      scan.current = 0;
    }
    for (const m of materials.current) m.envMapIntensity = 0.65 - 0.47 * t;

    gl.setClearColor(colors.day.clone().lerp(colors.night, t), 0);
    amb.current.intensity = 1.1 - 0.72 * t;
    key.current.intensity = 4 - 3.58 * t;
    fill.current.intensity = 1.1 - 0.38 * t;
    gl.toneMappingExposure = 1 - 0.18 * t;
  });
  return (
    <>
      <ambientLight ref={amb} />
      <directionalLight
        ref={key}
        position={[-3, 12, 4]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-8.8}
        onUpdate={light => light.shadow.camera.updateProjectionMatrix()}
        shadow-normalBias={0.004}
        shadow-radius={2}
      />
      <directionalLight ref={fill} color="#d5e6ff" position={[4, 4, -4]} />

    </>
  );
}
