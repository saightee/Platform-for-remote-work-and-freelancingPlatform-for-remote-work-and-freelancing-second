import React from 'react';
import '../styles/Header.css';

const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="logo">VAConnect</div>
      <nav className="nav">
        <a href="#">For Employers</a>
        <a href="#">For VAs</a>
        <a href="#">Categories</a>
        <a href="#">How it Works</a>
        <a href="#">Pricing</a>
      </nav>
    </header>
  );
};

export default Header;