// Original deterministic synthesis: filtered rail friction and a damped cabinet stop.
// No sampled third-party assets, tonal click or per-frame buffer generation.
export const DRAWER_SOUND = Object.freeze({slideSeconds:.6, contactSeconds:.12,
  slideLevel:.16, openLevel:.12, closeLevel:.16, smoothing:.008, release:.025, speedReference:6});
export const drawerSlideLevel = speed => DRAWER_SOUND.slideLevel * Math.sqrt(Math.min(1, Math.abs(speed)/DRAWER_SOUND.speedReference));
export const drawerContactLevel = (travel, target) => (target ? DRAWER_SOUND.openLevel : DRAWER_SOUND.closeLevel) * Math.min(1, Math.max(0,travel));
export function drawerSamples(rate, kind) {
  const duration=kind==='slide'?DRAWER_SOUND.slideSeconds:DRAWER_SOUND.contactSeconds;
  const data=new Float32Array(Math.ceil(rate*duration));let seed=38419,low=0,body=0;
  const a=1-Math.exp(-2*Math.PI*1800/rate),b=1-Math.exp(-2*Math.PI*180/rate);
  for(let i=0;i<data.length;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const t=i/rate;low+=a*(seed/2147483648-1-low);body+=b*(low-body);
    if(kind==='slide') {
      const seam=Math.min(1,t/.008,(duration-t)/.008);
      data[i]=(low*.55+body*.65)*( .83+.17*Math.sin(2*Math.PI*25*t))*seam;
    } else {
      const edge=Math.min(1,t/.002,(duration-t)/.018);
      data[i]=((low*.7+body*.4)*Math.exp(-t*48)+Math.sin(2*Math.PI*173*t)*Math.exp(-t*65)*.16)*edge;
    }
  }
  return data;
}
