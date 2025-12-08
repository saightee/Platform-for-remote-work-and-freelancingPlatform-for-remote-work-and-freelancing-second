import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBars, FaTimes, FaEnvelope } from 'react-icons/fa';
import { useRole } from '../context/RoleContext';
import { logout } from '../services/api';
import { brand } from '../brand';
import '../styles/lovable-home.css'; // или твой глобальный файл со стилями

const Header: React.FC = () => {
  const { profile, isLoading, currentRole } = useRole();

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const isAuthenticated =
    !!token && (!!profile || ['admin', 'moderator'].includes(currentRole || ''));

  const isEmployer = profile?.role === 'employer';
  const isJobseeker = profile?.role === 'jobseeker';
  const isStaff = ['admin', 'moderator'].includes(currentRole || '');

  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [unreadTotal, setUnreadTotal] = useState(0);
  const unreadKey = useMemo(
    () => `unreads_${profile?.id || 'anon'}`,
    [profile?.id]
  );

  useEffect(() => {
    const calc = () => {
      try {
        const raw = localStorage.getItem(unreadKey);
        const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
        const total = Object.values(map).reduce(
          (s, v) => s + (Number(v) || 0),
          0
        );
        setUnreadTotal(total);
      } catch {
        setUnreadTotal(0);
      }
    };
    calc();
    const onStorage = (e: StorageEvent) => {
      if (e.key === unreadKey) calc();
    };
    const onLocal = () => calc();
    window.addEventListener('storage', onStorage);
    const evtName = `${brand.id}:unreads-updated`;
    window.addEventListener('jobforge:unreads-updated', onLocal);
    window.addEventListener(evtName, onLocal);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('jobforge:unreads-updated', onLocal);
      window.removeEventListener(evtName, onLocal);
    };
  }, [unreadKey]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === 'Escape' && setIsMobileMenuOpen(false);
    if (isMobileMenuOpen) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(v => !v);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const renderNavContent = (isMobile: boolean) => {
    // ВХОД / РОЛИ
    if (isAuthenticated) {
      if (isEmployer || isJobseeker) {
        const dashBase = isEmployer ? 'employer' : 'jobseeker';
        return (
          <>
            <Link
              to={`/${dashBase}-dashboard/messages`}
              onClick={closeMobileMenu}
              className="oj-header-mail"
              aria-label="Messages"
              title="Messages"
            >
              <FaEnvelope />
              {unreadTotal > 0 && (
                <span className="oj-header-pill">
                  {unreadTotal > 99 ? '99+' : unreadTotal}
                </span>
              )}
            </Link>

            <Link
              to={`/${dashBase}-dashboard`}
              onClick={closeMobileMenu}
              className="oj-header-link"
            >
              My Dashboard
            </Link>

            <button
              onClick={() => {
                handleLogout();
                closeMobileMenu();
              }}
              className={
                isMobile
                  ? 'oj-btn oj-btn--ghost oj-header-btn-full'
                  : 'oj-btn oj-btn--ghost'
              }
            >
              Logout
            </button>
          </>
        );
      }

      if (isStaff && !isEmployer && !isJobseeker) {
        return (
          <>
            <Link
              to={currentRole === 'admin' ? '/admin' : '/moderator'}
              onClick={closeMobileMenu}
              className="oj-header-link"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={() => {
                handleLogout();
                closeMobileMenu();
              }}
              className={
                isMobile
                  ? 'oj-btn oj-btn--ghost oj-header-btn-full'
                  : 'oj-btn oj-btn--ghost'
              }
            >
              Logout
            </button>
          </>
        );
      }
    }

    // ГОСТЬ — чисто как Lovable: How It Works / Find Talent / Find Work / Log In / Sign Up
    return (
      <>
        <a
          href="#how-it-works"
          onClick={closeMobileMenu}
          className="oj-header-link"
        >
          How It Works
        </a>
        <a
          href="#freelancers"
          onClick={closeMobileMenu}
          className="oj-header-link"
        >
          Find Talent
        </a>
        <a
          href="#for-freelancers"
          onClick={closeMobileMenu}
          className="oj-header-link"
        >
          Find Work
        </a>

        <Link
          to="/login"
          onClick={closeMobileMenu}
          className={
            isMobile
              ? 'oj-btn oj-btn--outline oj-header-btn-full'
              : 'oj-btn oj-btn--outline'
          }
        >
          Log In
        </Link>
        <Link
          to="/role-selection"
          onClick={closeMobileMenu}
          className={
            isMobile
              ? 'oj-btn oj-btn--hero oj-header-btn-full'
              : 'oj-btn oj-btn--hero'
          }
        >
          Sign Up
        </Link>
      </>
    );
  };

  if (isLoading) {
    return (
      <header className="oj-header">
        <div className="oj-header-inner">
          <div className="oj-header-row">
            <Link to="/" className="oj-header-logo">
              {/* <div className="oj-header-logo-mark">OJ</div> */}
              <span className="oj-header-logo-text">{brand.wordmark}</span>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="oj-header">
      <div className="oj-header-inner">
        <div className="oj-header-row">
          <Link to="/" className="oj-header-logo" onClick={closeMobileMenu}>
            {/* <div className="oj-header-logo-mark">OJ</div> */}
            <span className="oj-header-logo-text">{brand.wordmark}</span>
          </Link>

          <nav className="oj-header-nav oj-header-nav--desktop">
            {renderNavContent(false)}
          </nav>

          <button
            className="oj-header-mobile-toggle"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="oj-header-nav-mobile"
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        <nav
          id="oj-header-nav-mobile"
          className={`oj-header-nav oj-header-nav--mobile ${
            isMobileMenuOpen ? 'is-open' : ''
          }`}
        >
          {renderNavContent(true)}
        </nav>
      </div>

      {isMobileMenuOpen && (
        <button
          className="oj-header-overlay"
          aria-label="Close menu"
          onClick={closeMobileMenu}
        />
      )}
    </header>
  );
};

export default Header;
