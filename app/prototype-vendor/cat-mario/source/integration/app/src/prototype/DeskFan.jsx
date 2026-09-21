import React,{useMemo,useRef,useEffect} from 'react';
import * as THREE from 'three';
import {useFrame} from '@react-three/fiber';
import {FAN,createFanMotion,advanceFan,fanMotionVisible} from './fanMotion';
import {fanParts,streamerGeometry,deformStreamers} from './fanGeometry';
import {fanHandlers} from './fanInput';
let nextFanInstance=0;
export default function DeskFan({audio,on=true,onToggle=()=>{},enabled=false,snapshot,view='desk',active=true,direct=false,reduced=false,input}){
 const parts=useMemo(fanParts,[]),strips=useMemo(streamerGeometry,[]),motion=useMemo(createFanMotion,[]);
 const head=useRef(),rotor=useRef(),fallback=useRef({hidden:false,dragging:false}),state=input||fallback.current;
 useEffect(()=>()=>{parts.forEach(p=>p.geometry.dispose());strips.dispose();},[parts,strips]);
 const instance=useMemo(()=>++nextFanInstance,[]),frames=useRef({count:0,min:Infinity,max:0});
 useEffect(()=>{state.trace?.record('fan-lifecycle',{instance,reason:'mounted'});return()=>state.trace?.record('fan-lifecycle',{instance,reason:'unmounted'});},[state,instance]);
 const suspension=useRef(state.fanSuspendVersion || 0);
 useEffect(()=>{if(reduced||direct||!active)motion.suspended=true;},[motion,reduced,direct,active]);
 useFrame((frame,dt)=>{
  if(suspension.current!==(state.fanSuspendVersion || 0)){motion.suspended=true;suspension.current=state.fanSuspendVersion || 0;}
  const changed=advanceFan(motion,on,reduced,fanMotionVisible(view,active,direct,state.hidden),dt);
  if(snapshot){const time=frame.clock?.elapsedTime??0;const previous=snapshot.current?.current||{time:time-Math.max(0,dt),yaw:motion.yaw,power:motion.power};snapshot.current={previous,current:{time,yaw:motion.yaw,power:motion.power}};}
  if(state.trace?.enabled){
   const summary=frames.current;summary.count++;summary.min=Math.min(summary.min,dt);summary.max=Math.max(summary.max,dt);
   state.trace.sample('fan-frame',{instance,frames:summary.count,dt,minDelta:summary.min,maxDelta:summary.max,view,on,active,direct,reduced,hidden:!!state.hidden,power:motion.power,phase:motion.phase,spin:motion.spin,updates:motion.updates,suspended:motion.suspended,reason:reduced?'reduced':!active?'entry':direct?'direct':state.hidden?'hidden':!Number.isFinite(dt)||dt<0||dt>FAN.staleDelta?'stale-delta':changed?'advanced':motion.power===0&&!on?'off-zero':'resume-frame'});
  }else {frames.current.count=0;frames.current.min=Infinity;frames.current.max=0;}
  if(!changed)return;
  head.current.rotation.y=motion.yaw;rotor.current.rotation.z=motion.spin;
  deformStreamers(strips,motion.power,motion.flutter);
  audio?.power(motion.power);
 },-1);
 const handlers=fanHandlers(state,enabled,onToggle);
 const mesh=p=><mesh key={p.name} name={p.name} geometry={p.geometry} castShadow={!!p.cast} receiveShadow userData={{fanOwned:true}}>
   <meshStandardMaterial color={p.owner==='indicator'?(on?'#b7c39a':'#4b5450'):p.color} roughness={p.metalness?.48:.62} metalness={p.metalness??.16} side={THREE.DoubleSide}/>
  </mesh>;
 return <group name="desk-fan" position={FAN.position} {...handlers}>
  {parts.filter(p=>p.owner==='fixed'||p.owner==='indicator').map(mesh)}
  <group name="fan-yaw" ref={head} position={FAN.pivot} rotation={[0,motion.yaw,0]}>
   <group name="fan-head" position={FAN.head}>
    {parts.filter(p=>p.owner==='head').map(mesh)}
    <group name="fan-rotor" ref={rotor}>{parts.filter(p=>p.owner==='rotor').map(mesh)}</group>
    <mesh name="fan-streamers" geometry={strips} raycast={()=>{}} receiveShadow>
      <meshStandardMaterial color="#e6b52c" roughness={.92} metalness={0} side={THREE.DoubleSide}/>
    </mesh>
   </group>
  </group>
 </group>;
}
