import React, { useEffect, useState } from "react";
import {
  Search,
  Folder,
  FileText,
  User,
  Briefcase,
  Mail,
  Download,
  ExternalLink,
} from "lucide-react";
import { resumeUrl, projects } from "../content";
import resumePage from "../assets/resume-page.png";
import AppIcon from "../AppIcon";
export function Finder({ open, onResume, initialSection }) {
  const initialDocument = location.hash.replace(/^#\/?/, "").replace(/\/$/, "");
  const [folder, setFolder] = useState(
      ["about", "experience"].includes(initialDocument)
        ? initialDocument
        : initialSection || "work",
    ),
    [query, setQuery] = useState("");
  useEffect(() => {
    const change = (e) => setFolder(e.detail);
    addEventListener("workspace-document", change);
    return () => removeEventListener("workspace-document", change);
  }, []);
  return (
    <div className="finder-app">
      <aside>
        <h3>Favorites</h3>
        {[
          ["work", "Work", Folder],
          ["experience", "Experience", Briefcase],
          ["about", "About", User],
          ["resume", "Resume", FileText],
        ].map(([id, title, Icon]) => (
          <button
            key={id}
            aria-pressed={folder === id}
            onClick={() => {
              setFolder(id);
              setQuery("");
            }}
          >
            <Icon size={14} />
            {title}
          </button>
        ))}
      </aside>
      <section>
        <header>
          <strong>{folder[0].toUpperCase() + folder.slice(1)}</strong>
          <label className="app-search">
            <Search size={13} />
            <input
              aria-label="Search work"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFolder("work");
              }}
              placeholder="Search work"
            />
          </label>
        </header>
        <div className="finder-body">
          {folder === "work" ? (
            <div className="finder-files">
              {projects
                .filter((p) =>
                  `${p.title} ${p.category}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((p) => (
                  <button
                    key={p.id}
                    onDoubleClick={() =>
                      open(p.id === "notch" ? "xcode" : p.id)
                    }
                    onClick={(e) => {
                      if (e.detail === 0)
                        open(p.id === "notch" ? "xcode" : p.id);
                    }}
                    onPointerUp={(e) => {
                      if (e.pointerType === "touch")
                        open(p.id === "notch" ? "xcode" : p.id);
                    }}
                  >
                    <AppIcon
                      id={
                        {
                          animalfeed: "youtube",
                          film: "premiere",
                          notch: "xcode",
                          portfolio: "vscode",
                        }[p.id]
                      }
                    />
                    <strong>{p.title}</strong>
                    <small>{p.category}</small>
                  </button>
                ))}
            </div>
          ) : folder === "resume" ? (
            <>
              <h1>Marko Deric</h1>
              <p>Current resume · 2026</p>
              <div className="career-actions">
                <button onClick={onResume}>
                  <FileText size={14} /> View resume
                </button>
                <a href={resumeUrl} download>
                  <Download size={14} /> Download PDF
                </a>
              </div>
              <img
                className="resume-miniature"
                src={resumePage}
                alt="First page of Marko Deric's current resume"
              />
            </>
          ) : folder === "about" ? (
            <article>
              <small>ABOUT</small>
              <h1>Marko Deric</h1>
              <p>
                I build apps, websites, and video projects. I’m studying
                Emerging Technology in Business & Design at Miami University,
                graduating in May 2027.
              </p>
              <p>
                Notch is my native iPhone planner. I designed, built, and
                published it, and continue to maintain it after launch.
              </p>
              <p>
                I also run Sites by Marko and experiment with short-form video
                through AnimalFeed.
              </p>
              <div className="career-actions">
                <button onClick={onResume}>View resume</button>
                <button onClick={() => open("mail")}>Contact</button>
              </div>
            </article>
          ) : (
            <article>
              <small>EXPERIENCE</small>
              <h1>Work across design and development.</h1>
              <h2>Teaching Assistant · Miami University</h2>
              <p>
                IMS 322: Intermediate Interaction Design and Development
                <br />
                August–December 2026
              </p>
              <p>
                Support 40+ students across two sections with HTML, JavaScript,
                debugging, and course projects.
              </p>
              <h2>Sites by Marko</h2>
              <p>
                Founded a freelance web development business, building
                responsive websites and tools for daily operations.
              </p>
              <h2>Social Media Manager · Alpha Sigma Phi</h2>
              <p>
                August 2024–present. Manage content for the chapter’s Instagram,
                including posts and reels for recruitment and events.
              </p>
              <small>Experience details from my 2026 resume.</small>
            </article>
          )}
        </div>
        <footer>
          {folder === "work"
            ? `${projects.filter((p) => `${p.title} ${p.category}`.toLowerCase().includes(query.toLowerCase())).length} items · Double-click to open · Enter or tap also opens`
            : "Marko Deric"}
        </footer>
      </section>
    </div>
  );
}
export function Preview() {
  const [zoom, setZoom] = useState(100);
  return (
    <div className="preview-app">
      <header>
        <strong>Marko Deric Resume 2026.pdf</strong>
        <div>
          <button
            aria-label="Zoom out resume"
            onClick={() => setZoom((z) => Math.max(50, z - 25))}
          >
            −
          </button>
          <output>{zoom}%</output>
          <button
            aria-label="Zoom in resume"
            onClick={() => setZoom((z) => Math.min(200, z + 25))}
          >
            +
          </button>
          <a href={resumeUrl} download>
            Download PDF
          </a>
          <a href={resumeUrl} target="_blank" rel="noreferrer">
            Open PDF ↗
          </a>
        </div>
      </header>
      <div className="resume-scroll">
        <img
          style={{ width: `${zoom}%` }}
          src={resumePage}
          alt="Marko Deric resume. Accessible original PDF available via Open PDF and Download PDF."
        />
      </div>
      <footer>Page 1 of 1 · Marko Deric · 2026</footer>
    </div>
  );
}
export function Contact() {
  const [copied, setCopied] = useState("");
  const email = "markoderic04@gmail.com";
  return (
    <div className="mail-app">
      <header>
        <Mail size={18} /> New message
      </header>
      <dl>
        <dt>To</dt>
        <dd>Marko Deric &lt;{email}&gt;</dd>
        <dt>Subject</dt>
        <dd>Let’s talk</dd>
      </dl>
      <div>
        <h1>Get in touch.</h1>
        <p>For work, project questions, or a conversation.</p>
        <a className="contact-address" href={`mailto:${email}`}>
          {email}
        </a>
        <div className="career-actions">
          <a href={`mailto:${email}?subject=Let%E2%80%99s%20talk`}>
            Open email app ↗
          </a>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(email);
                setCopied("Email copied.");
              } catch {
                setCopied("Copy is unavailable. Select the address above.");
              }
            }}
          >
            Copy address
          </button>
        </div>
        <p role="status">{copied}</p>
        <a
          href="https://www.linkedin.com/in/markoderic"
          target="_blank"
          rel="noreferrer"
        >
          LinkedIn ↗
        </a>
      </div>
      <footer>Your email app opens before anything is sent.</footer>
    </div>
  );
}
export function Controls() {
  return (
    <article className="controls-app">
      <h1>Workspace controls</h1>
      <dl>
        <dt>Desktop</dt>
        <dd>
          Click once to select; double-click to open. Tap or press Enter to
          open. Dock icons launch or restore with one click.
        </dd>
        <dt>Windows</dt>
        <dd>
          Drag the title bar. Red closes, yellow minimizes, green maximizes.
          Window menu provides movement and reset commands.
        </dd>
        <dt>Devices</dt>
        <dd>
          View menu or the small Workspace menu returns to the desk or phone.
          Your windows and sample edits stay in place.
        </dd>
        <dt>Lighting and sound</dt>
        <dd>
          Click the lamp or use Control Center. Lamp on is night; lamp off is
          day. Sound can be muted and adjusted.
        </dd>
        <dt>Resume</dt>
        <dd>
          The printer presents the current resume. View now skips the page feed.
          Download PDF is immediate.
        </dd>
        <dt>Media</dt>
        <dd>
          In the focused Premiere workspace: Space plays or pauses; arrows step
          one frame. Inputs and browser shortcuts keep their usual behavior.
        </dd>
        <dt>Phone</dt>
        <dd>
          Scroll the bottom tabs for more sections. Sample changes stay in
          memory until reload or Reset sample data. Undo restores the most
          recent change.
        </dd>
      </dl>
      <h2>Credits</h2>
      <p>
        Laptop: “macbook pro M3 16 inch 2024” by <a href="https://sketchfab.com/jackbaeten" target="_blank" rel="noreferrer">jackbaeten</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.
        Root transforms baked, uniformly scaled, transparent parts removed and compatible
        materials/geometry merged; wallpaper replaced with a dark backing and live HTML.
        No endorsement implied.
      </p>
      <a href="https://sketchfab.com/3d-models/macbook-pro-m3-16-inch-2024-8e34fc2b303144f78490007d91ff57c4" target="_blank" rel="noreferrer">Laptop model source ↗</a>
      <p>
        Phone: Apple iPhone 15 Pro Max Black by Polyman, CC BY 4.0. Reoriented
        and scaled; display replaced with live HTML.
      </p>
      <a
        href="https://sketchfab.com/3d-models/apple-iphone-15-pro-max-black-df17520841214c1792fb8a44c6783ee7"
        target="_blank"
        rel="noreferrer"
      >
        Phone model source ↗
      </a>
      <p>
        Desk, plant, lamp, printer, chair, and application icon
        illustrations are authored for this portfolio. Interface symbols use
        Lucide (ISC). Software names belong to their respective owners.
      </p>
    </article>
  );
}
