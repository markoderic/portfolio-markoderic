import React, { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  Maximize,
  Volume2,
  MousePointer2,
  Scissors,
  Hand,
  Search,
  Film,
  FolderOpen,
} from "lucide-react";
import audio from "../assets/film-audio.json";
import poster from "../assets/film-poster.jpg";
import { FILM_FPS, timecode as tc } from "./mediaTime";
export default function Premiere({ enabled, onMaximize, maximized }) {
  const [project, setProject] = useState(location.hash === "#film"),
    [query, setQuery] = useState(""),
    [time, setTime] = useState(0),
    [duration, setDuration] = useState(audio.duration),
    [playing, setPlaying] = useState(false),
    [volume, setVolume] = useState(0.5),
    [zoom, setZoom] = useState(1),
    [panel, setPanel] = useState("Source"),
    [brightness, setBrightness] = useState(100),
    [saturation, setSaturation] = useState(100),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(true),
    [marker, setMarker] = useState(null),
    [tool, setTool] = useState("Selection");
  const video = useRef(),
    timeline = useRef(),
    monitor = useRef();
  useEffect(() => {
    if (!enabled) video.current?.pause();
  }, [enabled]);
  useEffect(() => {
    if (video.current) video.current.volume = volume;
  }, [volume, project]);
  const seek = (t) => {
    if (video.current) {
      video.current.currentTime = Math.max(0, Math.min(duration, t));
      setTime(video.current.currentTime);
    }
  };
  const play = async () => {
    if (!video.current) return;
    if (playing) video.current.pause();
    else
      try {
        await video.current.play();
        setError("");
      } catch (e) {
        setError(
          `Playback unavailable: ${e.message}. Use the original video link.`,
        );
      }
  };
  const reset = () => {
    seek(0);
    video.current?.pause();
    setZoom(1);
    setBrightness(100);
    setSaturation(100);
    setMarker(null);
    setTool("Selection");
    setPanel("Source");
    setSelected(true);
  };
  const keyDown = (e) => {
    if (
      e.target.closest("input,textarea,select,button,a") ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey
    )
      return;
    if (e.code === "Space") {
      e.preventDefault();
      play();
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      seek(time + 1 / FILM_FPS);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      seek(time - 1 / FILM_FPS);
    }
  };
  const peak = playing
    ? Math.min(1, audio.peaks[Math.floor(time / audio.secondsPerBin)] || 0)
    : 0;
  const waveform = Array.from({ length: 240 }, (_, i) =>
    Math.max(
      ...audio.peaks.slice(
        Math.floor((i * audio.peaks.length) / 240),
        Math.floor(((i + 1) * audio.peaks.length) / 240),
      ),
    ),
  );
  if (!project)
    return (
      <div className="pr-picker">
        <header>
          <span className="pr-brand">Pr</span>
          <div>
            <h1>Premiere Pro</h1>
            <p>Video projects</p>
          </div>
        </header>
        <label className="app-search">
          <Search size={14} />
          <input
            type="search"
            aria-label="Search video projects"
            placeholder="Search projects"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {"personal branding film".includes(query.toLowerCase()) ? (
          <button className="pr-project" onClick={() => setProject(true)}>
            <img src={poster} alt="Personal branding film thumbnail" />
            <span>
              <strong>Personal branding film</strong>
              <small>23.94 seconds · 1080 × 1920</small>
              <small>Open review sequence →</small>
            </span>
          </button>
        ) : (
          <p>No projects match.</p>
        )}
        <p className="app-footnote">
          One finished export. The original editing project has not been
          supplied.
        </p>
      </div>
    );
  return (
    <div
      className="premiere-app"
      tabIndex={0}
      onKeyDown={keyDown}
      aria-label="Personal branding film review workspace"
    >
      <div className="pr-header">
        <button
          onClick={() => {
            video.current?.pause();
            setProject(false);
          }}
        >
          <FolderOpen size={13} /> Projects
        </button>
        <strong>Personal branding film</strong>
        <span>Review</span>
        <button onClick={reset}>Reset workspace</button>
      </div>
      <div className="pr-body">
        <section className="pr-source">
          <div className="pr-tabs">
            {["Source", "Effect Controls"].map((p) => (
              <button
                key={p}
                aria-pressed={panel === p}
                onClick={() => setPanel(p)}
              >
                {p}
              </button>
            ))}
          </div>
          {panel === "Source" ? (
            <>
              <img src={poster} alt="Selected exported film" />
              <small>personalbrandingvideo.mp4</small>
              <dl>
                <dt>Video</dt>
                <dd>H.264 · 1080 × 1920</dd>
                <dt>Audio</dt>
                <dd>AAC · stereo · 44.1 kHz</dd>
                <dt>Sequence</dt>
                <dd>Single-clip review</dd>
              </dl>
              <button
                onClick={() => {
                  setSelected(true);
                  seek(0);
                }}
              >
                Load selected clip at start
              </button>
            </>
          ) : (
            <div className="pr-effects">
              <p>Demo preview adjustments</p>
              <label>
                Brightness <output>{brightness}%</output>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                />
              </label>
              <label>
                Saturation <output>{saturation}%</output>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                />
              </label>
              <button
                onClick={() => {
                  setBrightness(100);
                  setSaturation(100);
                }}
              >
                Reset preview
              </button>
              <small>
                These change only this monitor preview. They are not the
                original edit settings.
              </small>
            </div>
          )}
        </section>
        <section className="pr-program" ref={monitor}>
          <header>
            Program: Branding film <span>Fit</span>
            <button
              className="program-expand"
              onClick={onMaximize}
              title="Use more space for the Program monitor"
            >
              {maximized ? "Restore window" : "Maximize window"}
            </button>
          </header>
          <div className="pr-video-wrap">
            <video
              ref={video}
              src="/personalbrandingvideo.mp4"
              poster={poster}
              playsInline
              preload="metadata"
              style={{
                filter: `brightness(${brightness}%) saturate(${saturation}%)`,
              }}
              onLoadedMetadata={(e) => {
                setDuration(e.currentTarget.duration);
                e.currentTarget.volume = volume;
              }}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onError={() =>
                setError(
                  "The video could not be decoded. Open the original export below.",
                )
              }
            />
          </div>
          <div className="pr-time">
            <output>{tc(time)}</output>
            <small>{tc(duration)}</small>
          </div>
          <input
            className="pr-scrub"
            type="range"
            aria-label="Seek video"
            min="0"
            max={duration}
            step={1 / FILM_FPS}
            value={time}
            onChange={(e) => seek(Number(e.target.value))}
          />
          <div className="pr-transport">
            <button aria-label="Go to start" onClick={() => seek(0)}>
              <SkipBack size={14} />
            </button>
            <button
              aria-label={playing ? "Pause film" : "Play film"}
              onClick={play}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button onClick={() => setMarker(time)} title="Add a review marker">
              ◇
            </button>
            <Volume2 size={13} />
            <input
              aria-label="Video volume"
              type="range"
              min="0"
              max="1"
              step=".05"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
            <button
              aria-label="Fullscreen video"
              onClick={async () => {
                try {
                  if (document.fullscreenElement)
                    await document.exitFullscreen();
                  else await monitor.current.requestFullscreen();
                } catch {
                  setError("Fullscreen is unavailable in this browser.");
                }
              }}
            >
              <Maximize size={14} />
            </button>
          </div>
          {error && (
            <p className="pr-error" role="alert">
              {error}{" "}
              <a
                href="/personalbrandingvideo.mp4"
                target="_blank"
                rel="noreferrer"
              >
                Open original export
              </a>
            </p>
          )}
        </section>
        <aside className="pr-inspector">
          <header>Properties</header>
          <p>{selected ? "Branding film" : "No clip selected"}</p>
          <dl>
            <dt>Duration</dt>
            <dd>{tc(duration)}</dd>
            <dt>Frames</dt>
            <dd>{FILM_FPS} fps</dd>
            <dt>Resolution</dt>
            <dd>1080 × 1920</dd>
          </dl>
          <h4>Review notes</h4>
          <p>A personal introduction focused on pacing and storytelling.</p>
          <small>
            Completed film from Marko’s portfolio. Source cuts and stems are
            unavailable.
          </small>
        </aside>
        <section className="pr-bin">
          <header>Project: Branding film</header>
          <label>
            <Search size={11} />
            <input
              type="search"
              aria-label="Search media bin"
              placeholder="Search media"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {"personalbrandingvideo.mp4".includes(query.toLowerCase()) && (
            <button
              className={selected ? "chosen" : ""}
              onClick={() => setSelected((v) => !v)}
            >
              <Film size={16} />
              <span>
                personalbrandingvideo.mp4<small>{tc(duration)}</small>
              </span>
            </button>
          )}
          <small>1 media item · final export</small>
        </section>
        <section className="pr-timeline">
          <header>
            <strong>Branding film · Review sequence</strong>
            <label>
              Zoom
              <input
                type="range"
                aria-label="Timeline zoom"
                min="1"
                max="5"
                step=".25"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>
          </header>
          <div className="pr-editing">
            <div className="pr-tools">
              <button
                aria-pressed={tool === "Selection"}
                aria-label="Selection tool"
                onClick={() => setTool("Selection")}
              >
                <MousePointer2 size={15} />
              </button>
              <button
                aria-pressed={tool === "Hand"}
                aria-label="Hand tool, scroll timeline"
                onClick={() => setTool("Hand")}
              >
                <Hand size={15} />
              </button>
            </div>
            <div className="pr-track-labels">
              <span>{tc(time)}</span>
              <span>V1</span>
              <span>A1</span>
            </div>
            <div className="pr-track-scroll" ref={timeline}>
              <div
                className="pr-track-inner"
                style={{ width: `${zoom * 100}%` }}
                onPointerDown={(e) => {
                  if (tool === "Hand") {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    e.currentTarget.dataset.dragX = e.clientX;
                    e.currentTarget.dataset.scrollX =
                      timeline.current.scrollLeft;
                    return;
                  }
                  const r = e.currentTarget.getBoundingClientRect();
                  seek(((e.clientX - r.left) / r.width) * duration);
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                  if (tool === "Hand") {
                    timeline.current.scrollLeft =
                      Number(e.currentTarget.dataset.scrollX) -
                      (e.clientX - Number(e.currentTarget.dataset.dragX));
                    return;
                  }
                  const r = e.currentTarget.getBoundingClientRect();
                  seek(((e.clientX - r.left) / r.width) * duration);
                }}
              >
                <div className="pr-ruler">
                  {Array.from({ length: 13 }, (_, i) => (
                    <span key={i}>{i * 2}s</span>
                  ))}
                </div>
                <div className={`pr-clip ${selected ? "clip-selected" : ""}`}>
                  personalbrandingvideo.mp4 <span>V</span>
                </div>
                <div className="pr-audio">
                  <svg
                    viewBox="0 0 960 40"
                    preserveAspectRatio="none"
                    aria-label="Waveform derived from the exported audio"
                  >
                    {waveform.map((v, i) => (
                      <line
                        key={i}
                        x1={i * 4}
                        x2={i * 4}
                        y1={20 - v * 19}
                        y2={20 + v * 19}
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    ))}
                  </svg>
                </div>
                <div
                  className="pr-playhead"
                  style={{ left: `${(time / duration) * 100}%` }}
                />
                {marker !== null && (
                  <button
                    className="pr-marker"
                    style={{ left: `${(marker / duration) * 100}%` }}
                    title={`Review marker at ${tc(marker)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      seek(marker);
                    }}
                  >
                    ◇
                  </button>
                )}
              </div>
            </div>
            <div className="pr-meter" aria-label="Combined exported audio peak">
              <div>
                <i
                  style={{
                    height: `${peak > 0 ? Math.max(0, Math.min(100, ((20 * Math.log10(peak) + 60) / 60) * 100)) : 0}%`,
                  }}
                />
              </div>
              <small>
                0<br />
                −20
                <br />
                −40
                <br />
                −60
              </small>
            </div>
          </div>
        </section>
      </div>
      <footer className="pr-status">
        {selected ? "1 clip selected" : "Ready"}{" "}
        <span>Export review · local playback · {tc(time)}</span>
      </footer>
    </div>
  );
}
