import React from "react";
import icons from "./releaseIcons.json";
// Exact primitive paths from the read-only 1.3.2 build 21 Icons.swift.
export default function ReleaseIcon({name,size=20,...props}) {
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{icons[name].map(([Tag,attrs],i)=><Tag key={i} {...attrs}/>)}</svg>;
}
