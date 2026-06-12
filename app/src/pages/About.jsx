import { Link } from "react-router-dom";
import DisplayCards from "../components/DisplayCards.jsx";

export default function About() {
  return (
    <main id="top">
      <section className="page-hero" aria-labelledby="aboutHeroTitle">
        <div className="page-hero-grid" aria-hidden="true"></div>
        <div className="page-hero-inner">
          <p className="eyebrow" data-reveal>About / Marko Deric</p>
          <h1 className="page-title" id="aboutHeroTitle">
            <span className="line"><i>I build things</i></span>
            <span className="line"><i>people use.</i></span>
          </h1>
          <p className="page-lead" data-reveal>
            I'm an interactive media &amp; design student. I like the part where an idea turns into something real you can open and use.
          </p>
          <div className="page-hero-meta" data-reveal>
            <div><span>Discipline</span><strong>Interactive media &amp; design</strong></div>
            <div><span>Focus</span><strong>Front-end · product · content</strong></div>
            <div><span>Approach</span><strong>Clarify, shape, ship</strong></div>
          </div>
        </div>
      </section>

      {/* Statement */}
      <section className="about-band" aria-label="Approach">
        <div className="about-inner">
          <p className="section-kicker" data-reveal>What I care about</p>
          <h2 className="about-statement" data-reveal-words>
            I like work that feels clear and unforced — good structure, motion with a reason, and details that still make sense up close, whether it's a landing page or a 7,800-line app.
          </h2>
        </div>
      </section>

      {/* Profile + resume */}
      <section className="section profile-section" id="profile" aria-labelledby="profileTitle">
        <div className="profile-copy" data-reveal>
          <p className="section-kicker">Profile</p>
          <h2 id="profileTitle">I work across design, media, and business.</h2>
          <p>
            I'm interested in the overlap between front-end development, product design, creative direction, business communication, and digital storytelling. I taught myself to build by building — most recently a complete personal-planner web app, from data model to motion.
          </p>
          <div className="profile-points">
            <span>Web &amp; product builds</span>
            <span>Dashboard &amp; interface design</span>
            <span>Video editing &amp; content systems</span>
            <span>Brand-minded presentation</span>
          </div>
          <button className="button button-dark" type="button" data-open-resume data-magnetic>View resume</button>
        </div>

        <button className="resume-preview" type="button" data-open-resume aria-label="Open resume preview" data-reveal>
          <img src="/markodericresume2026.png" alt="Resume preview for Marko Deric" />
        </button>
      </section>

      {/* Skills */}
      <section className="section" id="skills" aria-labelledby="skillsTitle">
        <div className="skills-split">
          <div className="skills-copy">
            <p className="section-kicker" data-reveal>How I work</p>
            <h2 id="skillsTitle" data-reveal>I can take an idea from a rough sketch to something finished.</h2>
            <p className="skills-lead" data-reveal>
              Every project runs the same loop — design it, build it, then tell its story. Click a card to read what each part means.
            </p>
            <div className="skills-chips" data-reveal aria-label="Tools and skills">
              <span>UI design</span><span>Design systems</span><span>Prototyping</span><span>Motion</span>
              <span>HTML &amp; CSS</span><span>JavaScript</span><span>PWAs</span><span>State &amp; data</span>
              <span>Video editing</span><span>Branding</span><span>Short-form</span><span>Copy</span>
            </div>
          </div>
          <div className="skills-stack" data-reveal>
            <DisplayCards />
          </div>
        </div>
      </section>

      {/* Numbers — pinned band: hairline draws + counts fire in sequence */}
      <div className="dark-wrap">
        <section className="spec-band stats-pin" data-scrub data-count-seq aria-label="By the numbers">
          <div className="stats-pin-sticky">
            <div className="stats-head">
              <p className="section-kicker">By the numbers</p>
              <h2>What building solo actually adds up to.</h2>
            </div>
            <div className="stat-hairline" aria-hidden="true"><span></span></div>
            <div className="stat-grid" data-stagger>
              <div className="stat" data-reveal><strong data-count="5">0</strong><span>Shipped projects in the portfolio</span></div>
              <div className="stat" data-reveal><strong data-count="9">0</strong><span>Modules in the planner app</span></div>
              <div className="stat" data-reveal><strong data-count="7800" data-count-suffix="+">0</strong><span>Lines of code, hand-written</span></div>
              <div className="stat" data-reveal><strong data-count="100" data-count-suffix="%">0</strong><span>Built &amp; designed solo</span></div>
            </div>
          </div>
        </section>
      </div>

      {/* Scroll-zoom video */}
      <section className="video-zoom" data-scrub data-video-zoom aria-labelledby="filmTitle">
        <div className="video-zoom-sticky">
          <div className="video-zoom-head">
            <p className="section-kicker">Personal brand in motion</p>
            <h2 id="filmTitle">Scroll down and it plays.</h2>
          </div>
          <div className="video-zoom-frame">
            <video data-zoom-video muted loop playsInline controls preload="metadata">
              <source src="/personalbrandingvideo.mp4" type="video/mp4" />
            </video>
            <span className="video-zoom-hint" aria-hidden="true">Scroll to zoom in</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="contact-section" aria-labelledby="aboutCtaTitle">
        <div className="contact-inner">
          <div className="contact-lead" data-reveal>
            <p className="section-kicker">Work with me</p>
            <h2 id="aboutCtaTitle">I'm looking for the next thing to build.</h2>
            <p>Open to internships, product and web projects, campus media, and collaborations across design and technology.</p>
            <div className="hero-actions" style={{ marginTop: 6 }}>
              <Link className="button button-light" to="/contact" data-magnetic>Start a project</Link>
              <Link className="button button-ghost" to="/projects" data-magnetic>See the work</Link>
            </div>
          </div>
          <div className="contact-links" data-reveal>
            <a href="mailto:markoderic04@gmail.com" data-magnetic><span>Email</span><strong>markoderic04@gmail.com</strong></a>
            <a href="https://www.linkedin.com/in/markoderic/" target="_blank" rel="noopener" data-magnetic><span>LinkedIn</span><strong>Connect professionally</strong></a>
          </div>
        </div>
      </section>
    </main>
  );
}
