import {localPointer} from './windowState';
export function desktopDragPoint(host,x,y){
 try{if(!host)return null;const p=localPointer(host,x,y);return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)?p:null;}catch{return null;}
}
export function desktopPoint(host,x,y,size){
 const p=desktopDragPoint(host,x,y);return p?{x:Math.max(0,Math.min(size.width,p.x)),y:Math.max(0,Math.min(size.height,p.y))}:null;
}
export const selectionRect=(a,b)=>({x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(b.x-a.x),height:Math.abs(b.y-a.y)});
// Inclusive intersection of each actual logical button box, including its label.
export const selectedIn=(rect,bounds,base=[])=>[...new Set([...base,...bounds.filter(b=>b.x<=rect.x+rect.width&&b.x+b.width>=rect.x&&b.y<=rect.y+rect.height&&b.y+b.height>=rect.y).map(b=>b.id)])];
export function selectionModifier(e){
 const mac=/mac|iphone|ipad/i.test(globalThis.navigator?.userAgentData?.platform||globalThis.navigator?.platform||'');
 if(e.ctrlKey&&mac)return 'context';
 if(e.metaKey||e.ctrlKey)return 'toggle';
 return e.shiftKey?'add':null;
}
