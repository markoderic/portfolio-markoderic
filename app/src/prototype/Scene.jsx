import {createCameraApproach} from "./cameraApproach";
import {createDisplayOptics} from "./displayOptics";
import {binHandlers} from "./binInput";
import {projectTossTarget} from "./paperTossTarget";
import {tossReadiness} from "./paperTossInvitation";
import PaperTossBall from "./PaperTossBall";
import {createTossCamera} from "./paperTossCamera";
import ProductionProps from "./ProductionProps";
import DeskClock from "./DeskClock";
import { clearFanInput } from "./fanMotion";
import DeskFan from "./DeskFan";
import { drawerAllowed, clearDrawerInput } from "./drawers";
import { createArrivalClock, entryCameraFrame, presentEntryExit } from "./entryCamera";
import TabletopShadows from "./TabletopShadows";
import GroundShadows from "./GroundShadows";
import { DESK_CAMERA, createDeskInput, createDeskMotion, updateDeskMotion } from "./deskCamera";
import LaptopModel from "./LaptopModel";
import { Suspense, useMemo, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  RoundedBox,
  Environment,
  Lightformer,
  useTexture,
} from "@react-three/drei";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  Chair,
  Plant as StudioPlant,
  Lamp,
  Printer,
  Lighting,
  Body,
  Desk,
  Bin,
  BIN_POSITION,
} from "./StudioProps";
import phoneModelUrl from "./assets/phone-workspace.glb?url";
import paperUrl from "./assets/resume-page.png";
import { FLOOR_Y, PRINTER } from "./sceneScale";
import { fitPaper, paperFeedPosition, PAPER_WIDTH, PAPER_HEIGHT } from "./paperGeometry";
import {
  projectScreen,
  maskPhone,
  maskPaper,
} from "./screenProjection";

import { applyDisposalPose, disposalCurve, crumpleAmount, keepPaperAboveDesk, PAPER_REST } from "./paperDisposal";
import { acknowledgePaperMotion } from "./sceneInteraction";
import { maskPrinter } from "./printerOcclusion";
import { LAPTOP, PHONE } from "./deviceGeometry";
function Solid({
  size,
  position,
  color = "#989fa4",
  radius = 0.03,
  metalness = 0.65,
  roughness = 0.33,
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
function PhoneModel({ onStageReady }) {
  const { scene } = useGLTF(phoneModelUrl);
  useEffect(() => {
    onStageReady("phone");
  }, [onStageReady]);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const scale = 1.38 / box.getSize(new THREE.Vector3()).y;
    const center = box.getCenter(new THREE.Vector3());
    clone.scale.setScalar(scale);
    clone.position.copy(center.multiplyScalar(-scale));
    clone.traverse((o) => {
      if (o.isMesh) {
        // One live aperture replaces the original wallpaper; keep a neutral glass
        // backing behind it, rather than a second reflective display surface.
        if (o.material?.name === "pIJKfZsazmcpEiU") o.visible = false;
        if (o.material?.name === "zFdeDaGNRwzccye")
          o.material = new THREE.MeshBasicMaterial({ color: "#090c0e" });
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);
  return (
    <group rotation={[0, Math.PI, 0]}>
      <primitive object={model} />
    </group>
  );
}

function Phone({ onSelect, pivot, screen, onStageReady }) {
  const display = useMemo(() => {
    const shape = new THREE.Shape(PHONE.outline.map(([x, y]) => new THREE.Vector2(x, y)));
    // Leave the original camera/island geometry uncovered when the HTML sleeps.
    // It occupies the same front plane; a filled backing here would overlap it.
    shape.holes.push(new THREE.Path([...PHONE.cameraOutline].reverse()
      .map(([x, y]) => new THREE.Vector2(x, y))));
    return new THREE.ShapeGeometry(shape);
  }, []);
  return (
    <group
      ref={pivot}
      position={PHONE.desk}
      rotation={[-Math.PI / 2, 0, -0.23]}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta < 6) onSelect("phone");
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <Suspense
        fallback={<Solid size={[0.672, 1.38, 0.106]} color="#41464a" />}
      >
        <PhoneModel onStageReady={onStageReady} />
      </Suspense>
      <mesh ref={screen} position={PHONE.position} geometry={display}>
        <meshBasicMaterial color="#0b0d0e" />
      </mesh>
    </group>
  );
}
function Rig({
  entry,
  onArrivalComplete,
  orbit,
  deskInput,
  toss,
  tossReady,
  tossStatus,
  onTossEnter,
  fanSnapshot,
  drawerShadow,
  deskPaused = false,
  deskBlocked = false,
  completedPage,
  view,
  direct,
  reduced,
  hosts,
  layout,
  onSettled,
  laptop,
  phone,
  pivot,
  paper,
  printer,
  printProgress,
  printMotion,
  paperAudio,
}) {
  const scratch = useMemo(
    () => ({
      position: new THREE.Vector3(),
      look: new THREE.Vector3(),
      target: new THREE.Vector3(0, 0.2, 0),
      normal: new THREE.Vector3(),
      up: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      phoneQ: new THREE.Quaternion(),
      phoneP: new THREE.Vector3(),
      paperP: new THREE.Vector3(),
      paperQ: new THREE.Quaternion(),
    }),
    [],
  );
  const deskMotion = useMemo(createDeskMotion, []);
  const tossCamera = useMemo(createTossCamera, []);
  const displayOptics = useMemo(createDisplayOptics, []);
  const eligibility = useRef(false), readinessReason = useRef(null);
  const arrivalClock = useMemo(createArrivalClock, []);
  const approach = useMemo(createCameraApproach, []);
  const fallbackInput = useRef(createDeskInput());
  const previous = useRef("");
  const disposal = useRef(null);
  useFrame(({ camera, size, scene, gl, clock }, dt) => {
    if (!laptop.current || !phone.current || !pivot.current) return;
    const input = deskInput?.current || fallbackInput.current;
    const frameDelta = !input.hidden && dt >= 0 && dt <= DESK_CAMERA.maxDelta ? dt : 0;
    const a = reduced ? 1 : 1 - Math.exp(-7.5 * Math.min(frameDelta, .05));
    scratch.phoneP.set(...(view === "phone" ? PHONE.picked : PHONE.desk));
    scratch.phoneQ.setFromEuler(
      new THREE.Euler(
        ...(view === "phone" ? [0, 0, 0] : [-Math.PI / 2, 0, -0.23]),
      ),
    );
    pivot.current.position.lerp(scratch.phoneP, a);
    pivot.current.quaternion.slerp(scratch.phoneQ, a);
    if (paper.current) {
      const motion = printMotion.current;
      const disposing = ["waiting", "crumple", "toss"].includes(motion.phase);
      if (disposing && (!disposal.current || disposal.current.job !== motion.job))
        disposal.current = {
          job: motion.job,
          position: paper.current.position.clone(),
          quaternion: paper.current.quaternion.clone(),
          curve: disposalCurve(paper.current.position, BIN_POSITION, paper.current.quaternion),
        };
      scratch.paperP.set(
        ...paperFeedPosition(
          view === "printer" ? printProgress.current : completedPage ? 1 : 0,
        ),
      );
      scratch.paperQ.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, PRINTER.rotation));
      if (view === "paper") {
        scratch.paperP.set(...PAPER_REST);
        scratch.paperQ.identity();
      }
      if (view === "printer") {
        paper.current.position.copy(scratch.paperP);
        paper.current.quaternion.copy(scratch.paperQ);
      } else {
        paper.current.position.lerp(scratch.paperP, a);
        paper.current.quaternion.slerp(scratch.paperQ, a);
      }
      if (disposing) {
        applyDisposalPose(paper.current, disposal.current, motion);
      } else {
        disposal.current = null;
        if (view !== "printer") keepPaperAboveDesk(paper.current);
      }
      const crumple =
        motion.phase === "crumple"
          ? crumpleAmount(motion.progress)
          : motion.phase === "toss"
            ? 1
            : 0;
      const positions = paper.current.geometry.attributes.position;
      const original =
        paper.current.userData.original ||
        (paper.current.userData.original = positions.array.slice());
      for (let i = 0; i < positions.count; i++) {
        const x = original[i * 3],
          y = original[i * 3 + 1];
        const theta = x / PAPER_WIDTH * 6.8,
          phi = ((y / (PAPER_HEIGHT/2) + 1) * Math.PI) / 2;
        const radius = PRINTER.scale * (0.105 + 0.018 * Math.sin(i * 7.13));
        positions.setXYZ(
          i,
          THREE.MathUtils.lerp(
            x,
            radius * Math.sin(phi) * Math.cos(theta),
            crumple,
          ),
          THREE.MathUtils.lerp(y, radius * Math.cos(phi), crumple),
          crumple * radius * Math.sin(phi) * Math.sin(theta),
        );
      }
      positions.needsUpdate = true;
      if (crumple || paper.current.userData.crumpled)
        paper.current.geometry.computeVertexNormals();
      paper.current.userData.crumpled = crumple > 0;
      paper.current.visible =
        disposing ||
        completedPage ||
        (view === "printer" && printProgress.current > 0) ||
        view === "paper";
    }
    laptop.current.updateWorldMatrix(true, false);
    const mode = direct ? "desk" : view;
    const entryLocked = !!entry && entry.phase !== "active" && mode === "desk" && !direct;
    const entryFrame = mode === "desk" && !direct
      ? entryCameraFrame(arrivalClock, entry, size, dt, input.hidden, {position:camera.position,look:scratch.target}) : null;
    if (entryLocked) { deskMotion.time = 0; deskMotion.active = false; }
    if (mode !== "desk" || direct) arrivalClock.locked = false;
    const gamePose = tossCamera(toss, deskMotion, input, orbit, size);
    approach.prepare(mode, !entryFrame && !entryLocked && !direct && !reduced && !gamePose);
    const desk = updateDeskMotion(deskMotion, {
      dt, camera, scene, size, input, orbit: orbit.current,
      active: mode === "desk", paused: deskPaused || !!gamePose, blocked: deskBlocked || entryLocked || approach.active,
      reduced, direct,
    });
    if (mode !== "desk" || deskBlocked || entryLocked || direct || input.hidden) { clearDrawerInput(input); clearFanInput(input); }
    if (gl?.domElement) gl.domElement.style.cursor = deskMotion.hover || input.drawerHover != null || input.fanHover ? "pointer" : "";
    if (mode !== "desk") deskMotion.active = false;
    if (mode === "desk") {
      scratch.position.copy((gamePose || desk).position);
      scratch.look.copy((gamePose || desk).look);
    } else if (mode === "paper") {
      scratch.look.set(-2.2, 1.15, 1.7);
      const pageHeight = fitPaper(size).height;
      const distance =
        (PAPER_HEIGHT * size.height) /
        (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * pageHeight);
      scratch.position
        .copy(scratch.look)
        .add(new THREE.Vector3(0, 0, distance));
    } else if (mode === "printer") {
      const disposing = ["waiting", "crumple", "toss"].includes(
        printMotion.current.phase,
      );
      scratch.position.set(
        ...(disposing ? [-9, 4, 11] : [-7.4, 4.4, 7.4]),
      );
      scratch.look.set(
        ...(disposing ? [-4.1, -1.7, 2] : [PRINTER.position[0], .55, .55]),
      );
    } else {
      const dim = mode === "laptop" ? layout.laptop : layout.phone;
      const physicalHeight = mode === "laptop" ? LAPTOP.height : PHONE.height;
      if (mode === "laptop") {
        laptop.current.getWorldPosition(scratch.look);
        laptop.current.getWorldQuaternion(scratch.quaternion);
      } else {
        scratch.look.set(...PHONE.picked).add(new THREE.Vector3(...PHONE.position));
        scratch.quaternion.identity();
      }
      scratch.normal.set(0, 0, 1).applyQuaternion(scratch.quaternion);
      scratch.up.set(0, 1, 0).applyQuaternion(scratch.quaternion);
      const distance =
        (physicalHeight * size.height) /
        (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dim.height);
      // Put the screen between the identity header and persistent navigation.
      const desiredCenter = (size.height - dim.height) / 2 + dim.height / 2;
      scratch.look.addScaledVector(
        scratch.up,
        (-(size.height / 2 - desiredCenter) * physicalHeight) / dim.height,
      );
      scratch.position
        .copy(scratch.look)
        .addScaledVector(scratch.normal, distance);
    }
    const cameraAlpha = reduced ? 1 : mode === "desk" ? 1 - Math.exp(-DESK_CAMERA.response * frameDelta) : a;
    if (entryFrame) {
      scratch.position.copy(entryFrame.position); scratch.look.copy(entryFrame.look);
      camera.position.copy(scratch.position); scratch.target.copy(scratch.look);
    } else if (!approach.frame(camera.position, scratch.target, scratch.position, scratch.look, frameDelta)) {
      camera.position.lerp(scratch.position, cameraAlpha);
      scratch.target.lerp(scratch.look, cameraAlpha);
    }
    presentEntryExit(hosts.entry?.current, entryFrame);
    camera.lookAt(scratch.target);
    camera.updateMatrixWorld();
    const settled =
      (!approach.active || approach.still()) &&
      camera.position.distanceTo(scratch.position) < 0.00015 &&
      scratch.target.distanceTo(scratch.look) < 0.00015 &&
      pivot.current.position.distanceTo(scratch.phoneP) < 0.00015 &&
      pivot.current.quaternion.angleTo(scratch.phoneQ) < 0.00015 &&
      (view !== "paper" ||
        (paper.current &&
          paper.current.position.distanceTo(scratch.paperP) < 0.00015 &&
          paper.current.quaternion.angleTo(scratch.paperQ) < 0.00015));
    if (settled) {
      approach.reset();
      camera.position.copy(scratch.position);
      scratch.target.copy(scratch.look);
      camera.lookAt(scratch.look);
      pivot.current.position.copy(scratch.phoneP);
      pivot.current.quaternion.copy(scratch.phoneQ);
      if (paper.current && view === "paper") {
        paper.current.position.copy(scratch.paperP);
        paper.current.quaternion.copy(scratch.paperQ);
      }
      camera.updateMatrixWorld();
    }
    // Geometry, camera and CSS are committed in this single frame owner.
    pivot.current.updateWorldMatrix(true, true);
    paper.current?.updateWorldMatrix(true, false);
    const paperMotion = printMotion.current;
    const paperPhysical = !!paper.current?.visible && !direct && !reduced && !input.hidden && (view === "printer" || view === "paper");
    // The zero-progress sheet is intentionally hidden. Its printer pose is
    // already copied above; readiness belongs to this exact committed job/frame,
    // independently of the camera's slower screen/input convergence.
    if (view === "printer" && paper.current && !direct && !reduced && !input.hidden &&
        paperMotion.phase === "feed" && paperMotion.job)
      paperMotion.job.feedPosePresented = paperMotion;
    acknowledgePaperMotion(paperMotion, paperPhysical);
    if (paperPhysical && (paperMotion.phase === "crumple" || paperMotion.phase === "toss")) paperAudio?.present(paperMotion);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    projectScreen(
      hosts.laptop.current,
      laptop.current,
      camera,
      size,
      [LAPTOP.width, LAPTOP.height],
      layout.laptop,
    );
    displayOptics(hosts.paperMask.current, laptop.current, camera, layout.laptop,
      !direct && !input.hidden && hosts.laptop.current?.style.visibility === "visible");
    projectScreen(
      hosts.phone.current,
      phone.current,
      camera,
      size,
      [PHONE.width, PHONE.height],
      layout.phone,
    );
    // Clip the host itself so the glass AND desktop hit region respect printer
    // depth. Phone/paper clips remain nested inside, with their existing owners.
    maskPrinter(hosts.laptop.current, printer.current, camera, laptop.current, layout.laptop);
    maskPhone(
      hosts.mask.current,
      pivot.current,
      camera,
      size,
      laptop.current,
      layout.laptop,
    );
    maskPaper(
      hosts.paperMask.current,
      paper.current,
      camera,
      laptop.current,
      layout.laptop,
    );
    if (paper.current)
      projectScreen(
        hosts.paper.current,
        paper.current,
        camera,
        size,
        [PAPER_WIDTH, PAPER_HEIGHT],
        { width: 850, height: 1100 },
      );
    // Desk drift is intentionally moving but must not hold the scene inert.
    // Focused modes retain their exact fit/phone/page settling rules above.
    if (!entryLocked && !approach.active && mode === "desk" && camera.position.distanceTo(scratch.position) < .03 &&
        scratch.target.distanceTo(scratch.look) < .03 &&
        pivot.current.position.distanceTo(scratch.phoneP) < .00015)
      deskMotion.active = true;
    const interactionSettled = !entryLocked && (mode === "desk" ? deskMotion.active : settled);
    // Navigation already advances the entry token. Re-acknowledge even a rapid
    // desk/laptop round trip completed between frames after parent input clears.
    const state = `${view}:${entry?.token}:${interactionSettled}:${size.width}:${size.height}`;
    if (previous.current !== state) {
      previous.current = state;
      onSettled(interactionSettled ? view : null);
    }
    if(toss){
      const paperReady=!paper.current || (!paper.current.userData.crumpled && paper.current.position.distanceTo(scratch.paperP)<.001 && paper.current.quaternion.angleTo(scratch.paperQ)<.001);
      const status=tossReadiness({view,direct,reduced,entryLocked,hidden:input.hidden,settled:interactionSettled,paperReady,drawersMoving:!!drawerShadow?.current.moving.size,printPhase:printMotion.current.phase});
      const ready=status.ready;
      if(readinessReason.current!==status.reason){readinessReason.current=status.reason;tossStatus?.(status.reason);}
      if(eligibility.current!==ready||toss.available!==ready){eligibility.current=ready;tossReady?.(ready);}
      const gameSettled=!!gamePose&&camera.position.distanceTo(gamePose.position)<.001&&scratch.target.distanceTo(gamePose.look)<.001;
      if(gameSettled){camera.position.copy(gamePose.position);scratch.target.copy(gamePose.look);camera.lookAt(scratch.target);camera.updateMatrixWorld();}
      toss.frame({dt,time:clock?.elapsedTime??0,camera,size,scene,history:fanSnapshot?.current,settled:gameSettled,eligible:ready});
      projectTossTarget(toss,camera,size);
    }
    if (entryFrame?.complete !== undefined) onArrivalComplete?.(entryFrame.complete);
  });
  return null;
}
export default function Scene({
  toss,
  tossReady,
  tossStatus,
  onTossEnter,
  fanOn = true,
  fanAudio,
  onFanToggle,
  drawers,
  onDrawerToggle,
  drawerAudio,
  entry,
  onArrivalComplete,
  orbit,
  deskInput,
  deskPaused = false,
  deskBlocked = false,
  completedPage,
  onPaper,
  view,
  onSelect,
  onTrackpad,
  reduced,
  direct,
  hosts,
  layout,
  onSettled,
  night,
  desktopDark,
  onLamp,
  printProgress,
  printMotion,
  paperAudio,
  onResume,
  onStageReady,
}) {
  const fanSnapshot = useRef();
  const gameActive=!!toss?.active();
  const physical=fn=>(...args)=>{if(!toss?.active())fn?.(...args);};
  const drawerShadow = useRef({ moving: new Set(), revision: 0 });
  const drawerEnabled = drawerAllowed({ view, active: !entry || entry.phase === "active", direct, blocked: deskBlocked });
  const groundCasters = { desk: useRef(), chair: useRef(), plant: useRef(), bin: useRef() };
  const tableCasters = { fan: useRef(), production: useRef(), clock: useRef(), lamp: useRef(), laptop: useRef() };
  const laptop = useRef(),
    phone = useRef(),
    pivot = useRef(),
    paper = useRef(),
    printer = useRef();
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: DESK_CAMERA.eye, fov: 39 }}
      gl={{ antialias: true, alpha: true }}
      aria-label="3D desk with selectable laptop and phone"
      aria-describedby="desk-clock-time"
    >
      <Environment resolution={128} frames={Infinity}>
        <Lightformer
          intensity={3}
          color="#ffffff"
          position={[-3, 4, 1]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[6, 6, 1]}
        />
        <Lightformer
          intensity={2}
          color="#c9def1"
          position={[4, 2, -2]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[4, 5, 1]}
        />
      </Environment>
      <Lighting night={night} reduced={reduced} />
      <Ready onStageReady={onStageReady} />
      <group ref={groundCasters.desk}><Desk drawers={drawers} drawerEnabled={drawerEnabled && !gameActive} reduced={reduced} drawerInput={deskInput?.current} onDrawerToggle={onDrawerToggle} drawerShadow={drawerShadow} drawerAudio={drawerAudio}/></group>
      {/* Decorative fan motion runs during entry; enabled still gates interaction.
          Only the fixed fan base enters the separate tabletop contact cache. */}
      <group ref={tableCasters.fan}><DeskFan snapshot={fanSnapshot} audio={fanAudio} on={fanOn} onToggle={onFanToggle} enabled={drawerEnabled && toss?.phase!=="aiming"} view={view}
        direct={direct} reduced={reduced} input={deskInput?.current}/></group>
      {/* The clamp stops at y=-.68, above the cached ground band (top -2.91). */}
      <group ref={tableCasters.production}><ProductionProps /></group>
      <group ref={tableCasters.clock}><DeskClock night={night} enabled={!direct && (!entry || entry.phase === "active")} /></group>
      <group ref={groundCasters.bin} userData={{tossBin:true}}
        {...binHandlers(deskInput?.current||{},()=>!gameActive&&!direct&&!reduced&&!deskBlocked&&view==="desk"&&!!toss?.available,groundCasters.bin,onTossEnter)}><Bin /></group>
      <TabletopShadows casters={{...tableCasters, printer}} night={night} reduced={reduced} />
      <GroundShadows casters={groundCasters} night={night} reduced={reduced} motion={drawerShadow} />
      <group
        onPointerDown={(e) => {
          e.nativeEvent.sceneObject = true;
        }}
      >
        <group ref={tableCasters.laptop} userData={{ deskTarget: "laptop" }}><LaptopModel onSelect={onSelect} onTrackpad={onTrackpad} input={deskInput.current} enabled={!gameActive && !direct && !deskBlocked && (view === "desk" || view === "laptop" || view === "phone")} screen={laptop} onStageReady={onStageReady} night={night} desktopDark={desktopDark} reduced={reduced} /></group>
        <group userData={{ deskTarget: "phone" }}><Phone
          onSelect={physical(onSelect)}
          pivot={pivot}
          screen={phone}
          onStageReady={onStageReady}
        /></group>
        <group ref={groundCasters.plant}><StudioPlant /></group>
        <group ref={groundCasters.chair}><Chair /></group>
        <group ref={tableCasters.lamp} userData={{ deskTarget: "lamp" }}><Lamp night={night} reduced={reduced} onToggle={physical(onLamp)} /></group>
        <Suspense fallback={null}>
          <group userData={{ deskTarget: "printer" }}><Printer progress={printProgress} onResume={physical(onResume)} occluderRef={printer} /></group>
          <group userData={{ deskTarget: "paper" }}><Paper sheet={paper} onSelect={physical(onPaper)} onStageReady={onStageReady} /></group>
        </Suspense>
      </group>
      {toss && <PaperTossBall game={toss}/>}
      <Rig
        toss={toss}
        tossReady={tossReady}
        tossStatus={tossStatus}
        fanSnapshot={fanSnapshot}
        drawerShadow={drawerShadow}
        entry={entry}
        onArrivalComplete={onArrivalComplete}
        orbit={orbit}
        deskInput={deskInput}
        deskPaused={deskPaused}
        deskBlocked={deskBlocked}
        completedPage={completedPage}
        view={view}
        direct={direct}
        reduced={reduced}
        hosts={hosts}
        layout={layout}
        onSettled={onSettled}
        laptop={laptop}
        phone={phone}
        pivot={pivot}
        paper={paper}
        printer={printer}
        printProgress={printProgress}
        printMotion={printMotion}
        paperAudio={paperAudio}
      />
    </Canvas>
  );
}

function Ready({ onStageReady }) {
  const reported = useRef(false);
  // Wait until the environment capture is committed and
  // the actual environment texture is attached and the procedural desk is mounted.
  useFrame(({ scene }) => {
    if (!reported.current && scene.environment) {
      reported.current = true;
      onStageReady("desk");
    }
  });
  return null;
}

function Paper({ sheet, onSelect, onStageReady }) {
  const texture = useTexture(paperUrl);
  // Core applications are already imported/mounted; this is their remaining
  // initial-view asset. Optional project bundles/video still load when opened.
  useEffect(() => {
    onStageReady("resources");
  }, [onStageReady]);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return (
    <mesh
      ref={sheet}
      position={PAPER_REST}
      visible={false}
      castShadow
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta < 6) onSelect();
      }}
      onPointerDown={(e) => {
        e.nativeEvent.sceneObject = true;
        e.stopPropagation();
      }}
    >
      <planeGeometry args={[PAPER_WIDTH, PAPER_HEIGHT, 16, 20]} />
      <meshStandardMaterial
        map={texture}
        color="#fff"
        roughness={0.94}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
