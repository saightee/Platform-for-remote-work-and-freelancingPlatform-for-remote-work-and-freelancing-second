import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaTwitter, FaLinkedinIn, FaInstagram } from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';
import { brand } from '../brand';
import '../styles/lovable-home.css';
import { Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';


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
  const authed = isAuthenticated();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="oj-footer" role="contentinfo">
      <div className="oj-footer-inner">
        <div className="oj-footer-grid">
          {/* Brand */}
          <div className="oj-footer-brand">
            <Link
              to="/"
              className="oj-footer-logo"
              aria-label="Go to home page"
            >
              {/* <div className="oj-footer-logo-mark">OJ</div> */}
              <span className="oj-footer-logo-text">{brand.wordmark}</span>
            </Link>
            <p className="oj-footer-brand-text">
              Connecting talented remote professionals with businesses worldwide.
            </p>
            <div className="oj-footer-company">
              <div className="oj-footer-company-name">
                Online Jobs Media LLC
              </div>
              <div className="oj-footer-company-address">
                <p>30 N Gould ST STE R</p>
                <p>Sheridan, WY 82801, USA</p>
              </div>
            </div>
          </div>

          {/* For Employers */}
          <div className="oj-footer-col">
            <h3 className="oj-footer-col-title">For Employers</h3>
            <div className="oj-footer-links">
              <Link to="/role-selection">Post a Job</Link>
              <Link to="/find-talent">Browse Talent</Link>
              <Link to="#">Pricing</Link>
              <a href="#how-it-works">How It Works</a>
            </div>
          </div>

          {/* For Jobseekers */}
          <div className="oj-footer-col">
            <h3 className="oj-footer-col-title">For Jobseekers</h3>
            <div className="oj-footer-links">
              <Link to="/find-job">Find Jobs</Link>
              <Link to="#">Profile Tips</Link>
              <Link to="#">Skill Tests</Link>
              <Link to="#">Success Stories</Link>
            </div>
          </div>

          {/* Company / Support */}
          <div className="oj-footer-col">
            <h3 className="oj-footer-col-title">Company</h3>
            <div className="oj-footer-links">
              <Link to="#">About Us</Link>
              <Link to="#">Careers</Link>
              <Link to="#">Blog</Link>
              <Link to="/affiliate">Affiliate Program</Link>
              <Link to="/contact-support">Contact Support</Link>
              {authed && (
                <>
                  <Link to="/share-story">Share Story</Link>
                  <Link to="/report-issue">Report Issue</Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="oj-footer-bottom">
          <div className="oj-footer-copy">
              <div className="oj-footer-policy-links">
              <Link to="/privacy-policy">Privacy Policy</Link>
              <span>•</span>
              <Link to="/terms-of-service">Terms of Service</Link>
            </div>
            <p className='copyright_new'>
              © {currentYear} {brand.name}. All rights reserved.
            </p>
          
          </div>

          <div className="oj-footer-social">
  <a href="#" aria-label="Facebook">
    <Facebook />
  </a>
  <a href="#" aria-label="Twitter">
    <Twitter />
  </a>
  <a href="#" aria-label="LinkedIn">
    <Linkedin />
  </a>
  <a href="#" aria-label="Instagram">
    <Instagram />
  </a>
</div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
