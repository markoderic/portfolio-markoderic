import React from "react";
import { projects, resumeUrl } from "./content";
export function ProjectIcon({ project }) {
  return (
    <span
      className="project-icon"
      style={{ "--icon-color": project.color }}
      aria-hidden="true"
    >
      {project.glyph}
    </span>
  );
}
export function ExternalLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children} <span aria-hidden="true">↗</span>
    </a>
  );
}
export function NotchReference({ open }) {
  return (
    <>
      <div className="phone-wordmark">N</div>
      <p className="eyebrow">NOTCH / PROJECT REFERENCE</p>
      <h1>
        A place for
        <br />
        your everyday.
      </h1>
      <p className="lead">
        An iPhone planner designed and built by Marko Deric.
      </p>
      <div className="reference-label">
        Project reference · September 2026
        <br />
        Explore the product story and browser sample.
      </div>
      <h2>From a day to a semester.</h2>
      <p>
        Notch brings a dashboard, school, calendar and notes into a native
        SwiftUI planner.
      </p>
      <h2>Designed and built by Marko.</h2>
      <p>
        Explore the project overview for the product story and engineering
        context, or find Notch on the App Store.
      </p>
      <button className="primary" onClick={() => open("notch")}>
        Read the Notch project →
      </button>
      <ExternalLink href={projects.find((p) => p.id === "notch").url}>
        View on the App Store
      </ExternalLink>
      <p className="source-note">
        The browser sample uses fictional data and does not connect native
        services or accounts.
      </p>
    </>
  );
}
export default function Document({ id, open, navigate }) {
  const project = projects.find((p) => p.id === id);
  if (project)
    return (
      <article className="document project-document">
        <div className="project-heading">
          <ProjectIcon project={project} />
          <div>
            <p className="eyebrow">{project.category}</p>
            <h1>{project.title}</h1>
          </div>
        </div>
        <p className="lead">{project.description}</p>
        <p className="reference-label">
          {project.app} workspace · Project overview
        </p>
        <h2>The work</h2>
        <p>{project.detail}</p>
        {id === "animalfeed" && (
          <img
            className="channel-image"
            src="/animalfeedpfp.jpeg"
            alt="AnimalFeed channel artwork"
          />
        )}
        {id === "film" && (
          <>
            <video
              className="film"
              controls
              playsInline
              preload="metadata"
              src="/personalbrandingvideo.mp4"
            />
            <p className="source-note">
              Finished film export. Captions and a transcript are unavailable.
            </p>
            <a
              href="/personalbrandingvideo.mp4"
              target="_blank"
              rel="noreferrer"
            >
              Open the original film ↗
            </a>
          </>
        )}
        <h2>Evidence & context</h2>
        <p>{project.evidence}</p>
        {id === "notch" && (
          <button className="primary" onClick={() => navigate("phone")}>
            Pick up the Notch phone →
          </button>
        )}
        {project.url && (
          <p>
            <ExternalLink href={project.url}>{project.link}</ExternalLink>
          </p>
        )}
        <h2>Explore the project</h2>
        <p>{project.next}</p>
        <p className="source-note">
          These software-inspired workspaces present my projects within this
          website.
        </p>
        <button onClick={() => open("projects")}>← All projects</button>
      </article>
    );
  if (id === "projects")
    return (
      <article className="document projects-document">
        <p className="eyebrow">MARKO DERIC / SELECTED WORK</p>
        <h1>Projects</h1>
        <p className="muted">
          Apps, websites and film. Select a project to read more.
        </p>
        <div className="project-list">
          {projects.map((p) => (
            <button
              key={p.id}
              className="project-row"
              onClick={() => open(p.id)}
            >
              <ProjectIcon project={p} />
              <span>
                <strong>{p.title}</strong>
                <small>
                  {p.category} · {p.app}
                </small>
              </span>
              <span className="row-arrow" aria-hidden="true">
                ↗
              </span>
            </button>
          ))}
        </div>
        <p className="source-note">
          Project overviews · Film playback and original links included.
        </p>
      </article>
    );
  if (id === "about")
    return (
      <article className="document">
        <p className="eyebrow">A LITTLE ABOUT ME</p>
        <h1>Hi, I'm Marko.</h1>
        <p className="lead">
          I like the part where an idea turns into something real you can open
          and use.
        </p>
        <p>
          I'm an interactive media and design student at Miami University. My
          work spans native apps, websites, editing and short-form content.
        </p>
        <h2>Things I've been working on</h2>
        <p>
          I designed and built Notch for iPhone. AnimalFeed is where I
          experiment with short-form video, pacing and channel identity. This
          portfolio brings those different kinds of work into one place.
        </p>
        <div className="inline-actions">
          <button onClick={() => open("projects")}>Explore projects</button>
          <button onClick={() => open("resume")}>Read my resume</button>
          <button onClick={() => open("contact")}>Get in touch</button>
        </div>
        <p className="source-note">
          More about my experience is available in my resume.
        </p>
      </article>
    );
  if (id === "resume")
    return (
      <article className="document">
        <p className="eyebrow">MARKO DERIC / 2026</p>
        <h1>Resume</h1>
        <p className="lead">The current resume, in its original PDF.</p>
        <div className="inline-actions">
          <ExternalLink href={resumeUrl}>Open PDF</ExternalLink>
          <a href={resumeUrl} download="Marko Deric Resume 2026.pdf">
            Download resume ↓
          </a>
        </div>
        <object
          className="resume-pdf"
          data={resumeUrl}
          type="application/pdf"
          aria-label="Marko Deric Resume 2026"
        >
          <p>
            Your browser doesn't show inline PDFs. Use Open PDF or Download
            resume above.
          </p>
        </object>
        <p className="source-note">
          Marko Deric · Resume · September 2026
        </p>
      </article>
    );
  if (id === "contact")
    return (
      <article className="document">
        <p className="eyebrow">SAY HELLO</p>
        <h1>Let's talk.</h1>
        <p className="lead">
          Have a role, a project, or something interesting in mind?
        </p>
        <div className="contact-links">
          <a href="mailto:markoderic04@gmail.com">
            <small>EMAIL</small>markoderic04@gmail.com ↗
          </a>
          <ExternalLink href="https://www.linkedin.com/in/markoderic/">
            Connect on LinkedIn
          </ExternalLink>
        </div>
        <p className="source-note">
          The email link opens your mail app before you send a message.
        </p>
      </article>
    );
  return (
    <article className="document">
      <p className="eyebrow">MAKE YOURSELF AT HOME</p>
      <h1>Controls & credits</h1>
      <h2>Explore the workspace</h2>
      <p>
        Click the laptop or phone, or use their labeled buttons. Back to desk is
        always available. Projects, About, Resume and Contact also work with the
        3D scene turned off.
      </p>
      <h2>Use the desktop</h2>
      <p>
        Click once to select a desktop icon; double-click to open it. Tap or
        press Enter to open. Drag a window by its title bar. Close removes it;
        Minimize keeps it in the dock. Maximize makes room to read.
      </p>
      <h2>Keyboard</h2>
      <p>
        Tab moves between controls. Enter or Space activates a button. Arrow
        keys move inside menus. Escape dismisses the current menu or local
        interaction before returning to the desk.
      </p>
      <h2>Motion</h2>
      <p>
        Simple view provides direct access to the applications. Your system's
        reduced-motion preference is respected. Use Control Center to adjust
        or mute sound.
      </p>
      <h2>Phone model</h2>
      <p>
        “Apple iPhone 15 Pro Max Black” by polyman, licensed under CC BY 4.0.
        Reoriented and scaled for this portfolio, with the display replaced
        by live HTML.
      </p>
      <div className="inline-actions">
        <ExternalLink href="https://sketchfab.com/3d-models/apple-iphone-15-pro-max-black-df17520841214c1792fb8a44c6783ee7">
          Model source
        </ExternalLink>
        <ExternalLink href="https://creativecommons.org/licenses/by/4.0/">
          CC BY 4.0 license
        </ExternalLink>
      </div>
      <h2>Built here</h2>
      <p>
        The desk, plant, lamp, printer, chair, screen UI and interaction system
        were created for this portfolio. The laptop uses “macbook pro M3 16
        inch 2024” by jackbaeten, licensed under CC BY 4.0, with transformed
        geometry and a live HTML display. Full model credits are available in
        the desktop’s Controls & credits app.
      </p>
    </article>
  );
}
