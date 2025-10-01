import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/footer.css';
import { brand } from '../brand';

const Copyright: React.FC = () => {
  return (
    <div className="jf2-copy">
      <div className="jf2-copy__inner">
        <p className="jf2-copy__text">{brand.copyright}</p>
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
