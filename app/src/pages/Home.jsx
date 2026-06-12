import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main id="top">
      <section className="hero" aria-labelledby="heroTitle">
        <canvas className="hero-grid" data-hero-grid aria-hidden="true"></canvas>

        {/* Quick-scan facts for recruiters/clients: availability, proof, stack */}
        <aside className="hero-side" aria-label="Quick facts">
          <div className="hero-side-card" data-reveal>
            <span className="hero-side-kicker"><i className="hero-side-dot" aria-hidden="true"></i>Availability</span>
            <strong>Open to internships &amp; projects</strong>
            <p>Product, web, and content work.</p>
          </div>
          <div className="hero-side-card" data-reveal>
            <span className="hero-side-kicker">Proof, not promises</span>
            <strong>5 builds shipped · 3M+ views</strong>
            <p>Real products and a content channel with real reach.</p>
          </div>
          <div className="hero-side-card" data-reveal>
            <span className="hero-side-kicker">Core stack</span>
            <strong>JavaScript · React · Three.js</strong>
            <p>Plus Premiere Pro &amp; CapCut for motion and story.</p>
          </div>
        </aside>

        <div className="hero-inner">
          <p className="eyebrow" data-reveal>Interactive media &amp; design / web / product / content</p>
          <div className="hero-name-stage">
            <h1 className="hero-name" id="heroTitle" data-text="Marko Deric" data-name-ref>
              <span data-word="Marko" data-reveal-line><i>Marko</i></span>
              <span data-word="Deric" data-reveal-line><i>Deric</i></span>
            </h1>
            <div className="metal-name" data-metal-name data-text="Marko|Deric" aria-hidden="true"></div>
          </div>
          <p className="hero-statement" data-reveal>
            I design and build digital products — a mobile-first planner app, dashboards, websites, and video. I care about clear layouts, motion that has a reason, and the small details you only notice up close.
          </p>

          <div className="hero-actions" aria-label="Primary actions" data-reveal>
            <Link className="button button-light" to="/projects" data-magnetic>View the work</Link>
            <Link className="button button-ghost" to="/contact" data-magnetic>Start a project</Link>
            <button className="button button-ghost" type="button" data-open-resume data-magnetic>Resume</button>
          </div>
        </div>

        <div className="hero-micro-grid" aria-label="Portfolio highlights">
          <Link to="/projects" data-reveal>
            <span>Latest build</span>
            <strong>Personal Planner</strong>
          </Link>
          <Link to="/projects" data-reveal>
            <span>Featured</span>
            <strong>PulseBudget</strong>
          </Link>
          <Link to="/about" data-reveal>
            <span>The maker</span>
            <strong>About Marko</strong>
          </Link>
        </div>

        <div className="hero-scroll" aria-hidden="true">
          <span>Scroll</span>
          <span className="hero-scroll-line"></span>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track" data-marquee>
          <span>Product Design</span><span className="marquee-dot"></span>
          <span>Front-End Development</span><span className="marquee-dot"></span>
          <span>Progressive Web Apps</span><span className="marquee-dot"></span>
          <span>Dashboard UI</span><span className="marquee-dot"></span>
          <span>Video Content</span><span className="marquee-dot"></span>
          <span>Creative Direction</span><span className="marquee-dot"></span>
          <span>Product Design</span><span className="marquee-dot"></span>
          <span>Front-End Development</span><span className="marquee-dot"></span>
          <span>Progressive Web Apps</span><span className="marquee-dot"></span>
          <span>Dashboard UI</span><span className="marquee-dot"></span>
          <span>Video Content</span><span className="marquee-dot"></span>
          <span>Creative Direction</span><span className="marquee-dot"></span>
        </div>
      </div>

      {/* Featured: Personal Planner */}
      <div className="dark-wrap">
        <section className="feature-project on-dark" id="planner" aria-labelledby="plannerTitle">
          <div className="feature-project-copy" data-reveal>
            <p className="project-tag">Latest &amp; most advanced</p>
            <h2 id="plannerTitle">Personal Planner — one place for everything you're juggling.</h2>
            <p>
              A mobile-first installable web app that folds tasks, finance, school, calendar, health, notes and travel into one calm system. Built solo from scratch — works offline, remembers everything, and feels like a native app.
            </p>

            <div className="project-facts" aria-label="Personal Planner details">
              <span>Progressive Web App</span>
              <span>9 modules</span>
              <span>Offline-first</span>
              <span>~7,800 lines</span>
            </div>

            <div className="hero-actions">
              <Link className="button button-light" to="/projects" data-magnetic>Explore the build</Link>
              <a className="button button-ghost" href="https://markoderic.github.io/planner-app/" target="_blank" rel="noopener" data-magnetic>Open live app</a>
            </div>
          </div>

          <div className="feature-project-sticky">
            <div className="showcase-stage" data-reveal>
              <div className="iphone-viewer" data-iphone="overview" data-screenshot="/planner-app-screenshot.png" aria-hidden="true"></div>
              <div className="device-phone">
                <span className="device-glow" aria-hidden="true"></span>
                <span className="device-buttons" aria-hidden="true"></span>
                <div className="device-screen">
                  <img src="/planner-app-screenshot.png" alt="Personal Planner dashboard showing daily focus, money, school and bills cards" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="section section-light" id="capabilities" aria-labelledby="capabilitiesTitle">
        <div className="section-heading">
          <p className="section-kicker" data-reveal>What I do</p>
          <h2 id="capabilitiesTitle" data-reveal>A focused range across product, web, and content.</h2>
        </div>

        <div className="service-grid" data-stagger>
          <Link className="service-card" to="/projects" aria-label="View the Personal Planner app" data-reveal data-tilt-card>
            <img src="/planner-app-screenshot.png" alt="" />
            <div className="service-overlay"></div>
            <div className="service-head">
              <h3>Product / Apps</h3>
              <span>/PWA</span>
            </div>
            <div className="service-tags" aria-hidden="true">
              <span>Web Apps</span>
              <span>Offline-first</span>
              <span>State &amp; Data</span>
              <span>Mobile UX</span>
            </div>
          </Link>

          <Link className="service-card" to="/projects" aria-label="View dashboard interface work" data-reveal data-tilt-card>
            <img src="/finance-tracker-screenshot.png" alt="" />
            <div className="service-overlay"></div>
            <div className="service-head">
              <h3>Dashboard UI</h3>
              <span>/data</span>
            </div>
            <div className="service-tags" aria-hidden="true">
              <span>Data Stories</span>
              <span>Scannable Layouts</span>
              <span>Financial Tools</span>
              <span>UI Systems</span>
            </div>
          </Link>

          <Link className="service-card" to="/projects" aria-label="View web interface work" data-reveal data-tilt-card>
            <img src="/productcatalogscreenshot.jpeg" alt="" />
            <div className="service-overlay"></div>
            <div className="service-head">
              <h3>Web Interfaces</h3>
              <span>/sites</span>
            </div>
            <div className="service-tags" aria-hidden="true">
              <span>Responsive Layout</span>
              <span>Product Pages</span>
              <span>Interaction Polish</span>
            </div>
          </Link>

          <Link className="service-card" to="/projects" aria-label="View video and media work" data-reveal data-tilt-card>
            <video autoPlay muted loop playsInline preload="metadata">
              <source src="/personalbrandingvideo.mp4" type="video/mp4" />
            </video>
            <div className="service-overlay"></div>
            <div className="service-head">
              <h3>Video Content</h3>
              <span>/film</span>
            </div>
            <div className="service-tags" aria-hidden="true">
              <span>Personal Branding</span>
              <span>Editing Rhythm</span>
              <span>Short-form Cuts</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Horizontal pinned gallery */}
      <section className="hgallery" data-hgallery aria-labelledby="galleryTitle">
        <div className="hgallery-sticky">
          <div className="hgallery-head" data-skew>
            <p className="section-kicker">Selected work</p>
            <h2 id="galleryTitle">A few things worth your scroll.</h2>
          </div>
          <div className="hgallery-track" data-hgallery-track>
            <Link className="hcard" to="/projects">
              <div className="hcard-media"><img src="/planner-app-screenshot.png" alt="Personal Planner app" /></div>
              <div className="hcard-foot"><span>01 / Product</span><strong>Personal Planner</strong></div>
            </Link>
            <Link className="hcard" to="/projects">
              <div className="hcard-media"><img src="/finance-tracker-screenshot.png" alt="PulseBudget dashboard" /></div>
              <div className="hcard-foot"><span>02 / Dashboard</span><strong>PulseBudget</strong></div>
            </Link>
            <Link className="hcard" to="/projects">
              <div className="hcard-media"><img src="/productcatalogscreenshot.jpeg" alt="Streetwear catalog" /></div>
              <div className="hcard-foot"><span>03 / Web</span><strong>Streetwear Catalog</strong></div>
            </Link>
            <Link className="hcard" to="/projects">
              <div className="hcard-media"><img src="/animalfeedpfp.jpeg" alt="Animal Feed channel" /></div>
              <div className="hcard-foot"><span>04 / Content</span><strong>Animal Feed · 3M+ views</strong></div>
            </Link>
            <Link className="hcard hcard-cta" to="/projects">
              <div className="hcard-foot">
                <span>Everything</span>
                <strong>View all projects</strong>
              </div>
              <span className="hcard-arrow" aria-hidden="true"></span>
            </Link>
          </div>
        </div>
      </section>

      {/* About teaser */}
      <section className="about-band" id="about" aria-labelledby="aboutTitle">
        <div className="about-inner">
          <p className="section-kicker" data-reveal>About</p>
          <h2 id="aboutTitle" className="about-statement" data-reveal-words>
            I like work that feels clear and unforced — good structure, motion with a reason, and details that still make sense up close.
          </h2>
          <div className="hero-actions" data-reveal style={{ marginTop: 40 }}>
            <Link className="button button-ghost" to="/about" data-magnetic>More about me</Link>
            <button className="button button-ghost" type="button" data-open-resume data-magnetic>View resume</button>
          </div>
        </div>
      </section>

      {/* Metallic logo cube */}
      <section className="cube-band" aria-hidden="true">
        <div className="cube-band-inner">
          <div className="about-cube" data-metal-cube></div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="contact-section" id="contact" aria-labelledby="contactTitle">
        <div className="contact-inner">
          <div className="contact-lead" data-reveal>
            <p className="section-kicker">Contact</p>
            <h2 id="contactTitle">Got something you want to build?</h2>
            <p>
              Open to internships, product and web projects, campus media, social content, and collaborations that combine business, design, and technology.
            </p>
            <div className="hero-actions" style={{ marginTop: 6 }}>
              <Link className="button button-light" to="/contact" data-magnetic>Start a project</Link>
            </div>
          </div>

          <div className="contact-links" data-reveal>
            <a href="mailto:markoderic04@gmail.com" data-magnetic>
              <span>Email</span>
              <strong>markoderic04@gmail.com</strong>
            </a>
            <a href="https://www.linkedin.com/in/markoderic/" target="_blank" rel="noopener" data-magnetic>
              <span>LinkedIn</span>
              <strong>Connect professionally</strong>
            </a>
            <a href="https://markoderic.github.io/planner-app/" target="_blank" rel="noopener" data-magnetic>
              <span>Live app</span>
              <strong>Personal Planner</strong>
            </a>
          </div>
        </div>
      </section>

      <button className="floating-action" type="button" data-open-project aria-label="Open project form" data-magnetic>
        <span>Start a project</span>
        <span className="cta-dots" aria-hidden="true"></span>
      </button>
    </main>
  );
}
