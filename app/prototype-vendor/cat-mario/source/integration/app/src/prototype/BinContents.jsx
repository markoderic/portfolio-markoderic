import React, {useMemo,useEffect} from 'react';
import * as THREE from 'three';
import {BIN_PAPERS,paperGeometry,peelGeometry} from './binGeometry';
export default function BinContents(){
  const papers=useMemo(()=>BIN_PAPERS.map(p=>paperGeometry(p.seed,p.scale)),[]);
  const peel=useMemo(peelGeometry,[]);
  const material=useMemo(()=>new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,metalness:0,side:THREE.DoubleSide}),[]);
  useEffect(()=>()=>{papers.forEach(g=>g.dispose());peel.dispose();material.dispose();},[papers,peel,material]);
  return <group name="bin-contents">
    {papers.map((g,i)=><mesh key={i} name={`bin-paper-${i}`} geometry={g} material={material} position={BIN_PAPERS[i].position} castShadow receiveShadow/>)}
    <mesh name="bin-peel" geometry={peel} material={material} castShadow receiveShadow/>
  </group>;
}
