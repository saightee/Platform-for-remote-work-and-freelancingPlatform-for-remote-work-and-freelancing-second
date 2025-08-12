import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { logout } from '../services/api';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import '../styles/jsd-bridge.css';

import {
  FaTachometerAlt,
  FaUser,
  FaClipboardList,
  FaComments,
  FaEnvelopeOpenText,
  FaSearch
} from 'react-icons/fa';

const JobseekerDashboard: React.FC = () => {
  const { profile } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try { await logout(); } catch {}
    localStorage.removeItem('token');
    navigate('/');
  };

  const closeDrawer = () => setIsOpen(false);

  // чистим то, что подмешивают вложенные страницы (футеры/копирайты + верхние отступы)
  useEffect(() => {
    const root = document.querySelector('.jsd-content');
    if (!root) return;

    // 1) убрать дубли футеров/копирайтов
    root.querySelectorAll('footer, .copyright, .copyright-container').forEach(el => el.remove());

    // 2) срезать верхний зазор у первого видимого
    const firstBlock = Array.from(root.children).find(
      (el) => el instanceof HTMLElement && getComputedStyle(el).display !== 'none'
    ) as HTMLElement | undefined;
    const zeroTop = (el: HTMLElement) => {
      el.style.marginTop = '0';
      el.style.paddingTop = '0';
      if (parseFloat(getComputedStyle(el).minHeight || '0') > 0) el.style.minHeight = 'auto';
    };
    if (firstBlock) zeroTop(firstBlock);

    // 3) срезать крупные верхние отступы у типовых обёрток
    const candidates = root.querySelectorAll<HTMLElement>(
      ':scope > *,' +
      ':scope > .container > *,' +
      ':scope > .page > *,' +
      ':scope > main > *,' +
      ':scope > .content > *,' +
      ':scope > section:first-child'
    );
    candidates.forEach((el) => {
      const cs = getComputedStyle(el);
      if (parseFloat(cs.marginTop) > 24) el.style.marginTop = '0';
      if (parseFloat(cs.paddingTop) > 24) el.style.paddingTop = '0';
    });

    // 4) убрать «спейсеры» под глобальный хедер
    root.querySelectorAll<HTMLElement>('.site-spacer, .header-spacer, .hero-spacer').forEach((el) => {
      el.style.display = 'none';
      el.style.margin = '0';
      el.style.padding = '0';
    });
  }, [location.pathname]);

  return (
    <div className="jsd-shell">
      <header className="jsd-topbar">
        <button
          className="jsd-topbar__burger"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen(v => !v)}
        >☰</button>

        <a href="/" className="jsd-topbar__logo" onClick={closeDrawer}>Jobforge_</a>

        <div className="jsd-topbar__spacer" />

        <Link to="/find-job" className="jsd-topbar__cta">
          <FaSearch aria-hidden />
          <span>Find Job</span>
        </Link>

        <div className="jsd-topbar__greet">
          Hello, <strong>{profile?.username}</strong> (Jobseeker)
        </div>

        <button className="jsd-topbar__logout" onClick={handleLogout}>Logout</button>
      </header>

      <aside className={`jsd-sidebar ${isOpen ? 'is-open' : ''}`}>
        <nav className="jsd-nav" onClick={closeDrawer}>
          <div className="jsd-nav__group">Main</div>

          <NavLink
            to="/jobseeker-dashboard"
            end
            className={({ isActive }) => `jsd-nav__link ${isActive ? 'active' : ''}`}
          >
            <FaTachometerAlt className="jsd-nav__ico" />
            <span className="jsd-nav__text">Overview</span>
          </NavLink>

          <NavLink
            to="/jobseeker-dashboard/profile"
            className={({ isActive }) => `jsd-nav__link ${isActive ? 'active' : ''}`}
          >
            <FaUser className="jsd-nav__ico" />
            <span className="jsd-nav__text">Profile</span>
          </NavLink>

          <NavLink
            to="/jobseeker-dashboard/my-applications"
            className={({ isActive }) => `jsd-nav__link ${isActive ? 'active' : ''}`}
          >
            <FaClipboardList className="jsd-nav__ico" />
            <span className="jsd-nav__text">My Applications</span>
          </NavLink>

          <NavLink
            to="/jobseeker-dashboard/messages"
            className={({ isActive }) => `jsd-nav__link ${isActive ? 'active' : ''}`}
          >
            <FaComments className="jsd-nav__ico" />
            <span className="jsd-nav__text">Messages</span>
          </NavLink>

          <NavLink
            to="/jobseeker-dashboard/contact"
            className={({ isActive }) => `jsd-nav__link ${isActive ? 'active' : ''}`}
          >
            <FaEnvelopeOpenText className="jsd-nav__ico" />
            <span className="jsd-nav__text">Contact</span>
          </NavLink>
        </nav>
      </aside>

      {isOpen && <button className="jsd-overlay" onClick={closeDrawer} aria-label="Close menu" />}

      <main className="jsd-main">
        <div className="jsd-content">
          <Outlet />
        </div>
      </main>

      <div className="jsd-bottom">
        <Footer />
        <Copyright />
      </div>
    </div>
  );
};

export default JobseekerDashboard;
