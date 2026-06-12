// Faithful ports of the vanilla resume + project modals. The open/close +
// form-submit wiring is handled by site.js via the data-* hooks below.

export function ResumeModal() {
  return (
    <div className="modal resume-modal" id="resumeModal" aria-hidden="true">
      <div className="modal-backdrop" data-close-resume></div>
      <section className="resume-dialog" role="dialog" aria-modal="true" aria-labelledby="resumeTitle">
        <div className="resume-modal-header">
          <div>
            <p className="resume-kicker">Resume</p>
            <h2 id="resumeTitle">Marko Deric</h2>
          </div>
          <div className="resume-modal-actions">
            <a className="resume-download" href="/markodericresume2026.pdf" target="_blank" rel="noopener">
              Open PDF
            </a>
            <button className="resume-close" type="button" aria-label="Close resume" data-close-resume>
              Close
            </button>
          </div>
        </div>
        <div className="resume-viewer">
          <img src="/markodericresume2026.png" alt="Resume for Marko Deric" />
        </div>
      </section>
    </div>
  );
}

export function ProjectModal() {
  return (
    <div className="modal project-modal" id="projectModal" aria-hidden="true">
      <div className="modal-backdrop" data-close-project></div>
      <section className="project-dialog" role="dialog" aria-modal="true" aria-labelledby="projectTitle">
        <div className="modal-header">
          <div>
            <p className="resume-kicker">Start a project</p>
            <h2 id="projectTitle">Tell me what you want to build.</h2>
          </div>
          <button className="resume-close" type="button" aria-label="Close project form" data-close-project>
            Close
          </button>
        </div>

        <form
          className="project-form"
          action="https://formspree.io/f/xpqnqaaa"
          method="POST"
          data-project-form
        >
          <input type="hidden" name="_subject" value="New portfolio project inquiry" />
          <label>
            <span>Name</span>
            <input name="name" type="text" autoComplete="name" required />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
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
          <button className="button button-dark form-wide" type="submit" data-submit-button>
            Send project brief
          </button>
          <p className="form-status form-wide" role="status" aria-live="polite" data-form-status></p>
        </form>
      </section>
    </div>
  );
}
