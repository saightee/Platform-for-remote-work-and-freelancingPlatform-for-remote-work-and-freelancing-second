import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from './Footer';
import EmployerNavbar from './EmployerNavbar';
import JobSeekerNavbar from './JobSeekerNavbar';
import DefaultNavbar from './DefaultNavbar';
import '../styles/Layout.css';

const Layout: React.FC = () => {
  const { role, isAuthenticated } = useAuth();
  const location = useLocation();

  const shouldRenderLayout = !['/register', '/register/employer', '/register/jobseeker', '/login'].includes(location.pathname.trim());

  const Navbar = isAuthenticated
    ? role === 'employer'
      ? EmployerNavbar
      : JobSeekerNavbar
    : DefaultNavbar;

  return (
    <>
      {shouldRenderLayout && <Navbar />}
      <main className="main-content">
        <Outlet />
      </main>
      {shouldRenderLayout && (
        <div className="section-footer">
          <Footer />
        </div>
      )}
    </>
  );
};

export default Layout;