import {useMemo,useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {keyboardKeys} from './keyboardLayout';
export default function KeyboardLegends({night,reduced}) {
  const material=useRef(),spill=useRef();
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;
    const ctx=canvas.getContext('2d');ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#d3d6d8';
    for(const k of keyboardKeys){if(k.label==='space')continue;ctx.font=`${k.label.length>2?18:24}px -apple-system, BlinkMacSystemFont, sans-serif`;ctx.fillText(k.label,(k.x+1.3)/2.6*2048,(k.z+.825)/1.08*1024);}
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return map;
  },[]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  useFrame((_,dt)=>{const a=reduced?1:1-Math.exp(-7*Math.min(dt,.05));if(material.current)material.current.emissiveIntensity=THREE.MathUtils.lerp(material.current.emissiveIntensity,night?.85:0,a);if(spill.current)spill.current.intensity=THREE.MathUtils.lerp(spill.current.intensity,night?.09:0,a);});
  return <>
    <mesh position={[0,.066,-.285]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[2.6,1.08]}/><meshStandardMaterial ref={material} map={texture} emissiveMap={texture} emissive="#f0f4ff" emissiveIntensity={0} transparent depthWrite={false} roughness={.75} toneMapped={false}/>
    </mesh>
    <pointLight ref={spill} position={[0,.18,-.28]} color="#d9e5ff" intensity={0} distance={1.5} decay={2}/>
  </>;
}
