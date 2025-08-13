import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { logout } from '../services/api';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import '../styles/edb-bridge.css';
import { Link } from 'react-router-dom';

// FA icons для меню
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
  const location = useLocation();

  const handleLogout = async () => {
    try { await logout(); } catch {}
    localStorage.removeItem('token');
    navigate('/');
  };

  const closeDrawer = () => setIsOpen(false);

  // Санитарим вложенный контент: убираем футеры/копирайты и верхние зазоры
  useEffect(() => {
    const root = document.querySelector('.edb-content');
    if (!root) return;

    // 1) Удалить любые футеры/копирайты, что отрисовали вложенные страницы
    root.querySelectorAll('footer, .copyright, .copyright-container').forEach(el => el.remove());

    // 2) Найти первый видимый блок и убрать верхние отступы/пэддинги
    const firstBlock = Array.from(root.children).find(
      (el) => el instanceof HTMLElement && getComputedStyle(el).display !== 'none'
    ) as HTMLElement | undefined;

    const zeroTop = (el: HTMLElement) => {
      el.style.marginTop = '0';
      el.style.paddingTop = '0';
      if (parseFloat(getComputedStyle(el).minHeight || '0') > 0) el.style.minHeight = 'auto';
    };

    if (firstBlock) zeroTop(firstBlock);

    // 3) Пройтись по популярным обёрткам уровней 1–2 и обнулить крупные верхние отступы
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

    // 4) Убрать «спейсеры» под шапку
    root.querySelectorAll<HTMLElement>('.site-spacer, .header-spacer, .hero-spacer').forEach((el) => {
      el.style.display = 'none';
      el.style.margin = '0';
      el.style.padding = '0';
    });
  }, [location.pathname]);

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

          <NavLink
            to="/employer-dashboard"
            end
            className={({ isActive }) => `edb-nav__link ${isActive ? 'active' : ''}`}
          >
            <FaTachometerAlt aria-hidden className="edb-nav__ico" />
            <span className="edb-nav__text">Overview</span>
          </NavLink>

          <NavLink
            to="/employer-dashboard/profile"
            className={({ isActive }) => `edb-nav__link ${isActive ? 'active' : ''}`}
          >
            <FaUserCog aria-hidden className="edb-nav__ico" />
            <span className="edb-nav__text">Profile</span>
          </NavLink>

          <NavLink
            to="/employer-dashboard/my-job-posts"
            className={({ isActive }) => `edb-nav__link ${isActive ? 'active' : ''}`}
          >
            <FaListUl aria-hidden className="edb-nav__ico" />
            <span className="edb-nav__text">My Job Posts</span>
          </NavLink>

          <NavLink
            to="/employer-dashboard/post-job"
            className={({ isActive }) => `edb-nav__link ${isActive ? 'active' : ''}`}
          >
            <FaPlus aria-hidden className="edb-nav__ico" />
            <span className="edb-nav__text">Post Job</span>
          </NavLink>

          <NavLink
            to="/employer-dashboard/messages"
            className={({ isActive }) => `edb-nav__link ${isActive ? 'active' : ''}`}
          >
            <FaComments aria-hidden className="edb-nav__ico" />
            <span className="edb-nav__text">Messages</span>
          </NavLink>

          <NavLink
            to="/employer-dashboard/contact"
            className={({ isActive }) => `edb-nav__link ${isActive ? 'active' : ''}`}
          >
            <FaEnvelopeOpenText aria-hidden className="edb-nav__ico" />
            <span className="edb-nav__text">Contact</span>
          </NavLink>
        </nav>
      </aside>

      {isOpen && <button className="edb-overlay" onClick={closeDrawer} aria-label="Close menu" />}

      <main className="edb-main">
        <div className="edb-content">
          <Outlet />
        </div>
      </main>

      {/* Единственный футер дашборда (вне .edb-main — на всю ширину) */}
      <div className="edb-bottom">
        <Footer />
        <Copyright />
      </div>
    </div>
  );
};

export default EmployerDashboard;
