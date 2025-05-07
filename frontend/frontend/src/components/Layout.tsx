import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import '../styles/Layout.css';

const Layout: React.FC = () => {
  return (
    <div className="App">
      <div className="section-header">
        <div className="container">
          <Header />
        </div>
      </div>
      <div className="main-content">
        <Outlet />
      </div>
      <div className="section-footer">
        <div className="container">
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default Layout;