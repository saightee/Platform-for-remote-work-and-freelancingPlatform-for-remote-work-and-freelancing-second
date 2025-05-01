import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const footerStyles: React.CSSProperties = {
    padding: '3rem 0',
    color: 'rgba(255, 255, 255, 0.7)',
  };

  const columnsStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '2rem',
    marginBottom: '2rem',
  };

  const columnStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  };

  const titleStyles: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '1rem',
  };

  const linkStyles: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.7)',
    textDecoration: 'none',
    fontSize: '0.9rem',
  };

  const copyrightStyles: React.CSSProperties = {
    textAlign: 'center',
    fontSize: '0.8rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    paddingTop: '1.5rem',
  };

  const copyrightLinkStyles: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.7)',
    textDecoration: 'underline',
  };

  return (
    <footer style={footerStyles}>
      <div style={columnsStyles}>
        <div style={columnStyles}>
          <h3 style={titleStyles}>VACONNECT</h3>
          <p style={{ fontSize: '0.9rem' }}>
            The leading platform for connecting businesses with professional virtual assistants worldwide.
          </p>
        </div>
        <div style={columnStyles}>
          <h3 style={titleStyles}>For Employers</h3>
          <Link to="/how-to-hire" style={linkStyles}>How to Hire</Link>
          <Link to="/pricing-plans" style={linkStyles}>Pricing Plans</Link>
          <Link to="/va-categories" style={linkStyles}>VA Categories</Link>
          <Link to="/client-stories" style={linkStyles}>Client Stories</Link>
        </div>
        <div style={columnStyles}>
          <h3 style={titleStyles}>For VAs</h3>
          <Link to="/find-jobs" style={linkStyles}>Find Jobs</Link>
          <Link to="/profile-tips" style={linkStyles}>Profile Tips</Link>
          <Link to="/skill-tests" style={linkStyles}>Skill Tests</Link>
          <Link to="/success-stories" style={linkStyles}>Success Stories</Link>
        </div>
        <div style={columnStyles}>
          <h3 style={titleStyles}>Company</h3>
          <Link to="/about-us" style={linkStyles}>About Us</Link>
          <Link to="/careers" style={linkStyles}>Careers</Link>
          <Link to="/blog" style={linkStyles}>Blog</Link>
          <Link to="/contact" style={linkStyles}>Contact</Link>
        </div>
      </div>
      <div style={copyrightStyles}>
        <p>
          © 2025 VACONNECT. ALL RIGHTS RESERVED.{' '}
          <Link to="/privacy-policy" style={copyrightLinkStyles}>Privacy Policy</Link>{' '}
          |{' '}
          <Link to="/terms-of-service" style={copyrightLinkStyles}>Terms of Service</Link>
        </p>
      </div>
    </footer>
  );
};

export default Footer;