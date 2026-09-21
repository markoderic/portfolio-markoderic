import React,{useState,useEffect} from 'react';
import {localClock} from './localClock';
export function useLocalClock(enabled=true,clock=localClock){
 const [reading,setReading]=useState(()=>clock.read());
 useEffect(()=>{if(!enabled)return;return clock.subscribe(next=>setReading(old=>old.key===next.key?old:next));},[enabled,clock]);
 return reading;
}
export default function LocalClockTime({enabled=true,clock=localClock}){
 const time=useLocalClock(enabled,clock);
 return <span id="desk-clock-time" style={{position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clipPath:"inset(50%)",whiteSpace:"nowrap",border:0}}>Desk clock — local time: <time dateTime={time.datetime}>{time.label}</time>.</span>;
}
