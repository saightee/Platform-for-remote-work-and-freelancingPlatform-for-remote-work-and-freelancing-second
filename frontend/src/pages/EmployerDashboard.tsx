import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { logout } from '../services/api';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import '../styles/edb-bridge.css';

import {
  FaTachometerAlt,
  FaUserCog,
  FaListUl,
  FaPlus,
  FaComments,
  FaEnvelopeOpenText
} from 'react-icons/fa';

const EmployerDashboard: React.FC = () => {
  const { profile } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();



const [unreadTotal, setUnreadTotal] = useState(0);

const unreadKey = React.useMemo(
  () => `unreads_${profile?.id || 'anon'}`,
  [profile?.id]
);

useEffect(() => {
  const calc = () => {
    try {
      const raw = localStorage.getItem(unreadKey);
      const map = raw ? JSON.parse(raw) as Record<string, number> : {};
      const total = Object.values(map).reduce((s, v) => s + (Number(v) || 0), 0);
      setUnreadTotal(total);
    } catch {
      setUnreadTotal(0);
    }
  };

  calc(); // начальное значение

  // обновления из других вкладок
  const onStorage = (e: StorageEvent) => {
    if (e.key === unreadKey) calc();
  };

  // обновления из текущего таба (Messages шлёт событие)
  const onLocal = () => calc();

  window.addEventListener('storage', onStorage);
  window.addEventListener('jobforge:unreads-updated', onLocal);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('jobforge:unreads-updated', onLocal);
  };
}, [unreadKey]);

  

 const handleLogout = async () => {
  try { await logout(); } catch {}
  try { localStorage.removeItem(`unreads_${profile?.id || 'anon'}`); } catch {}
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
        <Link to="/find-talent" className="edb-topbar__cta">Find Talent</Link>
        <div className="edb-topbar__greet">
          Hello, <strong>{profile?.username}</strong> (Employer)
        </div>
        <button className="edb-topbar__logout" onClick={handleLogout}>Logout</button>
      </header>

      <aside className={`edb-sidebar ${isOpen ? 'is-open' : ''}`}>
        <nav className="edb-nav" onClick={closeDrawer}>
          <div className="edb-nav__group">Main</div>

          <NavLink to="/employer-dashboard" end className={({ isActive }) => `edb-nav__link ${isActive ? 'active' : ''}`}>
            <FaTachometerAlt aria-hidden className="edb-nav__ico" />
            <span className="edb-nav__text">Overview</span>
          </NavLink>

          

          <NavLink to="/employer-dashboard/my-job-posts" className={({ isActive }) => `edb-nav__link ${isActive ? 'active' : ''}`}>
            <FaListUl aria-hidden className="edb-nav__ico" />
            <span className="edb-nav__text">My Job Posts</span>
          </NavLink>

          <NavLink to="/employer-dashboard/post-job" className={({ isActive }) => `edb-nav__link ${isActive ? 'active' : ''}`}>
            <FaPlus aria-hidden className="edb-nav__ico" />
            <span className="edb-nav__text">Post Job</span>
          </NavLink>

          <NavLink to="/employer-dashboard/messages" className={({ isActive }) => `edb-nav__link ${isActive ? 'active' : ''}`}>
  <FaComments aria-hidden className="edb-nav__ico" />
  <span className="edb-nav__text">Messages</span>
  {unreadTotal > 0 && (
    <span className="nav-badge" aria-label={`${unreadTotal} unread`}>
      {unreadTotal > 99 ? '99+' : unreadTotal}
    </span>
  )}
</NavLink>

          <NavLink to="/employer-dashboard/report-issue" className={({ isActive }) => `edb-nav__link ${isActive ? 'active' : ''}`}>
            <FaEnvelopeOpenText aria-hidden className="edb-nav__ico" />
            <span className="edb-nav__text">Report tech Issue</span>
          </NavLink>

          <NavLink to="/employer-dashboard/profile" className={({ isActive }) => `edb-nav__link ${isActive ? 'active' : ''}`}>
            <FaUserCog aria-hidden className="edb-nav__ico" />
            <span className="edb-nav__text">Profile</span>
          </NavLink>
        </nav>
      </aside>

      {isOpen && <button className="edb-overlay" onClick={closeDrawer} aria-label="Close menu" />}

      <main className="edb-main">
        {/* важный класс для CSS-правил из edb-bridge.css */}
        <div className="edb-content edb-embed">
          <Outlet />
        </div>
      </main>

      <div className="edb-bottom">
        <Footer />
        <Copyright />
      </div>
    </div>
  );
};

export default EmployerDashboard;
