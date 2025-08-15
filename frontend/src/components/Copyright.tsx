import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/footer.css';

const Copyright: React.FC = () => {
  return (
    <div className="jf2-copy">
      <div className="jf2-copy__inner">
        <p className="jf2-copy__text">© 2025 Jobforge. All rights reserved.</p>
        <div className="jf2-copy__links">
          <Link to="/privacy-policy">Privacy Policy</Link>
          <span className="jf2-copy__dot">•</span>
          <Link to="/terms-of-service">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
};

export default Copyright;
