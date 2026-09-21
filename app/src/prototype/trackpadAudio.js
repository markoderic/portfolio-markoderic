import {playSound} from './sound';
// Own only physical-pad transients. The existing synthesis/context stays shared.
export function createTrackpadAudio(read,play=playSound){
  let mounted=false,epoch=0,hidden=false,stop=null;
  const valid=()=>{const s=read();return mounted&&!hidden&&s.enabled&&!s.preferences.muted&&s.preferences.volume>0;};
  const cancel=()=>{epoch++;stop?.();stop=null;};
  return {
    mount(){mounted=true;},
    cancel,
    sync(){if(!valid())cancel();},
    pageHidden(value){hidden=value;if(value)cancel();},
    async press(){
      if(!valid())return;
      cancel();
      const token=epoch;
      const current=()=>token===epoch&&valid();
      // Input consumes each gesture before this call. Do not depend on click debounce.
      try {
        const cleanup=await play('click',read().preferences,{valid:current,read:()=>read().preferences,deduplicated:true});
        if(!current()){cleanup?.();return;}stop=cleanup;
      } catch { /* Audio failure must not interrupt navigation. */ }
    },
    dispose(){mounted=false;cancel();},
  };
}
