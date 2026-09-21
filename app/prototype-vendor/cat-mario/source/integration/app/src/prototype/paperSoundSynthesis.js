import {PRINT_TIMING} from './sceneInteraction';
export const PAPER_SOUND=Object.freeze({crumpleSeconds:PRINT_TIMING.crumple/1000,contactSeconds:.16,crumpleLevel:.32,contactLevel:.28,crumpleFilter:5200,contactFilter:1900,release:.035});
export function paperSamples(rate,kind){
 const duration=kind==='crumple'?PAPER_SOUND.crumpleSeconds:PAPER_SOUND.contactSeconds,data=new Float32Array(Math.ceil(rate*duration));
 let seed=kind==='crumple'?72491:8913,low=0;
 for(let i=0;i<data.length;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1,t=i/rate;
  low+=(1-Math.exp(-2*Math.PI*750/rate))*(noise-low);
  const edge=Math.min(1,t/.003,(duration-t)/.014);
  if(kind==='crumple'){
   // Uneven overlapping compression folds, high-passed dry fiber and tiny cracks.
   let folds=.06;for(const [at,width,level] of [[.017,.009,.55],[.052,.015,.4],[.089,.007,.7],[.123,.019,.48],[.166,.011,.6]])folds+=level*Math.exp(-(((t-at)/width)**2));
   data[i]=(noise-low)*folds*edge*.65;
  }else{
   const cushion=noise*Math.exp(-t*55)*.48,body=Math.sin(2*Math.PI*155*t)*Math.exp(-t*42)*.17;
   data[i]=(cushion+body)*edge;
  }
 }
 return data;
}
