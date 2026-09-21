import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { CABINET, DRAWERS, createDrawerMotion, advanceDrawer, drawerHandlers } from './drawers';

function Part({ size, position, color = '#4b3c33', radius = .018, ...props }) {
  return <RoundedBox args={size} position={position} radius={Math.min(radius,...size.map(n=>n*.45))} smoothness={2} castShadow receiveShadow {...props}>
    <meshStandardMaterial color={color} roughness={.78} metalness={0}/>
  </RoundedBox>;
}
function CableCoil() {
  const geometry=useMemo(()=>{
    class Coil extends THREE.Curve {
      getPoint(t, target=new THREE.Vector3()) {
        const a=t*Math.PI*6, r=.13+t*.16;
        return target.set(Math.sin(a)*r,0,Math.cos(a)*r);
      }
    }
    return new THREE.TubeGeometry(new Coil(),108,.024,6,false);
  },[]);
  return <mesh name="coiled-cable" geometry={geometry} position={[-.33,.024,-.8]} castShadow receiveShadow>
    <meshStandardMaterial color="#242c30" roughness={.85}/>
  </mesh>;
}
function Contents({ id, floor }) {
  // Proposed decorative props, not an inventory of the owner's possessions.
  const paper = '#d9d4c7', caseColor = '#343b40';
  if(id===0) return <group name="top-contents" position={[0,floor,.5]}>
    {[.007,.113].map(y=><Part key={y} name="blank-notebook-cover" size={[.76,.014,1.04]} position={[-.265,y,-.76]} color="#637477" radius={.006}/>)}
    <Part name="notebook-spine" size={[.035,.12,1.04]} position={[-.6275,.06,-.76]} color="#637477" radius={.008}/>
    <Part name="notebook-pages" size={[.70,.092,.98]} position={[-.25,.060,-.76]} color={paper} radius={.006}/>
    <Part name="pencil" size={[.046,.046,.87]} position={[.22,.023,-.75]} color="#ae8858" radius={.015}/>
    <Part name="pencil-tip" size={[.027,.031,.10]} position={[.22,.017,-.265]} color="#454743" radius={.012}/>
    <Part name="memory-card-case" size={[.32,.09,.42]} position={[.48,.045,-.71]} color={caseColor}/>
    <Part name="case-seam" size={[.324,.008,.424]} position={[.48,.046,-.71]} color="#788083" radius={.008}/>
  </group>;
  if(id===1) return <group name="middle-contents" position={[0,floor,.5]}>
    <CableCoil/>
    <Part name="cable-lead" size={[.044,.044,.30]} position={[-.33,.024,-.36]} color={caseColor}/>
    <Part name="cable-plug" size={[.10,.065,.17]} position={[-.33,.034,-.135]} color="#707b7e"/>
    <Part name="portable-drive" size={[.48,.13,.78]} position={[.38,.065,-.78]} color="#899495" radius={.05}/>
  </group>;
  return <group name="bottom-contents" position={[0,floor,.5]}>
    {[0,1,2,3].map(i=><Part key={i} name={`blank-paper-${i}`} size={[1.04,.025,1.42]} position={[-.04+i*.012,.0125+i*.025,-.84]} color={i%2?paper:'#e8e5dc'} radius={.005}/>)}
    <Part name="plain-folder" size={[1.15,.035,1.52]} position={[.02,.1175,-.86]} color="#ac9370" radius={.009}/>
    <Part name="folder-tab" size={[.35,.035,.12]} position={[-.30,.1175,-1.665]} color="#ac9370" radius={.009}/>
  </group>;
}
export function Drawer({ spec, open=false, enabled=false, reduced=false, input, onToggle=()=>{}, shadow, audio }) {
  const node=useRef(), motion=useMemo(()=>createDrawerMotion(open),[]);
  const fallback=useRef({drawerHover:null,drawerPress:null,dragging:false});
  useEffect(()=>()=>audio?.detach(spec.id),[audio,spec.id]);
  useFrame((_,dt)=>{
    if (!motion.moving && motion.target === (open ? 1 : 0)) { audio?.present(spec.id,motion,motion.value,dt,reduced); return; }
    const wasMoving=motion.moving, prior=motion.value;
    const value=advanceDrawer(motion,open,reduced,dt);
    if(node.current && value!==prior) node.current.position.z=CABINET.travel*value;
    audio?.present(spec.id,motion,prior,dt,reduced);
    if(shadow) {
      if(motion.moving) shadow.current.moving.add(spec.id);
      else if(shadow.current.moving.delete(spec.id) || wasMoving || value!==prior) shadow.current.revision++;
    }
  }, -1); // Advance all drawers before the priority-zero contact capture.
  const floor=-spec.height/2+.16;
  const handlers=drawerHandlers(spec.id,input||fallback.current,enabled,onToggle);
  return <group name={`drawer-${spec.id}`} ref={node} position={[CABINET.x,spec.y,CABINET.travel*motion.value]}>
    <group position={[0,0,0]}>
      <Part name="tray-bottom" size={[1.49,.10,3.29]} position={[0,floor-.05,-.37]} color="#80725f"/>
      {[-1,1].map(s=><Part key={s} name={`tray-side-${s}`} size={[.085,.59,3.29]} position={[s*.7025,floor+.295,-.37]} color="#80725f"/>)}
      <Part name="tray-back" size={[1.32,.59,.085]} position={[0,floor+.295,-1.9725]} color="#80725f"/>
      {/* Front/handle are the only event-bearing meshes. Real geometry is the hit area. */}
      <Part name="drawer-front" size={[1.73,spec.height,.05]} position={[0,0,1.30]} color="#625043" radius={.02} userData={{drawerTrigger:spec.id}} {...handlers}/>
      <Part name="drawer-handle" size={[.62,.045,.09]} position={[0,.38,1.35]} color="#a4a6a2" radius={.015} userData={{drawerTrigger:spec.id}} {...handlers}/>
      <Contents id={spec.id} floor={floor}/>
    </group>
  </group>;
}
export default function DrawerCabinet({ open=[false,false,false], enabled=false, reduced=false, input, onToggle, shadow, audio }) {
  return <group name="drawer-cabinet">
    {/* Retain original 1.85 × 5.88 × 3.55 envelope; the front is truly open. */}
    {[-1,1].map(s=><Part key={s} name={`cabinet-side-${s}`} size={[.12,5.88,3.55]} position={[CABINET.x+s*.865,-3.16,-.5]} radius={.03}/>)}
    <Part name="cabinet-header" size={[1.61,.28,.06]} position={[CABINET.x,-.48,1.245]}/>
    <Part name="cabinet-back" size={[1.61,5.64,.12]} position={[CABINET.x,-3.16,-2.215]}/>
    {[-.28,-6.04].map(y=><Part key={y} name="cabinet-cap" size={[1.61,.12,3.55]} position={[CABINET.x,y,-.5]}/>)}
    {[[-2.15,.20],[-3.965,.23]].map(([y,h])=><Part key={y} name="cabinet-cross-front" size={[1.61,h,.06]} position={[CABINET.x,y,1.245]}/>)}
    {[-2.16,-4.05].map(y=><Part key={y} name="cabinet-divider" size={[1.61,.08,3.39]} position={[CABINET.x,y,-.48]}/>)}
    {DRAWERS.map(spec=><group key={spec.id}>
      {[-1,1].map(s=><Part key={s} name={`rail-${spec.id}-${s}`} size={[.035,.07,3.1]} position={[CABINET.x+s*.7775,spec.y-spec.height/2+.22,-.4]} color="#707572" radius={.008}/>)}
    </group>)}
    {DRAWERS.map(spec=><Drawer key={spec.id} spec={spec} open={open[spec.id]} enabled={enabled} reduced={reduced} input={input} onToggle={onToggle} shadow={shadow} audio={audio}/>)}
  </group>;
}
