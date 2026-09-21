import React,{useMemo} from 'react';
import GroundShadows from './GroundShadows';
import {TABLETOP_SHADOW,captureTabletopIfNeeded} from './tabletopShadowPass';
// Shares the proven context-loss, opacity transition and disposal lifecycle.
export default function TabletopShadows({casters,night,reduced}){
  const config=useMemo(()=>TABLETOP_SHADOW,[]);
  return <GroundShadows casters={casters} night={night} reduced={reduced}
    config={config} capture={captureTabletopIfNeeded}/>;
}
