import React from 'react';
import { Link } from 'react-router-dom';
import { brand } from '../brand';
import '../styles/lovable-home.css';

const Copyright: React.FC = () => {
  return (
    <div className="oj-copy">
      <div className="oj-copy-inner">
        <p className="oj-copy-text">{brand.copyright}</p>
        <div className="oj-copy-links">
          <Link to="/privacy-policy">Privacy Policy</Link>
          <span>•</span>
          <Link to="/terms-of-service">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
};

export default Copyright;
