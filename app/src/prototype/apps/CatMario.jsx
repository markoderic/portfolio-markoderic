import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getSoundContext, unlockSound } from '../sound';
import { classicAsset, createClassicRuntime } from './catMarioRuntime';
import { createClassicInput, gameKeys } from './catMarioInput';
import './catMario.css';
export default function CatMario({ gameEligible, gameLifecycle, sound, onMaximize, maximized, claimOpeningFocus }) {
  const detailsToggle=useRef(), resumeFrame=useRef(null), initialLaunch=useRef(true), previousEligible=useRef(gameEligible);
  const [touchControls,setTouchControls]=useState(false);
  const canvas=useRef(), region=useRef(), stage=useRef(), owner=useRef(), input=useRef(), pulseTimers=useRef(new Set());
  const [attempt,setAttempt]=useState(0),[state,setState]=useState({phase:'loading',reason:''}),[fits,setFits]=useState(false),[details,setDetails]=useState(false);
  const latest=useRef();latest.current={gameEligible,sound,fits,details};
  const eligible=()=>{const v=latest.current;return v.gameEligible&&v.fits&&!v.details&&!document.hidden&&document.hasFocus()&&region.current?.contains(document.activeElement);};
  if(!input.current)input.current=createClassicInput((key,down)=>owner.current?.key(key,down));
  const clearInput=()=>{input.current.clear();for(const timer of pulseTimers.current)clearTimeout(timer);pulseTimers.current.clear();};
  const cancelResume=()=>{if(resumeFrame.current!==null)cancelAnimationFrame(resumeFrame.current);resumeFrame.current=null;};
  const pause=reason=>{initialLaunch.current=false;cancelResume();clearInput();owner.current?.pause(reason);};
  const refocus=()=>{
    cancelResume();canvas.current?.focus({preventScroll:true});
    if(!['ready','paused'].includes(owner.current?.phase()))return;
    initialLaunch.current=false;
    if(eligible()){owner.current.start();return;}
    // Parent window activation commits after pointer capture. One fresh gesture
    // gets one frame to see that commit; visibility/eligibility alone never resumes.
    resumeFrame.current=requestAnimationFrame(()=>{resumeFrame.current=null;if(eligible()&&['ready','paused'].includes(owner.current?.phase()))owner.current.start();});
  };
  useLayoutEffect(()=>{
    const stop=()=>pause('Paused — click the game to continue.');
    if(gameLifecycle)gameLifecycle.current=stop;
    if(previousEligible.current&&!gameEligible||details)initialLaunch.current=false;
    previousEligible.current=gameEligible;
    if(!gameEligible||!fits||details){cancelResume();clearInput();owner.current?.pause('Paused — click the game to continue.');}
    else if(initialLaunch.current)claimOpeningFocus?.(canvas.current);
    return ()=>{if(gameLifecycle?.current===stop)gameLifecycle.current=null;};
  },[gameEligible,fits,details,gameLifecycle]);
  useEffect(()=>{
    if(state.phase==='ready'&&initialLaunch.current&&eligible()){
      initialLaunch.current=false;owner.current?.start();
    }
  },[state.phase,gameEligible,fits,details]);
  useEffect(()=>{
    let alive=true;initialLaunch.current=true;setState({phase:'loading',reason:''});
    const instance=createClassicRuntime({canvas:canvas.current,eligible,preferences:()=>latest.current.sound,
      unlock:unlockSound,getContext:getSoundContext,notify:next=>{if(alive){if(next.phase!=='playing')clearInput();setState(next);}}});
    owner.current=instance;
    return ()=>{alive=false;pause();instance.dispose();if(owner.current===instance)owner.current=null;};
  },[attempt]);
  useLayoutEffect(()=>{
    const resize=()=>{const n=stage.current;const fit=!!n&&n.clientWidth>=260&&n.clientHeight>=180;setFits(fit);if(!fit&&owner.current?.phase()==='playing')pause('Maximize the window to play.');};
    resize();const observer=new ResizeObserver(resize);observer.observe(stage.current);return ()=>observer.disconnect();
  },[]);
  useEffect(()=>{owner.current?.preferences();},[sound.muted,sound.volume]);
  useEffect(()=>{
    const leave=()=>pause('Paused after leaving the game.');
    const visibility=()=>{if(document.hidden)leave();};
    const outside=e=>{if(!region.current?.contains(e.target))leave();};
    window.addEventListener('blur',leave);window.addEventListener('pagehide',leave);document.addEventListener('visibilitychange',visibility);document.addEventListener('pointerdown',outside,true);
    return ()=>{window.removeEventListener('blur',leave);window.removeEventListener('pagehide',leave);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('pointerdown',outside,true);};
  },[]);
  const returnToGame=()=>{
    cancelResume();setDetails(false);canvas.current?.focus({preventScroll:true});
    resumeFrame.current=requestAnimationFrame(()=>{resumeFrame.current=null;refocus();});
  };
  const restart=()=>{canvas.current?.focus({preventScroll:true});pause();owner.current?.dispose();setAttempt(v=>v+1);};
  const playing=state.phase==='playing';
  const touch=(label,key)=><button type="button" key={label} data-cat-key={key} disabled={!playing} aria-label={label}
    onPointerDown={e=>input.current.pointer(e,key,eligible()&&owner.current?.phase()==='playing')}
    onPointerUp={e=>input.current.releasePointer(e)} onPointerCancel={e=>input.current.releasePointer(e)} onLostPointerCapture={e=>input.current.releasePointer(e)}
    onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){input.current.control(e,key,true,eligible()&&playing);}}}
    onKeyUp={e=>{if(e.key==='Enter'||e.key===' ')input.current.control(e,key,false,false);}}
    onClick={e=>{if(e.detail===0&&eligible()&&owner.current?.phase()==='playing'){input.current.tap(key);const timer=setTimeout(()=>{pulseTimers.current.delete(timer);input.current.endTap(key);},80);pulseTimers.current.add(timer);}}}>{label}</button>;
  return <section className="cat-mario" data-phase={state.phase} aria-label="Classic Cat Mario" onKeyDown={e=>{
    if(details&&e.key==='Escape'&&!e.defaultPrevented&&!e.repeat&&!e.isComposing&&!e.nativeEvent?.isComposing&&e.keyCode!==229&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();e.stopPropagation();setDetails(false);detailsToggle.current?.focus({preventScroll:true});}
  }}>
    <div className="cat-play-region" ref={region} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))pause('Paused — focus left the game.');}}
      onKeyDown={e=>{
        if(e.ctrlKey||e.altKey||e.metaKey||e.isComposing||e.nativeEvent?.isComposing||e.keyCode===229){pause('Paused for a keyboard shortcut.');return;}
        if(e.key==='Escape'&&!e.defaultPrevented&&!e.repeat&&!e.isComposing&&!e.nativeEvent?.isComposing&&e.keyCode!==229&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&owner.current?.phase()==='playing'){e.preventDefault();e.stopPropagation();pause();return;}
        if(e.target===canvas.current && ['ready','paused'].includes(owner.current?.phase()) && !e.repeat && (e.key==='Enter'||e.key===' ')){
          e.preventDefault();e.stopPropagation();refocus();return;
        }
        if(e.target===canvas.current || e.target.closest?.('[data-cat-key]'))input.current.key(e,true,eligible()&&owner.current?.phase()==='playing');
      }} onKeyUp={e=>input.current.key(e,false,false)}>
      <div className="cat-stage" ref={stage} onPointerDown={e=>{
        if(e.button!==0||e.isPrimary===false||e.ctrlKey||e.altKey||e.metaKey||e.target.closest?.('button,a,select'))return;
        e.preventDefault(); // Keep explicit canvas focus through the browser's default pointer action.
        refocus();
      }}>
        <canvas ref={canvas} width="480" height="420" tabIndex={0} aria-label="Cat Mario play surface. Arrow keys move, Space, Z or Up jumps; Space, Enter or Z starts the title screen, Escape pauses." />
        {(!playing||!fits)&&<div className="cat-status" role={state.phase==='error'?'alert':'status'}>
          {state.phase==='error'?<><p>{state.reason}</p><button onClick={restart}>Retry loading</button></>:state.phase==='ended'?<button onClick={restart}>Restart run</button>:!fits?<><p>More space is needed for the game.</p><button disabled={maximized} onClick={onMaximize}>Maximize to play</button></>:<p>{state.phase==='loading'?'Preparing Classic Cat Mario…':state.phase==='ready'?'Click the game or press Enter to play.':state.reason||'Your run is paused. Click the game or press Enter to continue.'}</p>}
        </div>}
      </div>
      {touchControls&&<div className="cat-touch" aria-label="Touch game controls">
        {touch('←',gameKeys.ArrowLeft)}{touch('→',gameKeys.ArrowRight)}{touch('Jump',122)}{touch('↓',gameKeys.ArrowDown)}{touch('Enter',13)}
      </div>}
    </div>
    <button className="cat-help-toggle" ref={detailsToggle} aria-label="Game help and controls" aria-expanded={details} onClick={()=>{pause();setDetails(v=>!v);}}>?</button>
    {details&&<div className="cat-details" role="region" aria-label="Game help">
      <strong>Controls</strong><p>← → move · Space / Z / ↑ jump · ↓ pipe · Space / Enter starts the title screen. Escape pauses.</p>
      <p>F1 returns to the title; O sacrifices a life. Keys1–8 select a stage on the title screen.</p>
      <button aria-pressed={touchControls} onClick={()=>setTouchControls(v=>!v)}>Touch controls: {touchControls?'On':'Off'}</button>
      <button onClick={()=>{setDetails(false);restart();}} disabled={state.phase==='loading'}>Restart game</button>
      <details><summary>Credits and source</summary><p>Classic Syobon Action / Cat Mario. Chiku’s game, with Bluvel’s later stages; Open Syobon by Mathew Velasquez, web port and supplied music by Takashi Toyoshima.</p><p>Seven source audio cues are unavailable. No original audio was added.</p><a href={classicAsset('credits.html')} target="_blank" rel="noreferrer">Credits and licenses</a> · <a href={classicAsset('source.zip')} download>Corresponding source and build instructions</a></details>
      <button onClick={returnToGame}>Back to game</button>
    </div>}

  </section>;
}
