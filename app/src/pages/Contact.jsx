export default function Contact() {
  return (
    <main id="top">
      <section className="page-hero" style={{ minHeight: "58svh" }} aria-labelledby="contactHeroTitle">
        <div className="page-hero-grid" aria-hidden="true"></div>
        <div className="page-hero-inner">
          <p className="eyebrow" data-reveal>Contact / Start a project</p>
          <h1 className="page-title" id="contactHeroTitle">
            <span className="line"><i>Let's build</i></span>
            <span className="line"><i>something.</i></span>
          </h1>
          <p className="page-lead" data-reveal>
            Internships, product and web work, dashboards, social content, brand polish — if it lives at the meeting of design and technology, I want to hear about it.
          </p>
        </div>
      </section>

      <section className="contact-page" aria-labelledby="contactFormTitle">
        <div className="contact-page-lead" data-reveal>
          <p className="section-kicker">Get in touch</p>
          <h2 id="contactFormTitle">Tell me what you want to make.</h2>
          <p>Fill out the brief and I'll reply with a clear, considered plan — usually within a day or two. Prefer to skip the form? Reach me directly below.</p>

          <div className="contact-direct">
            <a href="mailto:markoderic04@gmail.com" data-magnetic>
              <span>Email</span><strong>markoderic04@gmail.com</strong>
            </a>
            <a href="https://www.linkedin.com/in/markoderic/" target="_blank" rel="noopener" data-magnetic>
              <span>LinkedIn</span><strong>in/markoderic</strong>
            </a>
            <a href="https://www.youtube.com/@animalfeedreal" target="_blank" rel="noopener" data-magnetic>
              <span>YouTube</span><strong>@animalfeedreal</strong>
            </a>
          </div>
        </div>

        <div className="contact-form-panel" data-reveal>
          <div className="contact-form-title">
            <h3>Project brief</h3>
            <p>A few quick questions so I can come back with something useful.</p>
          </div>
          <form className="project-form" action="https://formspree.io/f/xpqnqaaa" method="POST" data-project-form>
            <input type="hidden" name="_subject" value="New portfolio project inquiry" />
            <label><span>Name</span><input name="name" type="text" autoComplete="name" required /></label>
            <label><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
            <label>
              <span>Project type</span>
              <select name="type" required defaultValue="">
                <option value="">Choose one</option>
                <option>Website or landing page</option>
                <option>Web app or dashboard</option>
                <option>Video or social content</option>
                <option>Brand or portfolio polish</option>
                <option>Something else</option>
              </select>
            </label>
            <label>
              <span>Timeline</span>
              <select name="timeline" required defaultValue="">
                <option value="">Choose one</option>
                <option>ASAP</option>
                <option>2-4 weeks</option>
                <option>1-2 months</option>
                <option>Flexible</option>
              </select>
            </label>
            <label>
              <span>Budget range</span>
              <select name="budget" defaultValue="">
                <option value="">Choose one</option>
                <option>Student/campus budget</option>
                <option>Under $500</option>
                <option>$500-$1,500</option>
                <option>$1,500+</option>
                <option>Not sure yet</option>
              </select>
            </label>
            <label className="form-wide">
              <span>Project details</span>
              <textarea
                name="details"
                rows="5"
                placeholder="What are you trying to make, who is it for, and what does success look like?"
                required
              ></textarea>
            </label>
            <button className="button button-dark form-wide" type="submit" data-submit-button>Send project brief</button>
            <p className="form-status form-wide" role="status" aria-live="polite" data-form-status></p>
          </form>
        </div>
      </section>
    </main>
  );
}
