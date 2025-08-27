import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import '../styles/footer.css';

const Footer: React.FC = () => {
  // нужно только для мобильного аккордеона
  const [open, setOpen] = useState({
    employers: false,
    vas: false,
    company: false,
    help: false,
  });

  const toggle = (key: keyof typeof open) =>
    setOpen((p) => ({ ...p, [key]: !p[key] }));

  return (
    <footer className="jf2-footer" role="contentinfo">
      <div className="jf2-inner">
        <div className="jf2-grid jf2-grid--5">
          {/* BRAND / ABOUT (1-я колонка) */}
          <div className="jf2-col jf2-col--brand">
            <a className="jf2-logo">Jobforge_</a>
            <p className="jf2-desc">
              The leading platform for connecting businesses with professional
              virtual assistants worldwide.
            </p>
          </div>

          {/* For Employers */}
          <div className="jf2-col">
            <button
              type="button"
              className="jf2-title"
              onClick={() => toggle('employers')}
              aria-expanded={open.employers}
              aria-controls="jf2-employers"
            >
              <span className="jf2-title-text">For Employers</span>
              <span className="jf2-chevron" aria-hidden="true">
                {open.employers ? <FaChevronUp /> : <FaChevronDown />}
              </span>
            </button>
            <nav
              id="jf2-employers"
              className={`jf2-links ${open.employers ? 'is-open' : ''}`}
              aria-label="For Employers"
            >
              <Link to="/how-it-works/employer-faq">How to Hire</Link>
              <Link to="#">Pricing Plans</Link>
              <Link to="#">Client Stories</Link>
            </nav>
          </div>

          {/* For VAs */}
          <div className="jf2-col">
            <button
              type="button"
              className="jf2-title"
              onClick={() => toggle('vas')}
              aria-expanded={open.vas}
              aria-controls="jf2-vas"
            >
              <span className="jf2-title-text">For VAs</span>
              <span className="jf2-chevron" aria-hidden="true">
                {open.vas ? <FaChevronUp /> : <FaChevronDown />}
              </span>
            </button>
            <nav
              id="jf2-vas"
              className={`jf2-links ${open.vas ? 'is-open' : ''}`}
              aria-label="For VAs"
            >
              <Link to="/find-job">Find Jobs</Link>
              <Link to="#">Profile Tips</Link>
              <Link to="/skill-test">Skill Tests</Link>
              <Link to="#">Success Stories</Link>
            </nav>
          </div>

          {/* Company */}
          <div className="jf2-col">
            <button
              type="button"
              className="jf2-title"
              onClick={() => toggle('company')}
              aria-expanded={open.company}
              aria-controls="jf2-company"
            >
              <span className="jf2-title-text">Company</span>
              <span className="jf2-chevron" aria-hidden="true">
                {open.company ? <FaChevronUp /> : <FaChevronDown />}
              </span>
            </button>
            <nav
              id="jf2-company"
              className={`jf2-links ${open.company ? 'is-open' : ''}`}
              aria-label="Company"
            >
              <Link to="#">About Us</Link>
              <Link to="#">Careers</Link>
              <Link to="#">Blog</Link>
            </nav>
          </div>

          {/* Help */}
          <div className="jf2-col">
            <button
              type="button"
              className="jf2-title"
              onClick={() => toggle('help')}
              aria-expanded={open.help}
              aria-controls="jf2-help"
            >
              <span className="jf2-title-text">Support & Feedback</span>
              <span className="jf2-chevron" aria-hidden="true">
                {open.help ? <FaChevronUp /> : <FaChevronDown />}
              </span>
            </button>
            <nav
              id="jf2-help"
              className={`jf2-links ${open.help ? 'is-open' : ''}`}
              aria-label="Help"
            >
              <Link to="/contact-support">Contact Support</Link>
              <Link to="/share-story">Share Story</Link>
              <Link to="/report-issue">Report Issue</Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
