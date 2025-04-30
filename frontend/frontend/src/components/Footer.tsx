import React from 'react';
import '../styles/Footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>VAConnect</h3>
          <p>The leading platform for connecting assistants worldwide.</p>
        </div>
        <div className="footer-section">
          <h3>For Employers</h3>
          <a href="#">How to Hire</a>
          <a href="#">Pricing Plans</a>
          <a href="#">VA Categories</a>
        </div>
        <div className="footer-section">
          <h3>For VAs</h3>
          <a href="#">Find Jobs</a>
          <a href="#">Profile Tips</a>
          <a href="#">Success Stories</a>
        </div>
        <div className="footer-section">
          <h3>Company</h3>
          <a href="#">About Us</a>
          <a href="#">Careers</a>
          <a href="#">Blog</a>
          <a href="#">Contact</a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2025 VAConnect. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;