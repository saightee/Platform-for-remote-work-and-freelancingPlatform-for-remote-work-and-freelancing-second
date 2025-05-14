import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from './Footer';
import EmployerNavbar from './EmployerNavbar';
import JobSeekerNavbar from './JobSeekerNavbar';
import DefaultNavbar from './DefaultNavbar';
import '../styles/Layout.css';

const Layout: React.FC = () => {
  const { role, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  console.log('Layout - isAuthenticated:', isAuthenticated, 'role:', role, 'location:', location.pathname, 'isLoading:', isLoading, 'at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }));

  const shouldRenderNavbar = !['/login', '/register', '/forgot-password', '/reset-password/:token'].includes(location.pathname.trim());

  const Navbar = isLoading ? null : isAuthenticated
    ? role === 'employer' ? EmployerNavbar : JobSeekerNavbar
    : DefaultNavbar;

  return (
    <>
      {shouldRenderNavbar && Navbar && <Navbar />}
      <main className="main-content">
        <Outlet />
      </main>
      {shouldRenderNavbar && (
        <div className="section-footer">
          <Footer />
        </div>
      )}
    </>
  );
};

export default Layout;