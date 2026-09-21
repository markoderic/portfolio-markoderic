import React,{useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {productionBatches,PROP_MATERIALS} from './productionPropsGeometry';
export default function ProductionProps(){
 const resources=useMemo(()=>({parts:productionBatches(),materials:Object.fromEntries(Object.entries(PROP_MATERIALS).map(([name,p])=>[name,new THREE.MeshStandardMaterial(p)]))}),[]);
 useEffect(()=>()=>{resources.parts.forEach(p=>p.geometry.dispose());Object.values(resources.materials).forEach(m=>m.dispose());},[resources]);
 return <group name="production-props">{resources.parts.map(p=><mesh key={p.name} name={p.name} geometry={p.geometry} material={resources.materials[p.material]} castShadow receiveShadow/>)}</group>;
}
