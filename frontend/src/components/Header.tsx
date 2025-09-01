import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { logout } from '../services/api';
import { FaBars, FaTimes, FaChevronDown, FaEnvelope } from 'react-icons/fa';

const Header: React.FC = () => {
  const { profile, isLoading, currentRole } = useRole();

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const isAuthenticated =
    !!token && (!!profile || ['admin', 'moderator'].includes(currentRole || ''));

  const isEmployer  = profile?.role === 'employer';
  const isJobseeker = profile?.role === 'jobseeker';
  const isStaff     = ['admin', 'moderator'].includes(currentRole || '');

  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen,   setIsDropdownOpen]   = useState(false);

  const [unreadTotal, setUnreadTotal] = useState(0);
const unreadKey = useMemo(() => `unreads_${profile?.id || 'anon'}`, [profile?.id]);


useEffect(() => {
  const calc = () => {
    try {
      const raw = localStorage.getItem(unreadKey);
      const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      const total = Object.values(map).reduce((s, v) => s + (Number(v) || 0), 0);
      setUnreadTotal(total);
    } catch { setUnreadTotal(0); }
  };
  calc();
  const onStorage = (e: StorageEvent) => { if (e.key === unreadKey) calc(); };
  const onLocal = () => calc();
  window.addEventListener('storage', onStorage);
  window.addEventListener('jobforge:unreads-updated', onLocal);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('jobforge:unreads-updated', onLocal);
  };
}, [unreadKey]);

  useEffect(() => { setIsMobileMenuOpen(false); setIsDropdownOpen(false); }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsMobileMenuOpen(false);
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
    try { await logout(); } catch {}
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(v => !v);
    if (isDropdownOpen) setIsDropdownOpen(false);
  };
  const closeMobileMenu = () => { setIsMobileMenuOpen(false); setIsDropdownOpen(false); };
  const toggleDropdown  = (e: React.MouseEvent) => { e.preventDefault(); setIsDropdownOpen(v => !v); };

  if (isLoading) {
    return (
      <header className="hm-header">
        <div className="hm-container">
          <Link to="/" className="hm-logo">Jobforge_</Link>
          <button className="hm-burger" aria-label="Menu" onClick={toggleMobileMenu}>
            <FaBars />
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="hm-header">
      <div className="hm-container">
        <Link to="/" className="hm-logo" onClick={closeMobileMenu}>Jobforge_</Link>

        <button
          className="hm-burger"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="hm-nav"
          onClick={toggleMobileMenu}
        >
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <nav id="hm-nav" className={`hm-nav ${isMobileMenuOpen ? 'is-open' : ''}`}>
          {isAuthenticated ? (
            <>
              {/* ==== EMPLOYER & JOBSEEKER — минимальный хедер на всех страницах ==== */}
              {(isEmployer || isJobseeker) && (
                <>

                     <Link
      to={`/${isEmployer ? 'employer' : 'jobseeker'}-dashboard/messages`}
      onClick={closeMobileMenu}
      className="hm-mail"
      aria-label="Messages"
      title="Messages"
    >
      <FaEnvelope />
      {unreadTotal > 0 && <span className="hm-pill">{unreadTotal > 99 ? '99+' : unreadTotal}</span>}
    </Link>
                  <Link
                    to={`/${isEmployer ? 'employer' : 'jobseeker'}-dashboard`}
                    onClick={closeMobileMenu}
                    className="hm-link"
                  >
                    My Dashboard
                  </Link>

                  {isJobseeker && (
                    <Link
                      to="/find-job"
                      onClick={closeMobileMenu}
                      className="hm-btn hm-btn--primary"
                    >
                      FIND JOB
                    </Link>
                  )}

                  {isEmployer && (
                    <Link
                      to="/find-talent"
                      onClick={closeMobileMenu}
                      className="hm-btn hm-btn--primary"
                    >
                      FIND TALENT
                    </Link>
                  )}

                  <button
                    onClick={() => { handleLogout(); closeMobileMenu(); }}
                    className="hm-btn hm-btn--ghost"
                  >
                    Logout
                  </button>
                </>
              )}

              {/* ==== ADMIN / MOD ==== */}
              {isStaff && !isEmployer && !isJobseeker && (
                <>
                  <Link
                    to={currentRole === 'admin' ? '/admin' : '/moderator'}
                    onClick={closeMobileMenu}
                    className="hm-link"
                  >
                    Back to Dashboard
                  </Link>
                  <button
                    onClick={() => { handleLogout(); closeMobileMenu(); }}
                    className="hm-btn hm-btn--ghost"
                  >
                    Logout
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              {/* Публичный хедер для гостей */}
              <div className={`hm-dd ${isDropdownOpen ? 'active' : ''}`}>
                <span className="hm-dd-toggle" onClick={toggleDropdown}>
                  How it Works <FaChevronDown className="hm-dd-icon" />
                </span>
                <div className="hm-dd-menu">
                  <Link to="/how-it-works/jobseeker-faq" onClick={closeMobileMenu} className="hm-dd-item">Jobseeker FAQ</Link>
                  <Link to="/how-it-works/employer-faq"  onClick={closeMobileMenu} className="hm-dd-item">Employer FAQ</Link>
                </div>
              </div>

              {/* <Link to="#"      onClick={closeMobileMenu} className="hm-link">Pricing</Link>
              <Link to="#" onClick={closeMobileMenu} className="hm-link">Real Results</Link> */}

              <Link to="/role-selection" onClick={closeMobileMenu} className="hm-btn hm-btn--outline">POST A JOB</Link>
              <Link to="/find-job"      onClick={closeMobileMenu} className="hm-btn hm-btn--primary">FIND JOB</Link>

              <span className="hm-divider" aria-hidden="true" />
              <Link to="/login"          onClick={closeMobileMenu} className="hm-link">LOG IN</Link>
              <Link to="/role-selection" onClick={closeMobileMenu} className="hm-btn hm-btn--ghost">SIGN UP</Link>
            </>
          )}
        </nav>
      </div>

      {isMobileMenuOpen && (
        <button className="hm-overlay" aria-label="Close menu" onClick={closeMobileMenu} />
      )}
    </header>
  );
};

export default Header;
