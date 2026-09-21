// Wall-clock conversion and one shared, lifecycle-owned minute scheduler.
export const DIGIT_SEGMENTS=['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];
export function localClockReading(date){
 const h=date.getHours(),minute=date.getMinutes(),hour=h%12||12,period=h<12?'AM':'PM';
 const digits=[hour>=10?1:null,hour%10,Math.floor(minute/10),minute%10],label=`${hour}:${String(minute).padStart(2,'0')} ${period}`;
 const dateKey=`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
 return {digits,period,label,datetime:`${String(h).padStart(2,'0')}:${String(minute).padStart(2,'0')}`,key:`${dateKey}/${h}/${minute}/${date.getTimezoneOffset()}`};
}
export function createLocalClock({now=()=>new Date(),setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id),doc=typeof document==='undefined'?null:document,win=typeof window==='undefined'?null:window}={}){
 const listeners=new Set();let timer=null,reading=null;
 const cancel=()=>{if(timer!==null){clearTimer(timer);timer=null;}};
 const sample=()=>{const date=now(),next=localClockReading(date);if(!reading||next.key!==reading.key){reading=next;for(const fn of listeners)fn(reading);}return date;};
 function refresh(){cancel();if(!listeners.size||doc?.hidden)return;const date=sample();if(listeners.size&&!doc?.hidden){const delay=60000-(date.getSeconds()*1000+date.getMilliseconds());timer=setTimer(()=>{timer=null;refresh();},delay);}}
 const visibility=()=>{if(doc?.hidden)cancel();else refresh();};
 return {
  read(){return localClockReading(now());},
  subscribe(fn){const first=listeners.size===0;listeners.add(fn);if(first){doc?.addEventListener('visibilitychange',visibility);win?.addEventListener('focus',refresh);win?.addEventListener('pageshow',refresh);}const previous=reading;refresh();if(!doc?.hidden&&reading===previous&&reading)fn(reading);
   let subscribed=true;return ()=>{if(!subscribed)return;subscribed=false;listeners.delete(fn);if(!listeners.size){cancel();doc?.removeEventListener('visibilitychange',visibility);win?.removeEventListener('focus',refresh);win?.removeEventListener('pageshow',refresh);reading=null;}};
  },
 };
}
export const localClock=createLocalClock();
