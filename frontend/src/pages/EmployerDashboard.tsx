import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { logout } from '../services/api';
import '../styles/edb-bridge.css';

const EmployerDashboard: React.FC = () => {
  const { profile } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await logout(); } catch {}
    localStorage.removeItem('token');
    navigate('/');
  };

  const closeDrawer = () => setIsOpen(false);

  return (
    <div className="edb-shell">
      <header className="edb-topbar">
        <button
          className="edb-topbar__burger"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen(v => !v)}
        >☰</button>

        <a href="/" className="edb-topbar__logo" onClick={closeDrawer}>Jobforge_</a>
        <div className="edb-topbar__spacer" />
        <div className="edb-topbar__greet">Hello, <strong>{profile?.username}</strong> (Employer)</div>
        <button className="edb-topbar__logout" onClick={handleLogout}>Logout</button>
      </header>

      <aside className={`edb-sidebar ${isOpen ? 'is-open' : ''}`}>
        <nav className="edb-nav" onClick={closeDrawer}>
          <div className="edb-nav__group">Main</div>
          <NavLink to="/employer-dashboard" end className="edb-nav__link">Overview</NavLink>
          <NavLink to="/employer-dashboard/profile" className="edb-nav__link">Profile</NavLink>
          <NavLink to="/employer-dashboard/my-job-posts" className="edb-nav__link">My Job Posts</NavLink>
          <NavLink to="/employer-dashboard/post-job" className="edb-nav__link">Post Job</NavLink>
          <NavLink to="/employer-dashboard/messages" className="edb-nav__link">Messages</NavLink>
          <NavLink to="/employer-dashboard/contact" className="edb-nav__link">Contact</NavLink>
        </nav>
      </aside>

      {isOpen && <button className="edb-overlay" onClick={closeDrawer} aria-label="Close menu" />}

      <main className="edb-main">
        <div className="edb-content">
          <style>{`
            .edb-content .hm-header,
            .edb-content header.header-container,
            .edb-content footer,
            .edb-content .copyright-container { display:none!important; }
            .edb-content .container { max-width:1200px; margin:0 auto; padding:16px; }
          `}</style>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default EmployerDashboard;
