import React,{useMemo,useEffect} from 'react';
import {paperGeometry} from './binGeometry';
import {TOSS} from './paperTossPhysics';
export default function PaperTossBall({game}){
 const geometry=useMemo(()=>paperGeometry(7,[TOSS.radius,TOSS.radius,TOSS.radius]),[]);
 useEffect(()=>()=>{geometry.dispose();game.ball=null;},[game,geometry]);
 return <group userData={{tossOwned:true}} visible={game.active()}>
  <mesh ref={node=>{game.ball=node;}} geometry={geometry} position={TOSS.launch} raycast={()=>{}} receiveShadow><meshStandardMaterial vertexColors roughness={.94}/></mesh>
 </group>;
}
