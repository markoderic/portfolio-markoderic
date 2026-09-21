import {guardTossEntryKey} from "./PaperTossEntry";
import {clearBinInput,moveBinInput} from "./binInput";
import RuntimeDiagnostics from "./RuntimeDiagnosticsPanel.jsx";
import {createRuntimeDiagnostics,tracePointer} from "./runtimeDiagnostics.js";
import {createPaperToss} from "./paperToss";
import {createTossAudio} from "./paperTossAudio";
import PaperTossControls from "./PaperTossControls";
import { createTrackpadAudio } from "./trackpadAudio";
import { clearTrackpadInput, moveTrackpadInput } from "./trackpadInput";
import LocalClockTime from "./LocalClockTime";
import { moveFanInput } from "./fanInput";
import { fanAllowed, fanControlAllowed, fanMotionVisible, clearFanInput } from "./fanMotion";
import { DRAWERS, drawerAllowed, toggleDrawerState, clearDrawerInput } from "./drawers";
import { createDeskInput, clearDeskPointer, recordDeskPointer } from "./deskCamera";
import React, {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useProgress } from "@react-three/drei";
import {
  emptyDraft,
  finishMail,
  createMailSender,
  meetingDraft,
} from "./apps/mailState";
import { PHONE, phoneLogicalHeight, phoneClip, phoneIslandStyle, fitPhone } from "./deviceGeometry";
import BootConsole from "./BootConsole";
import { entryStatus, recordEntryStage, createEntry, transitionEntry, entryExcluded, entryComposing, consumeEntryEvent } from "./entryState";
import {
  zoomPaper,
  orbitPose,
  paperState,
  advancePrintJob,
  presentPrintMotion,
} from "./sceneInteraction";
import MacDesktop from "./MacDesktop";
import NotchDemo from "./notch/NotchDemo";
import { demoReducer, seedDemo } from "./notch/demoState";
import { resolveRoute, routeMap, printFraction } from "./workspaceState";
import { windowReducer, initialWindows } from "./windowState";
import { unlockSound, playSound, startPrinterSound } from "./sound";
import { createFanAudio } from "./fanSound";
import { createDrawerAudio } from "./drawerSound";
import { createPaperAudio } from "./paperSound";
import paperUrl from "./assets/resume-page.png";
import { resumeUrl } from "./content";
import "./workspace.css";
import "./notch/release.css";
const Scene = lazy(() => import("./Scene"));
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function routeState() {
  return resolveRoute(location.hash, location.search);
}
function getSound() {
  try {
    return {
      ...{ muted: false, volume: 0.4 },
      ...JSON.parse(localStorage.getItem("workspace-sound") || "{}"),
    };
  } catch {
    return { muted: false, volume: 0.4 };
  }
}
function guardEscape(event) {
  if (event.key !== "Escape" || !(event.repeat || event.nativeEvent?.isComposing || event.isComposing || event.keyCode === 229)) return false;
  if (event.repeat) event.preventDefault();
  event.stopPropagation();
  return true;
}
export default function Prototype() {
  const [notch, notchDispatch] = useReducer(demoReducer, undefined, seedDemo);
  const initial = useRef(routeState()).current;
  const [pageState, pageDispatch] = useReducer(paperState, {
    printing: false,
    completed: false,
    progress: 0,
  });
  const { printing, completed: completedPage } = pageState;
  const [mail, setMail] = useState(() => ({
    draft: emptyDraft(),
    sending: false,
    status: "",
  }));
  const mailSender = useRef(null);
  if (!mailSender.current) mailSender.current = createMailSender();
  const mailBusy = useRef(false);
  const sendMail = async () => {
    if (mailBusy.current) return;
    mailBusy.current = true;
    const draft = { ...mail.draft };
    setMail((m) => ({ ...m, sending: true, status: "Submitting…" }));
    const result = await mailSender.current(draft);
    setMail((m) => finishMail(m, draft, result));
    mailBusy.current = false;
  };
  const fresh = useRef(!initial.bypass && !matchMedia("(prefers-reduced-motion: reduce)").matches && innerWidth >= 800 && innerHeight >= 500).current;
  const entry = useRef(createEntry(fresh));
  const [entryPhase, renderEntry] = useState(entry.current.phase);
  const entered = entryPhase !== "terminal", arrival = entryPhase === "arriving";
  const entryGesture = useRef(null), entryHeldKey = useRef(false), arrivalFocus = useRef(), entryHost = useRef();
  const changeEntry = useCallback((action, token) => {
    if (transitionEntry(entry.current, action, token)) renderEntry(entry.current.phase);
  }, []);
  const finishArrival = useCallback(token => changeEntry("complete", token), [changeEntry]);
  const [view, setView] = useState(initial.view === "desk" && !fresh ? "laptop" : initial.view),
    [entryStages, setEntryStages] = useState({}),
    [paperZoom, setPaperZoom] = useState(1),
    [night, setNight] = useState(false),
    [desktopDark, setDesktopDark] = useState(false),
    [sound, setSound] = useState(getSound),
    [simple, setSimple] = useState(
      new URLSearchParams(location.search).has("simple"),
    ),
    [failed, setFailed] = useState(false),
    [settled, setSettled] = useState(null),
    [viewport, setViewport] = useState({
      width: innerWidth,
      height: innerHeight,
    }),
    [reduced, setReduced] = useState(
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [printRun, setPrintRun] = useState(0),
    [nav, setNav] = useState(false);
  const { active: loading, loaded, total, errors } = useProgress();
  const laptopHost = useRef(),
    phoneHost = useRef(),
    phoneEscape = useRef(),
    laptopMask = useRef(),
    laptopPaperMask = useRef(),
    paperHost = useRef(),
    paperFitButton = useRef(),
    navigationButton = useRef();
  const printerAudio = useRef(() => {});
  const orbit = useRef({ yaw: 0, pitch: 0 });
  const deskInput = useRef(createDeskInput());
  const trace = useMemo(createRuntimeDiagnostics, []);
  const [diagnosticsOpen,setDiagnosticsOpen] = useState(false);
  deskInput.current.trace=trace;
  useEffect(()=>()=>trace.dispose(),[trace]);
  const toss = useMemo(createPaperToss, []);
  const [tossPhase,setTossPhase]=useState('off'),[tossReady,setTossReady]=useState(false);
  const [tossReason,setTossReason]=useState('Wait for the desk to settle.');
  const tossFocus=useRef(null),tossLaunchClick=useRef(false);
  const tossSound=useRef({});
  const tossAudio=useMemo(()=>createTossAudio(()=>tossSound.current),[]);
  toss.audio=tossAudio;
  toss.releaseInput=()=>{deskInput.current.pressing=false;clearDeskPointer(deskInput.current);};
  useEffect(()=>{const unsubscribe=toss.subscribe(()=>setTossPhase(toss.phase));return()=>{unsubscribe();toss.dispose();tossAudio.dispose();};},[toss,tossAudio]);
  const trackpadState = useRef({});
  const trackpadAudio = useMemo(() => createTrackpadAudio(() => ({
    ...trackpadState.current, enabled: trackpadState.current.enabled && !document.hidden,
  })), []);
  useEffect(() => { trackpadAudio.mount(); return () => trackpadAudio.dispose(); }, [trackpadAudio]);
  const [deskPaused, setDeskPaused] = useState(false);
  const [fanOn, setFanOn] = useState(true);
  const fanSoundState = useRef({});
  const fanPageHidden = useRef(false);
  const fanAudio = useMemo(() => createFanAudio(() => ({
    ...fanSoundState.current,
    visible: fanSoundState.current.visible && !document.hidden,
    switchEligible: fanSoundState.current.switchEligible && !document.hidden,
  }), undefined, trace), [trace]);
  useEffect(() => { fanAudio.mount(); return () => fanAudio.dispose(); }, [fanAudio]);
  const [drawers, setDrawers] = useState([false, false, false]);
  const drawerTargets = useRef(drawers);
  drawerTargets.current = drawers;
  const drawerSoundState = useRef({});
  const drawerAudio = useMemo(() => createDrawerAudio(() => ({...drawerSoundState.current, hidden: !!document.hidden || fanPageHidden.current})), []);
  useEffect(() => { drawerAudio.mount(); return () => drawerAudio.dispose(); }, [drawerAudio]);
  const orbitDrag = useRef(null);
  const clickGesture = useRef(null);
  const laptopReturnClick = useRef(false);
  useEffect(() => {
    if (view !== "laptop" || settled === "laptop") deskInput.current.laptopReturning = false;
  }, [view, settled]);
  useEffect(() => {
    trace.record("input-cleanup",{view,reason:"view-change"});
    clearDeskPointer(deskInput.current);
    deskInput.current.dragging = false;
    deskInput.current.pressing = false;
    orbitDrag.current = null;
    clearDrawerInput(deskInput.current); clearFanInput(deskInput.current); clearBinInput(deskInput.current);
  }, [view]);
  useEffect(() => {
    const visibility = () => {
      deskInput.current.hidden = !!document.hidden || fanPageHidden.current;
      if (deskInput.current.hidden) deskInput.current.fanSuspendVersion = (deskInput.current.fanSuspendVersion || 0) + 1;
      trace.record("page-lifecycle",{reason:"visibilitychange",hidden:deskInput.current.hidden});
      toss.pageHidden(!!document.hidden);
      fanAudio.sync();
      paperAudio.sync();
      if (deskInput.current.hidden) printerAudio.current();
      drawerAudio.sync();
      trackpadAudio.sync();
      clearTrackpadInput(deskInput.current);
      clearFanInput(deskInput.current); clearBinInput(deskInput.current);
      clearDeskPointer(deskInput.current);
    };
    visibility();
    const leave = () => { trace.record("page-lifecycle",{reason:"pagehide",hidden:true}); fanPageHidden.current = true; deskInput.current.hidden = true; deskInput.current.fanSuspendVersion = (deskInput.current.fanSuspendVersion || 0) + 1; toss.pageHidden(true); printerAudio.current(); fanAudio.pageHidden(true); paperAudio.pageHidden(true); drawerAudio.pageHidden(true); trackpadAudio.pageHidden(true); clearTrackpadInput(deskInput.current); clearFanInput(deskInput.current); clearBinInput(deskInput.current); };
    const returnPage = () => { trace.record("page-lifecycle",{reason:"pageshow",hidden:!!document.hidden}); fanPageHidden.current = false; deskInput.current.hidden = !!document.hidden; toss.pageHidden(!!document.hidden); fanAudio.pageHidden(false); paperAudio.pageHidden(false); drawerAudio.pageHidden(false); trackpadAudio.pageHidden(false); };
    addEventListener("visibilitychange", visibility);
    addEventListener("pagehide", leave);
    addEventListener("pageshow", returnPage);
    return () => {
      removeEventListener("visibilitychange", visibility);
      removeEventListener("pagehide", leave);
      removeEventListener("pageshow", returnPage);
    };
  }, []);
  const manualOrbit = () => {
    toss.exit();
    if (!deskInput.current.manual) orbit.current = { ...deskInput.current.liveOrbit };
    deskInput.current.manual = true;
    clearDeskPointer(deskInput.current);
    setDeskPaused(true);
  };
  const finishOrbit = () => {
    const d = orbitDrag.current;
    orbitDrag.current = null;
    deskInput.current.dragging = false;
    deskInput.current.pressing = false;
    clearDeskPointer(deskInput.current);
    if (d?.node?.hasPointerCapture(d.id)) d.node.releasePointerCapture(d.id);
  };
  const printTimer = useRef(null);
  const printProgress = useRef(0);
  const printMotion = useRef({ phase: "idle", progress: 0 });
  const printJob = useRef(null);
  const paperSoundState = useRef({});
  const paperAudio = useMemo(() => createPaperAudio(() => ({
    ...paperSoundState.current, job: printJob.current, motion: printMotion.current,
    hidden: !!document.hidden,
  })), []);
  useEffect(() => { paperAudio.mount(); return () => paperAudio.dispose(); }, [paperAudio]);
  const settledRef = useRef(settled);
  settledRef.current = settled;
  const hosts = useMemo(
    () => ({
      laptop: laptopHost,
      phone: phoneHost,
      mask: laptopMask,
      paperMask: laptopPaperMask,
      paper: paperHost,
      entry: entryHost,
    }),
    [],
  );
  const direct =
    simple ||
    failed ||
    reduced ||
    viewport.width < 800 ||
    viewport.height < 500;
  toss.blocked=nav;
  tossSound.current={enabled:toss.active(),hidden:typeof document!=="undefined"&&!!document.hidden,preferences:sound};
  const priorTossSound=useRef(sound);
  useEffect(()=>{const before=priorTossSound.current;priorTossSound.current=sound;
    if((before.muted!==sound.muted||before.volume!==sound.volume)&&['aiming','flight'].includes(toss.phase))toss.cancel('Sound changed — aim again');
    tossAudio.sync();
  },[toss,tossAudio,sound,tossPhase]);
  useEffect(()=>{if(direct||view!=='desk'||entryPhase!=='active')toss.exit();},[toss,direct,view,entryPhase]);
  const laptopSelectionAllowed = !toss.active() && !direct && !nav && entry.current.phase === "active" &&
    (view === "desk" || view === "laptop" || view === "phone");
  trackpadState.current = { preferences: sound, enabled: !toss.active() && !direct && !nav && entry.current.phase === "active" && (view === "desk" || view === "laptop") };
  useEffect(() => { trackpadAudio.sync(); if (!laptopSelectionAllowed) clearTrackpadInput(deskInput.current); }, [trackpadAudio, sound, laptopSelectionAllowed, view]);
  drawerSoundState.current = {preferences: sound, direct: direct || simple || failed, reduced};
  useEffect(() => drawerAudio.sync(), [drawerAudio, sound, direct, simple, failed, reduced]);
  paperSoundState.current = { preferences: sound, direct, view };
  useEffect(() => paperAudio.sync(), [paperAudio, sound, direct, view]);
  fanSoundState.current = {
    on: fanOn, preferences: sound, reduced,
    // Page visibility is read live by the audio owner above, not cached here.
    visible: fanMotionVisible(view, entry.current.phase === "active", direct, false),
    switchEligible: fanControlAllowed({ active: entry.current.phase === "active", direct, reduced, simple, failed }),
  };
  useEffect(() => fanAudio.sync(), [fanAudio, fanOn, sound, view, entryPhase, direct, reduced, simple, failed]);
  const toggleFan = (logical = false) => {
    if(toss.phase==='aiming'){trace.record('fan-toggle',{reason:'toss-aiming',source:logical?'Explore':'physical'});return;}
    const control = { active: entry.current.phase === "active", direct, reduced, simple, failed, dragging: !!orbitDrag.current, hidden: deskInput.current.hidden };
    if (!(logical ? fanControlAllowed(control) : fanAllowed({ ...control, view }) && !control.hidden)) {trace.record('fan-toggle',{...control,view,source:logical?'Explore':'physical',reason:'eligibility-rejected'});return;}
    clearDeskPointer(deskInput.current);
    const next = !fanSoundState.current.on;
    trace.record("fan-toggle",{source:logical?"Explore":"physical",reason:"accepted",on:next,view});
    fanSoundState.current.on = next;
    setFanOn(next);
    void fanAudio.toggle(next);
  };
  const toggleDrawer = (id) => {
    if(toss.active() || deskInput.current.hidden || !DRAWERS.some(d => d.id === id))return;
    toss.available=false;setTossReady(false);setTossReason("Wait for the drawers to settle.");
    if (!drawerAllowed({ view, active: entry.current.phase === "active", direct, dragging: !!orbitDrag.current })) return;
    clearDeskPointer(deskInput.current);
    const next = toggleDrawerState(drawerTargets.current, id);
    drawerTargets.current = next;
    drawerAudio.accept(id, next[id], unlockSound());
    setDrawers(next);
  };
  const tossEntryReason = direct ? "Paper toss requires the 3D motion view." : printJob.current ? "Wait for the résumé to finish." :
    view !== "desk" ? "Return to the desk to play." : !tossReady ? tossReason || "Wait for the desk to settle." : "";
  const tossEntryEnabled = entry.current.phase === "active" && !direct && view === "desk" && !printJob.current && tossReady && !toss.active();
  const enterToss = (route = "explore") => {
    if (!tossEntryEnabled || document.hidden || deskInput.current.hidden || !toss.available || printJob.current) return false;
    if (!toss.enter()) return false;
    tossLaunchClick.current = route === "bin";
    finishOrbit(); clearBinInput(deskInput.current); clearFanInput(deskInput.current); clearDrawerInput(deskInput.current); clearTrackpadInput(deskInput.current); clearDeskPointer(deskInput.current);
    deskInput.current.ui = false; setNav(false);
    return true;
  };
  const exitToss = () => { tossFocus.current = true; toss.exit(); };
  useEffect(() => {
    if (tossPhase !== "off" || !tossFocus.current || view !== "desk") return;
    const node=navigationButton.current;
    if (node) { node.focus({preventScroll:true}); tossFocus.current=null; }
  }, [tossPhase,tossEntryEnabled,settled,view]);
  const laptopHeight = Math.max(
    220,
    // Measured lid extends above the content aperture. Reserve 16px at its
    // outer top edge on tall displays, without scaling HTML independently.
    Math.min(viewport.height - 110, (viewport.width - 96) / 1.6, (viewport.height - 32) / 1.118),
  );
  const phoneHeight = fitPhone(viewport).height;
  const layout = useMemo(
    () => ({
      laptop: direct
        ? {
            width: Math.min(viewport.width - 24, 1200),
            height: viewport.height - 95,
          }
        : { width: laptopHeight * 1.6, height: laptopHeight },
      phone: fitPhone(viewport),
    }),
    [laptopHeight, phoneHeight, direct, viewport],
  );
  const [manager, dispatch] = useReducer(windowReducer, null, () => initialWindows(initial, layout.laptop, fresh));
  const cancelPrint = useCallback(() => {
    cancelAnimationFrame(printTimer.current);
    paperAudio.cancel();
    printJob.current = null;
    printMotion.current = { phase: "idle", progress: 0 };
    pageDispatch("cancel");
    printProgress.current = completedPage ? 1 : 0;
    printerAudio.current();
  }, [completedPage, paperAudio]);
  const navigate = useCallback(
    (next) => {
      tossFocus.current = null;
      trace.record("navigation",{requested:next,view,reason:"requested"});
      toss.exit();
      trackpadAudio.cancel();
      clearTrackpadInput(deskInput.current);
      cancelPrint();
      changeEntry("cancel");
      if (view === "phone" && next === "desk") {
        // Request the existing Rig's normal overview; retain the pause preference.
        orbit.current = { yaw: 0, pitch: 0 };
        deskInput.current.manual = false;
        deskInput.current.ui = false;
        deskInput.current.reset++;
        clearDeskPointer(deskInput.current);
      }
      if (next !== view && ["desk", "laptop"].includes(next) && ["desk", "laptop"].includes(view)) setSettled(null);
      setView(next);

      setNav(false);
      history.pushState(null, "", `#${next}`);
    },
    [cancelPrint, changeEntry, view],
  );
  const selectPhysicalLaptop = () => {
    const input = deskInput.current;
    if (!laptopSelectionAllowed || input.hidden || input.dragging || input.laptopReturning) return false;
    if (view === "phone") {
      // Lock the accepted release immediately, including before React commits.
      // The existing Rig clears this lock by reporting the focused laptop settled.
      input.laptopReturning = true;
      laptopReturnClick.current = true;
    }
    if (view !== "laptop") navigate("laptop");
    return true;
  };
  const open = useCallback(
    (raw, detail) => {
      toss.exit();
      const id = raw === "notch" ? "notch" : routeMap[raw] || raw;
      if (id === "notch") {
        navigate("phone");
        return;
      }
      cancelPrint();
      changeEntry("cancel");
      if (view === "desk") setSettled(null);
      setView("laptop");
      dispatch({ type: "open", id, size: layout.laptop });
      history.pushState(null, "", `#${raw}`);
      if (detail)
        requestAnimationFrame(() =>
          window.dispatchEvent(
            new CustomEvent("workspace-document", { detail }),
          ),
        );
    },
    [layout, cancelPrint, navigate, changeEntry, view],
  );
  const showPaper = useCallback(() => {
    cancelPrint();
    setPaperZoom(1);
    navigate("paper");
  }, [cancelPrint, navigate]);
  const printResume = useCallback((discardOnly = false) => {
    toss.exit();
    // React click events are not job options.
    discardOnly = discardOnly === true;
    if (printJob.current) return;
    const audioReady = unlockSound();
    const replace = completedPage || view === "paper";
    cancelPrint();
    printJob.current = { replace, discardOnly, audioReady, ...(replace ? { startedAt: performance.now() } : {}) };
    printMotion.current = { phase: replace ? "crumple" : "feed", progress: 0, job: printJob.current };
    paperAudio.begin(printJob.current);
    changeEntry("cancel");
    setView(direct ? "paper" : "printer");
    setPrintRun((v) => v + 1);
    printProgress.current = 0;
    setPaperZoom(1);
    pageDispatch("start");
    history.pushState(null, "", direct ? "#paper" : "#printer");
  }, [direct, cancelPrint, completedPage, view, changeEntry]);
  const resume = useCallback(() => {
    if (printJob.current) return;
    if (completedPage) showPaper();
    else printResume();
  }, [completedPage, showPaper, printResume]);
  useEffect(() => {
    if (!printing) return;
    const job = printJob.current;
    if (!job) return;
    const frame = (t) => {
      if (printJob.current !== job) return;
      let motion = advancePrintJob(
        job,
        t,
        direct || (!deskInput.current.hidden && printMotion.current.job === job &&
          job.feedPosePresented === printMotion.current),
        direct || reduced,
      );
      if (!motion) {
        printTimer.current = requestAnimationFrame(frame);
        return;
      }
      motion = presentPrintMotion(job, motion, !direct && !reduced && !document.hidden);
      printMotion.current = motion;
      if (motion.phase === "feed" || motion.phase === "complete") {
        if (job.replace && !job.disposed) {
          job.disposed = true;
          pageDispatch("disposed");
        }
        printProgress.current = motion.progress;
        if (!job.feeding && motion.phase === "feed" && !deskInput.current.hidden) {
          const stop = startPrinterSound(paperSoundState.current.preferences, motion.progress);
          // AudioContext resume can still be pending on the first visible frame.
          // Retry within this live job only, aligned to the remaining feed.
          if (stop) { job.feeding = true; printerAudio.current = stop; }
        }
      }
      if (motion.phase !== "complete")
        printTimer.current = requestAnimationFrame(frame);
      else {
        paperAudio.finish(job);
        printJob.current = null;
        printMotion.current = { phase: "idle", progress: 0 };
        pageDispatch(job.discardOnly ? "cancel" : "complete");
        printerAudio.current();
        setPaperZoom(1);
        setView(job.discardOnly ? "desk" : "paper");
        history.pushState(null, "", job.discardOnly ? "#desk" : "#paper");
      }
    };
    printTimer.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(printTimer.current);
      printerAudio.current();
    };
  }, [printing, printRun, direct, reduced]);
  useEffect(() => {
    printerAudio.current();
  }, [sound]);
  useEffect(() => {
    dispatch({ type: "resize", size: layout.laptop });
  }, [layout]);
  useEffect(() => {
    const r = () => {
      // Both Canvas and projected DOM use layout-viewport CSS pixels.
      // Pinch zoom is applied to their common parent by the browser, not compensated twice.
      // Rig owns settled state; a same-size resize event must not leave controls inert.
      setViewport({ width: innerWidth, height: innerHeight });
    };
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const m = () => setReduced(mq.matches);
    addEventListener("resize", r);
    mq.addEventListener("change", m);
    return () => {
      removeEventListener("resize", r);
      mq.removeEventListener("change", m);
      cancelAnimationFrame(printTimer.current);
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("workspace-sound", JSON.stringify(sound));
    } catch {}
  }, [sound]);
  useEffect(() => {
    const back = () => {
      cancelPrint();
      const r = routeState();
      setView(r.view);
      changeEntry("cancel");
      setPaperZoom(1);
      if (r.app) dispatch({ type: "open", id: r.app, size: layout.laptop });
    };
    addEventListener("popstate", back);
    return () => removeEventListener("popstate", back);
  }, [layout, cancelPrint, changeEntry]);
  useEffect(() => {
    if (paperZoom === 1 && paperHost.current) paperHost.current.scrollTo(0, 0);
  }, [paperZoom]);
  const onStageReady = useCallback((id) => {
    setEntryStages((stages) =>
      recordEntryStage(stages, id),
    );
  }, []);
  const { ready } = entryStatus(entryStages, { loading, errors, failed });
  useEffect(() => {
    if (direct) { changeEntry("cancel"); setView(current => current === "desk" ? "laptop" : current); }
  }, [direct, changeEntry]);
  const begin = (e, skip = false) => {
    consumeEntryEvent(e);
    if (entry.current.phase !== "terminal" || (!ready && !skip)) return;
    unlockSound();
    clearDeskPointer(deskInput.current);
    setSettled(null);
    changeEntry(skip ? "skip" : "confirm");
  };
  const selectedEntryText = () => !!window.getSelection?.()?.toString();
  const entryClick = e => {
    if (entryExcluded(e.target)) return;
    consumeEntryEvent(e);
    const gesture = entryGesture.current; entryGesture.current = null;
    if (gesture && !gesture.excluded && !gesture.moved && !selectedEntryText() && ready) begin(e);
  };
  useEffect(() => {
    if (arrival) arrivalFocus.current?.focus({ preventScroll: true });
  }, [arrival]);
  const lamp = () => {
    setNight((v) => !v);
    playSound("lamp", sound);
  };
  const laptopEnabled =
    entered && view === "laptop" && (direct || settled === "laptop");
  const phoneEnabled =
    entered && view === "phone" && (direct || settled === "phone");
  const paperEnabled =
    entered && view === "paper" && (direct || settled === "paper");
  const handleEscape = (e) => {
    // Bubble only: local handlers may preventDefault or stop propagation.
    if (e.key !== "Escape" || e.defaultPrevented) return;
    if (deskInput.current.binPress) { e.preventDefault(); clearBinInput(deskInput.current); return; }
    if (deskInput.current.fanPress) { e.preventDefault(); clearFanInput(deskInput.current); clearBinInput(deskInput.current); return; }
    if (deskInput.current.drawerPress) { e.preventDefault(); clearDrawerInput(deskInput.current); clearFanInput(deskInput.current); clearBinInput(deskInput.current); return; }
    if (orbitDrag.current) { e.preventDefault(); finishOrbit(); return; }
    if (nav) {
      e.preventDefault();
      setNav(false);
      deskInput.current.ui = false;
      navigationButton.current?.focus({ preventScroll: true });
      return;
    }
    if(toss.active()){e.preventDefault();if(!toss.cancelAim())exitToss();return;}
    if (!entered || arrival || !["laptop", "phone", "paper"].includes(view)) return;
    if (view === "phone") {
      phoneEscape.current?.(e);
      if (e.defaultPrevented) return;
    }
    e.preventDefault();
    navigate("desk");
  };
  useEffect(() => {
    if (!entered || arrival || view !== "phone") return;
    const recoverEscape = (event) => {
      // Bubble-only, and ONLY a key with no control owner in this document.
      // Workspace-targeted events have their own React path; never dispatch twice.
      if (event.key !== "Escape" || event.defaultPrevented ||
          event.target !== document.body || document.activeElement !== document.body ||
          !document.hasFocus()) return;
      if (guardEscape(event)) return;
      handleEscape(event);
    };
    addEventListener("keydown", recoverEscape);
    return () => removeEventListener("keydown", recoverEscape);
  }, [entered, arrival, view, nav, navigate]);
  useEffect(() => {
    if (phoneEnabled)
      (phoneHost.current?.querySelector(".n-sheet") || phoneHost.current?.querySelector(".notch-demo"))
        ?.focus({ preventScroll: true });
    else if (laptopEnabled)
      laptopHost.current
        ?.querySelector(".mac-desktop")
        ?.focus({ preventScroll: true });
    else if (paperEnabled)
      paperFitButton.current?.focus({ preventScroll: true });
    else if (entered && !arrival && (view === "desk" || view === "phone"))
      navigationButton.current?.focus({ preventScroll: true });
  }, [phoneEnabled, laptopEnabled, paperEnabled, entered, arrival, view]);
  trace.observe(()=>({...fanAudio.diagnosticState(),width:viewport.width,height:viewport.height,direct,reduced,simple,failed,entry:entry.current.phase,settled:settled||'none',view,on:fanSoundState.current.on,active:entry.current.phase==='active',hidden:deskInput.current.hidden,dragging:deskInput.current.dragging,nav,blocked:nav||!entered||entry.current.phase==='arriving',toss:toss.phase,laptopEnabled,muted:sound.muted,volume:sound.volume}));
  useEffect(()=>{trace.snapshot();},[trace,view,settled,direct,reduced,simple,failed,entryPhase,nav,fanOn,sound,viewport,tossPhase]);
  const closeDiagnostics=()=>{setDiagnosticsOpen(false);navigationButton.current?.focus();};
  return (
    <main
      className={`workspace ${desktopDark ? "night" : ""} ${night ? "scene-night" : ""} ${direct ? "direct-view" : "projected-view"} view-${view} ${reduced ? "reduced" : ""}`}
      data-transition={direct || settled === view ? "settled" : "moving"}
      onPointerUpCapture={e=>tracePointer(deskInput.current,"host-capture",e,"release-received")}
      onPointerUp={(e) => {
        if (deskInput.current.binPress?.pointerId === e.pointerId) clearBinInput(deskInput.current);
        tracePointer(deskInput.current,"host-bubble",e,deskInput.current.trackpadPress?"release-missed-laptop":deskInput.current.fanPress?"release-missed-fan":"release-complete");
        if (deskInput.current.trackpadPress?.pointerId === e.pointerId && !deskInput.current.trackpadPress.released) clearTrackpadInput(deskInput.current);
        if (deskInput.current.fanPress?.pointerId === e.pointerId && !deskInput.current.fanPress.released) clearFanInput(deskInput.current);
        deskInput.current.pressing = false;
      }}
      onLostPointerCapture={(e) => {
        if (deskInput.current.binPress?.pointerId === e.pointerId) clearBinInput(deskInput.current);
        tracePointer(deskInput.current,"host",e,"capture-lost");
        if (deskInput.current.trackpadPress?.pointerId === e.pointerId && !deskInput.current.trackpadPress.released) { clearTrackpadInput(deskInput.current); trackpadAudio.cancel(); }
        if (deskInput.current.fanPress?.pointerId === e.pointerId && !deskInput.current.fanPress.released) clearFanInput(deskInput.current);
      }}
      onPointerCancel={(e) => { tracePointer(deskInput.current,"host",e,"cancel"); clearTrackpadInput(deskInput.current); trackpadAudio.cancel(); entryGesture.current = null; clearDrawerInput(deskInput.current); clearFanInput(deskInput.current); clearBinInput(deskInput.current); finishOrbit(); }}
      onPointerDownCapture={(e) => {
        tracePointer(deskInput.current,"host-capture",e,"down-received");
        if (e.isPrimary !== false && e.button === 0) {
          laptopReturnClick.current = false; tossLaunchClick.current = false; toss.clearClick?.(); // A new deliberate press owns its own click.
          clearTrackpadInput(deskInput.current); trackpadAudio.cancel();
        }
        if (e.isPrimary !== false && e.button === 0) { clearFanInput(deskInput.current); clearBinInput(deskInput.current); }
        deskInput.current.pressing = true;
        clearDeskPointer(deskInput.current);
        clickGesture.current = { x: e.clientX, y: e.clientY, moved: false };

      }}
      onPointerMoveCapture={(e) => {
        moveTrackpadInput(deskInput.current, e);
        moveFanInput(deskInput.current, e); moveBinInput(deskInput.current, e);
        const g = clickGesture.current;
        if (g && e.buttons)
          g.moved ||= Math.hypot(e.clientX - g.x, e.clientY - g.y) > 5;
      }}
      onClickCapture={(e) => {
        tracePointer(deskInput.current,"host-capture",e,"click-received");
        if(toss.consumeClick?.(e)){e.preventDefault();e.stopPropagation();return;}
        // Consume the accepted physical navigation/game-entry compatibility click,
        // including browser retargeting after the destination becomes live.
        if ((laptopReturnClick.current || tossLaunchClick.current) && e.detail !== 0) {
          tossLaunchClick.current = false;
          laptopReturnClick.current = false;
          e.preventDefault(); e.stopPropagation(); return;
        }
        if (e.detail !== 0 && clickGesture.current?.moved) return;
      }}
      onPointerDown={(e) => {
        if (entered && (e.button ?? 0) === 0 && e.isPrimary !== false) unlockSound();
      }}
      onKeyDownCapture={(e) => {
        // Filter repeats before they reach another local layer after dismissal.
        // Composition belongs to the input/IME; leave its native default intact.
        if (guardEscape(e)) return;
        if (entered) unlockSound();
        if (e.key === "Enter") {
          if (entryComposing(e)) {
            // A composing Enter on the confirmation must not generate its native click.
            // Form/IME targets elsewhere retain their own default behavior.
            if (entry.current.phase === "terminal" && e.target?.closest?.("[data-entry-confirm]")) consumeEntryEvent(e);
            return;
          }
          if (e.repeat && entryHeldKey.current) { consumeEntryEvent(e); return; }
          const primary = e.target?.closest?.("[data-entry-confirm]");
          if (entry.current.phase === "terminal" && (primary || !entryExcluded(e.target))) {
            consumeEntryEvent(e);
            if (e.repeat || selectedEntryText()) return;
            entryHeldKey.current = true;
            begin(e, !ready);
          }
        }
      }}
      onKeyUpCapture={e => { if (e.key === "Enter") entryHeldKey.current = false; }}
      onKeyDown={handleEscape}
    >
      {!simple && !failed && (
        <div
          className="scene"
          inert={entryPhase === "active" ? undefined : ""}
          onPointerDown={(e) => {
            clearDeskPointer(deskInput.current);
            if (toss.active() || view !== "desk" || entry.current.phase !== "active" || direct || e.button !== 0 || e.nativeEvent.sceneObject) return;
            deskInput.current.dragging = true;
            orbitDrag.current = {
              id: e.pointerId, node: e.currentTarget, x: e.clientX, y: e.clientY,
              yaw: deskInput.current.liveOrbit.yaw, pitch: deskInput.current.liveOrbit.pitch, moved: false,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (toss.active() || view !== "desk" || entry.current.phase !== "active" || direct) { finishOrbit(); return; }
            const d = orbitDrag.current;
            if (!d) {
              recordDeskPointer(deskInput.current, e, e.currentTarget.getBoundingClientRect());
              return;
            }
            if (d.id !== e.pointerId) return;
            if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) <= 5) return;
            if (!d.moved) { manualOrbit(); d.moved = true; }
            orbit.current = orbitPose(d.yaw + (e.clientX - d.x) * .003, d.pitch + (e.clientY - d.y) * .002);
          }}
          onPointerLeave={(e) => {
            tracePointer(deskInput.current,"scene-host",e,"scene-leave-cancel");
            clearTrackpadInput(deskInput.current);
            clearDeskPointer(deskInput.current);
            clearDrawerInput(deskInput.current); clearFanInput(deskInput.current); clearBinInput(deskInput.current);
            if (!orbitDrag.current) deskInput.current.pressing = false;
          }}
          onPointerUp={finishOrbit}
          onPointerCancel={finishOrbit}
          onLostPointerCapture={finishOrbit}
        >
          <SceneBoundary
            onFailure={() => {
              setFailed(true);
              setView("laptop");
            }}
          >
            <Suspense fallback={null}>
              <Scene
                toss={toss}
                tossReady={setTossReady}
                tossStatus={setTossReason}
                onTossEnter={enterToss}
                entry={entry.current}
                onArrivalComplete={finishArrival}
                orbit={orbit}
                fanOn={fanOn}
                fanAudio={fanAudio}
                onFanToggle={toggleFan}
                drawers={drawers}
                onDrawerToggle={toggleDrawer}
                drawerAudio={drawerAudio}
                deskInput={deskInput}
                deskPaused={deskPaused}
                deskBlocked={nav || !entered || arrival}
                completedPage={completedPage}
                onPaper={() => { if (entry.current.phase === "active") showPaper(); }}
                view={view}
                direct={direct}
                reduced={reduced}
                hosts={hosts}
                layout={layout}
                onSettled={setSettled}
                onSelect={(next) => {
                  if (toss.active() || entry.current.phase !== "active") return;
                  if (next === "laptop") selectPhysicalLaptop();
                  else if (next !== view) navigate(next);
                }}
                onTrackpad={() => {
                  // Navigation has its own eligibility. A phone-return pad hit is
                  // silent; existing desk/focused-pad sound ownership is unchanged.
                  const audible = trackpadState.current.enabled;
                  if (selectPhysicalLaptop() && audible) void trackpadAudio.press();
                }}
                night={night}
                desktopDark={desktopDark}
                onLamp={() => { if (entry.current.phase === "active") lamp(); }}
                printProgress={printProgress}
                printMotion={printMotion}
                paperAudio={paperAudio}
                onResume={() => {
                  if (entry.current.phase !== "active") return;
                  playSound("click", sound);
                  resume();
                }}
                onStageReady={onStageReady}
              />
            </Suspense>
          </SceneBoundary>
        </div>
      )}
      <LocalClockTime enabled={entered} />
      {entryPhase !== "active" && (
        <div className="entry-layer" ref={entryHost} data-arriving={arrival} inert={arrival ? "" : undefined} aria-hidden={arrival ? true : undefined}
          onPointerDown={e => { if (entry.current.phase !== "terminal") return; entryGesture.current = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, excluded: e.button !== 0 || e.isPrimary === false || entryExcluded(e.target) }; e.stopPropagation(); }}
          onPointerMove={e => { if (entry.current.phase !== "terminal") return; const g = entryGesture.current; if (g && (g.id !== e.pointerId || Math.hypot(e.clientX-g.x, e.clientY-g.y)>5)) g.moved = true; }}
          onPointerCancel={() => { entryGesture.current = null; }}
          onClick={entryClick}>

          <div className="entry-terminal">
          <BootConsole
            stages={entryStages}
            failed={failed}
            loading={loading}
            loaded={loaded}
            total={total}
            errors={errors}
          />
          <button className="entry-confirm" data-entry-confirm autoFocus disabled={arrival}
            onClick={e => { consumeEntryEvent(e); if (!entryGesture.current?.moved && !selectedEntryText()) begin(e, !ready); }}>
            <span aria-hidden="true">&gt; </span>{ready ? "Enter workspace" : "Skip loading"}<kbd>Enter ↵</kbd>
          </button>
          <div className="entry-options">
            <button disabled={arrival} onClick={() => { if (entry.current.phase === "terminal") setSound({ ...sound, muted: !sound.muted }); }}>
              Sound {sound.muted ? "off" : "on"}
            </button>
            <button disabled={arrival} onClick={() => { if (entry.current.phase === "terminal") showPaper(); }}>Resume</button>
            <button disabled={arrival}
              onClick={() => {
                if (entry.current.phase !== "terminal") return;
                setSimple(true);
                navigate("laptop");
              }}
            >
              Simple view
            </button>
          </div>
          </div>
        </div>
      )}
      {arrival && (
        <div className="arrival-shield" ref={arrivalFocus} tabIndex={-1} onClick={consumeEntryEvent} onPointerDown={e => e.stopPropagation()}>
          <span role="status">Arriving at desk…</span>
          <button onClick={e => { consumeEntryEvent(e); changeEntry("skip"); }}>Skip arrival</button>
        </div>
      )}
      {entered && entry.current.skipped && !ready && !failed && (
        <p className="entry-pending" role="status">{errors.length ? "Some resources failed to load." : "Loading skipped; some resources are still pending."} <button onClick={() => { setSimple(true); navigate("laptop"); }}>Use Simple view</button></p>
      )}
      {entered && <h1 className="workspace-identity" data-focused={view !== "desk"}>Marko Deric <span>/ workspace</span></h1>}
      {entered && failed && (
        <p className="entry-failure" role="alert">
          The 3D desk could not load. Showing Simple view.
        </p>
      )}
      <div className="laptop-occlusion">
        <div
          ref={laptopHost}
          className="screen-host laptop-host"
          style={layout.laptop}
          data-enabled={laptopEnabled}
          aria-hidden={!laptopEnabled}
          inert={laptopEnabled ? undefined : ""}
        >
          <div ref={laptopMask} className="screen-clip">
            <div ref={laptopPaperMask} className="screen-clip laptop-display-glass">
              <MacDesktop
                onStageReady={onStageReady}
                mail={mail}
                setMail={setMail}
                sendMail={sendMail}
                requestMeeting={(details) => {
                  setMail((m) => ({
                    ...m,
                    draft: meetingDraft(m.draft, details),
                    status:
                      "Meeting request drafted. Review and send when ready.",
                  }));
                  open("mail");
                }}
                reduced={reduced}
                enabled={laptopEnabled}
                desktopBlocked={nav}
                manager={manager}
                dispatch={dispatch}
                size={layout.laptop}
                host={laptopHost}
                open={open}
                navigate={navigate}
                onResume={resume}
                night={desktopDark}
                onLamp={() => setDesktopDark((v) => !v)}
                sound={sound}
                setSound={setSound}
                simple={simple}
                onSimple={() => {
                  setSimple((v) => !v);
                  navigate("laptop");
                }}
                notchScreen={(tab) => {
                  notchDispatch({ type: "tab", tab });
                  navigate("phone");
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div
        ref={phoneHost}
        className="screen-host phone-host"
        style={{ ...layout.phone, borderRadius: 0, clipPath: phoneClip, ...phoneIslandStyle }}
        data-awake={entered && view === "phone"}
        data-enabled={phoneEnabled}
        aria-hidden={!phoneEnabled}
        inert={phoneEnabled ? undefined : ""}
      >
        <div className="phone-logical-viewport" style={{ width: PHONE.logicalWidth, height: phoneLogicalHeight, transform: `scale(${layout.phone.width / PHONE.logicalWidth})` }}>
        <NotchDemo
          state={notch}
          dispatch={notchDispatch}
          enabled={phoneEnabled}
          escapeRef={phoneEscape}
        />
        </div>
      </div>
      {tossPhase!=="off" && <PaperTossControls game={toss} onExit={exitToss}/>}
      {entryPhase === "active" && (
        <div className="context-nav"
          onPointerEnter={() => { deskInput.current.ui = true; clearDeskPointer(deskInput.current); }}
          onPointerLeave={() => { deskInput.current.ui = false; }}
          onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) deskInput.current.ui = false; }}
        >
          <button
            ref={navigationButton}
            aria-expanded={nav}
            onClick={() => { toss.cancelAim(); clearDrawerInput(deskInput.current); clearFanInput(deskInput.current); clearBinInput(deskInput.current); setNav((v) => !v); }}
            aria-label="Workspace navigation"
          >
            <span aria-hidden="true">&gt; </span><span>{view === "desk" ? "Explore" : "Workspace"}</span>
          </button>
          {nav && (
            <nav aria-label="Workspace">
              <button onClick={() => navigate("desk")}>View desk</button>
              <button onClick={() => navigate("laptop")}>Open laptop</button>
              <button onClick={() => navigate("phone")}>Pick up phone</button>
              <button
                onClick={() => {
                  playSound("click", sound);
                  resume();
                }}
              >
                View resume
              </button>
              <a href={resumeUrl} download>
                Download PDF
              </a>
              <button
                onClick={() => {
                  setSimple((v) => !v);
                  navigate("laptop");
                }}
              >
                {simple ? "Use 3D" : "Simple view"}
              </button>
              <button data-sound="lamp" onClick={lamp}>
                {night ? "Daytime" : "Nighttime"}
              </button>
              {view === "desk" && <fieldset className="orbit-controls"><legend>Desk view</legend>          <button
            onClick={() => {
              manualOrbit();
              orbit.current = { yaw: 0, pitch: 0 };
              deskInput.current.reset++;
            }}
          >
            Reset view
          </button>
          <button
            aria-label="Orbit left"
            onClick={() => {
              manualOrbit();
              orbit.current = orbitPose(
                orbit.current.yaw - 0.08,
                orbit.current.pitch,
              );
            }}
          >
            ←
          </button>
          <button
            aria-label="Orbit right"
            onClick={() => {
              manualOrbit();
              orbit.current = orbitPose(
                orbit.current.yaw + 0.08,
                orbit.current.pitch,
              );
            }}
          >
            →
          </button>
              <button
                aria-pressed={deskPaused}
                disabled={direct || reduced || toss.active()}
                onClick={() => {
                  clearDeskPointer(deskInput.current);
                  if (deskPaused) { deskInput.current.manual = false; orbit.current = { yaw: 0, pitch: 0 }; }
                  setDeskPaused(v => !v);
                }}
              >{direct || reduced ? "Desk motion unavailable in Simple / reduced motion view" : deskPaused ? "Resume desk motion" : "Pause desk motion"}</button>
              </fieldset>}
              {fanControlAllowed({ active: entry.current.phase === "active", direct, reduced, simple, failed }) && <button
                aria-label={`Desk fan: ${fanOn ? "on; turn off" : "off; turn on"}`}
                aria-pressed={fanOn}
                onKeyDown={e => { if (e.repeat && (e.key === "Enter" || e.key === " ")) e.preventDefault(); }}
                onClick={() => toggleFan(true)}
              >Turn fan {fanOn ? "off" : "on"}{reduced ? " (motion reduced)" : ""}</button>}
              {view === "desk" && !direct && <fieldset className="orbit-controls"><legend>Desk drawers</legend>
                {DRAWERS.map(drawer => <button key={drawer.id}
                  aria-label={`${drawer.name}: ${drawers[drawer.id] ? "open; close drawer" : "closed; open drawer"}`}
                  aria-pressed={drawers[drawer.id]}
                  onKeyDown={e => { if (e.repeat && (e.key === "Enter" || e.key === " ")) e.preventDefault(); }}
                  onClick={() => toggleDrawer(drawer.id)}
                >{drawers[drawer.id] ? "Close" : "Open"} {drawer.name.toLowerCase()}</button>)}
              </fieldset>}
              <button onClick={() => open("controls")}>
                Controls & credits
              </button>
              <button disabled={!tossEntryEnabled} onKeyDown={guardTossEntryKey} onClick={()=>enterToss("explore")}>Paper toss</button>
              {tossEntryReason && <small role="status">{tossEntryReason}</small>}
              {import.meta.env.DEV && <button onClick={()=>setDiagnosticsOpen(true)}>Local runtime diagnostics</button>}
            </nav>
          )}
        </div>
      )}
      {import.meta.env.DEV && diagnosticsOpen && <RuntimeDiagnostics trace={trace} onClose={closeDiagnostics} onStart={()=>{trace.start();setDiagnosticsOpen(false);setNav(false);navigationButton.current?.focus();}}/>}
      {entered && view === "phone" && (
        <button className="return-context" onClick={() => navigate("laptop")}>
          ← Return to laptop
        </button>
      )}
      {printing && (
        <div className="printer-context" role="status">
          Preparing resume <button onClick={showPaper}>View now</button>
          <a href={resumeUrl} download>
            Download PDF
          </a>
        </div>
      )}
      <div
        ref={paperHost}
        tabIndex={view === "paper" && (direct || settled === "paper") ? 0 : -1}
        role="region"
        aria-label="Résumé sheet. Scroll to pan when zoomed."
        className={`paper-surface ${paperZoom > 1 ? "zoomed" : ""}`}
        data-disposing={printing && direct}
        data-visible={
          entered && view === "paper" && (direct || settled === "paper")
        }
        aria-hidden={view !== "paper"}
        inert={view === "paper" ? undefined : ""}
        style={{
          ...(direct ? {} : { width: 850, height: 1100 }),
          "--paper-zoom": paperZoom,
        }}
      >
        <img
          src={paperUrl}
          alt="Marko Deric résumé. An accessible original PDF is available below."
          draggable={false}
        />
      </div>
      {entered && view === "paper" && (
        <nav className="paper-actions" aria-label="Resume sheet">
          <button onClick={() => navigate("desk")}>← Desk</button>
          <button onClick={() => navigate("laptop")}>Laptop</button>
          <button
            ref={paperFitButton}
            aria-pressed={paperZoom === 1}
            onClick={() => setPaperZoom(1)}
          >
            Fit page
          </button>
          <button
            disabled={paperZoom >= 2.2}
            onClick={() => setPaperZoom((z) => zoomPaper(z, "in"))}
          >
            Zoom in
          </button>
          <button
            disabled={paperZoom <= 1}
            onClick={() => setPaperZoom((z) => zoomPaper(z, "out"))}
          >
            Zoom out
          </button>
          <button disabled={printing} onClick={printResume}>
            Reprint
          </button>
          <button disabled={printing} onClick={() => printResume(true)}>Discard paper</button>
          <a href={resumeUrl} target="_blank" rel="noreferrer">
            Original PDF
          </a>
          <a href={resumeUrl} download>
            Download
          </a>
        </nav>
      )}
    </main>
  );
}
