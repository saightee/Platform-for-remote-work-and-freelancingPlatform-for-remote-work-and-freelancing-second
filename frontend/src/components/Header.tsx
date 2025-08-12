import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { logout, getMyApplications, getMyJobPosts, getApplicationsForJobPost } from '../services/api';
import { FaChevronDown, FaBars, FaTimes } from 'react-icons/fa';
import { JobApplicationDetails } from '@types';

interface Message {
  id: string;
  job_application_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

const Header: React.FC = () => {
  const [applications, setApplications] = useState<JobApplicationDetails[]>([]);
  const { profile, isLoading, currentRole, socket, socketStatus } = useRole();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const isAuthenticated = !!token && (!!profile || ['admin', 'moderator'].includes(currentRole || ''));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  // Плашка "Back to Dashboard" для EMPLOYER на главной
  const showBackToEmployerDashboard =
    profile?.role === 'employer' && location.pathname === '/';

  // "Back to Dashboard" для админа/модера
  const showBackToDashboard =
    ['admin', 'moderator'].includes(currentRole || '') &&
    !location.pathname.startsWith(currentRole === 'admin' ? '/admin' : '/moderator');

  // fetch accepted apps (как было)
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const apps = await getMyApplications();
        const transformed: JobApplicationDetails[] = apps.map(app => ({
          applicationId: app.id,
          userId: app.job_seeker_id,
          username: app.job_seeker?.username || 'Unknown',
          email: app.job_seeker?.email || 'Unknown',
          jobDescription: '',
          appliedAt: app.created_at,
          status: app.status,
          job_post_id: app.job_post_id,
        }));
        setApplications(transformed.filter(a => a.status === 'Accepted'));
      } catch (e) {
        console.error('Error fetching applications:', e);
      }
    };
    fetchApplications();
  }, []);

  // unread по сокетам (как было)
  useEffect(() => {
    if (!profile || !['jobseeker', 'employer'].includes(profile.role) || !socket || !token) {
      setUnreadCount(0);
      return;
    }

    const run = async () => {
      try {
        let acc: JobApplicationDetails[] = [];
        if (profile.role === 'jobseeker') {
          const apps = await getMyApplications();
          acc = apps.map(app => ({
            applicationId: app.id,
            userId: app.job_seeker_id,
            username: app.job_seeker?.username || 'Unknown',
            email: app.job_seeker?.email || 'Unknown',
            jobDescription: '',
            appliedAt: app.created_at,
            status: app.status,
            job_post_id: app.job_post_id,
          })).filter(a => a.status === 'Accepted');
        } else {
          const posts = await getMyJobPosts();
          const arrays = await Promise.all(posts.map(p => getApplicationsForJobPost(p.id)));
          acc = arrays.flat().filter(a => a.status === 'Accepted') as any;
        }

        if (acc.length === 0) {
          setUnreadCount(0);
          return;
        }

        acc.forEach(a => socket.emit('joinChat', { jobApplicationId: a.applicationId }));

        socket.on('chatHistory', (history: Message[]) => {
          if (history?.length) {
            const unread = history.filter(m => m.recipient_id === profile.id && !m.is_read).length;
            setUnreadCount(unread);
          } else {
            setUnreadCount(0);
          }
        });

        socket.on('newMessage', (m: Message) => {
          if (m.recipient_id === profile.id && !m.is_read) setUnreadCount(v => v + 1);
        });

        socket.on('connect', () => {
          acc.forEach(a => socket.emit('joinChat', { jobApplicationId: a.applicationId }));
        });

        return () => {
          socket.off('chatHistory');
          socket.off('newMessage');
          socket.off('connect');
        };
      } catch (e) {
        console.error('Error fetching unread messages in Header:', e);
      }
    };

    run();
  }, [profile, socket, token]);

  // закрытие при смене маршрута
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  }, [location.pathname]);

  // Esc + блокировка скролла бади при открытом меню
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
    try {
      await logout();
      localStorage.removeItem('token');
      window.location.href = '/';
    } catch {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
    if (isDropdownOpen) setIsDropdownOpen(false);
  };
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  };
  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDropdownOpen(prev => !prev);
  };
  const capitalizeRole = (role?: string) => (!role ? '' : role.charAt(0).toUpperCase() + role.slice(1));

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
              {/* ==== ADMIN / MOD ==== */}
              {['admin', 'moderator'].includes(currentRole || '') && (
                <>
                  {showBackToDashboard && (
                    <Link to={currentRole === 'admin' ? '/admin' : '/moderator'} onClick={closeMobileMenu} className="hm-link">
                      Back to Dashboard
                    </Link>
                  )}
                  <button onClick={() => { handleLogout(); closeMobileMenu(); }} className="hm-btn hm-btn--ghost">
                    Logout
                  </button>
                </>
              )}

              {/* ==== EMPLOYER (минимальный хедер) ==== */}
              {profile?.role === 'employer' && !['admin', 'moderator'].includes(currentRole || '') && (
                <>
                  {showBackToEmployerDashboard && (
                    <Link to="/employer-dashboard" onClick={closeMobileMenu} className="hm-link">
                      Back to Dashboard
                    </Link>
                  )}

                  {/* Приветствие */}
                  <span className="hm-greeting">
                    Hello, <span className="hm-strong">{profile?.username} (Employer)</span>
                  </span>

                  {/* Только Logout */}
                  <button onClick={() => { handleLogout(); closeMobileMenu(); }} className="hm-btn hm-btn--ghost">
                    Logout
                  </button>
                </>
              )}

              {/* ==== JOBSEEKER ==== */}
              {profile?.role === 'jobseeker' && (
                <>
                  <Link to="/profile" onClick={closeMobileMenu} className="hm-link">Profile</Link>
                  <Link to="/my-applications" onClick={closeMobileMenu} className="hm-link">My Applications</Link>
                  <Link to="/find-job" onClick={closeMobileMenu} className="hm-link">Find Job</Link>

                  <Link to="/messages" onClick={closeMobileMenu} className="hm-link hm-link--pill">
                    Messages
                    {unreadCount > 0 && <span className="hm-pill">{unreadCount}</span>}
                    {socketStatus === 'reconnecting' && <span className="hm-dot" />}
                  </Link>

                  <Link to="/feedback" onClick={closeMobileMenu} className="hm-link">Contact</Link>

                  <span className="hm-greeting">
                    Hello, <span className="hm-strong">{profile?.username} ({capitalizeRole(profile?.role)})</span>
                  </span>

                  <button onClick={() => { handleLogout(); closeMobileMenu(); }} className="hm-btn hm-btn--ghost">
                    Logout
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <div className={`hm-dd ${isDropdownOpen ? 'active' : ''}`}>
                <span className="hm-dd-toggle" onClick={toggleDropdown}>
                  How it Works <FaChevronDown className="hm-dd-icon" />
                </span>
                <div className="hm-dd-menu">
                  <Link to="/how-it-works/jobseeker-faq" onClick={closeMobileMenu} className="hm-dd-item">Jobseeker FAQ</Link>
                  <Link to="/how-it-works/employer-faq" onClick={closeMobileMenu} className="hm-dd-item">Employer FAQ</Link>
                </div>
              </div>

              <Link to="/pricing" onClick={closeMobileMenu} className="hm-link">Pricing</Link>
              <Link to="/real-results" onClick={closeMobileMenu} className="hm-link">Real Results</Link>

              <Link to="/role-selection" onClick={closeMobileMenu} className="hm-btn hm-btn--outline">
                POST A JOB
              </Link>
              <Link to="/find-job" onClick={closeMobileMenu} className="hm-btn hm-btn--primary">
                FIND JOB
              </Link>

              <span className="hm-divider" aria-hidden="true" />

              <Link to="/login" onClick={closeMobileMenu} className="hm-link">LOG IN</Link>
              <Link to="/role-selection" onClick={closeMobileMenu} className="hm-btn hm-btn--ghost">SIGN UP</Link>
            </>
          )}
        </nav>
      </div>

      {isMobileMenuOpen && <button className="hm-overlay" aria-label="Close menu" onClick={closeMobileMenu} />}
    </header>
  );
};

export default Header;
