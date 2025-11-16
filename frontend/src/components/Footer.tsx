import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronDown, FaChevronUp,  FaBuilding, FaMapMarkerAlt } from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode'; // ⬅️ добавили
import '../styles/footer.css';
import { brand } from '../brand'; 

type JwtPayload = { exp?: number };

const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  const t = localStorage.getItem('token');
  if (!t) return false;
  try {
    const { exp } = jwtDecode<JwtPayload>(t);
    return !exp || exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

const Footer: React.FC = () => {
  const [open, setOpen] = useState({
    employers: false,
    vas: false,
    company: false,
    help: false,
  });

  const toggle = (key: keyof typeof open) =>
    setOpen((p) => ({ ...p, [key]: !p[key] }));

  const authed = isAuthenticated(); // ⬅️

  return (
    <footer className="jf2-footer" role="contentinfo">
      <div className="jf2-inner">
        <div className="jf2-grid jf2-grid--5">
          {/* BRAND / ABOUT */}
<div className="jf2-col jf2-col--brand">
  <Link to="/" className="jf2-logo" aria-label="Go to home page">
  {brand.wordmark}
</Link>
  <div className="jf2-company-info">
    <div className="jf2-company-name">
      <FaBuilding className="jf2-icon" />
      <span>Online Jobs Media LLC</span>
    </div>
    <div className="jf2-company-address">
      <FaMapMarkerAlt className="jf2-icon" />
      <address style={{ fontStyle: 'normal', textAlign: 'left' }}>
        30 N Gould ST STE R<br />
        Sheridan, WY 82801, USA
      </address>
    </div>
  </div>
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
              <Link to="#">How to Hire</Link>
              <Link to="#">Pricing Plans</Link>
              <Link to="#">Client Stories</Link>
            </nav>
          </div>

          {/* For Jobseekers */}
          <div className="jf2-col">
            <button
              type="button"
              className="jf2-title"
              onClick={() => toggle('vas')}
              aria-expanded={open.vas}
              aria-controls="jf2-vas"
            >
              <span className="jf2-title-text">For Jobseekers</span>
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
              <Link to="#">Skill Tests</Link>
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
               <Link to="/affiliate">Affiliate Program</Link>
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
              {authed && (
                <>
                  <Link to="/share-story">Share Story</Link>
                  <Link to="/report-issue">Report Issue</Link>
                </>
              )}
               
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
