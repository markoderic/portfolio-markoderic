import React,{useMemo,useEffect} from 'react';
import {CLOCK,clockParts,clockDisplayGeometry,setClockSegments} from './clockGeometry';
import {useLocalClock} from './LocalClockTime';
function ClockDigits({night,enabled,clock}){
 const display=useMemo(clockDisplayGeometry,[]),reading=useLocalClock(enabled,clock);
 useMemo(()=>setClockSegments(display,reading),[display,reading.key]);
 useEffect(()=>()=>display.geometry.dispose(),[display]);
 return <mesh name="clock-segments" geometry={display.geometry}><meshBasicMaterial vertexColors color={night?[CLOCK.night,CLOCK.night,CLOCK.night]:[CLOCK.day,CLOCK.day,CLOCK.day]} toneMapped={false}/></mesh>;
}
export default function DeskClock({night=false,enabled=true,clock}){
 const parts=useMemo(clockParts,[]);useEffect(()=>()=>parts.forEach(p=>p.geometry.dispose()),[parts]);
 return <group name="desk-clock" position={CLOCK.position} rotation={[0,CLOCK.yaw,0]}>
  {parts.map(p=><mesh key={p.name} name={p.name} geometry={p.geometry} castShadow={!!p.cast} receiveShadow>
   <meshStandardMaterial color={p.color} roughness={p.roughness} metalness={.04} transparent={!!p.opacity} opacity={p.opacity??1} depthWrite={!p.opacity}/>
  </mesh>)}
  <ClockDigits night={night} enabled={enabled} clock={clock}/>
 </group>;
}
