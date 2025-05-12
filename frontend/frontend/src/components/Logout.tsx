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

  console.log('isAuthenticated:', isAuthenticated, 'role:', role, 'location.pathname:', location.pathname);
  const shouldRenderNavbar = !['/login', '/register/employer', '/register/jobseeker'].includes(location.pathname.trim());
  console.log('shouldRenderNavbar:', shouldRenderNavbar);

  const Navbar = isAuthenticated
    ? role === 'employer'
      ? EmployerNavbar
      : JobSeekerNavbar
    : DefaultNavbar;

  return (
    <>
      {shouldRenderNavbar ? <Navbar /> : <div>Navbar hidden for this route: {location.pathname}</div>}
      <main className="main-content">
        <Outlet />
      </main>
      <div className="section-footer">
        <Footer />
      </div>
    </>
  );
};

export default Layout;