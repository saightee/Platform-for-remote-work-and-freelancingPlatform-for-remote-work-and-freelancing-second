import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { logout, getMyApplications, getMyJobPosts, getApplicationsForJobPost } from '../services/api';
import { FaChevronDown, FaBars, FaTimes } from 'react-icons/fa';

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
  const { profile, isLoading, currentRole, socket } = useRole();
  const token = localStorage.getItem('token');
  const isAuthenticated = token && (profile || ['admin', 'moderator'].includes(currentRole || ''));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  // Проверяем, показывать ли "Back to Dashboard"
  const showBackToDashboard = ['admin', 'moderator'].includes(currentRole || '') &&
    !location.pathname.startsWith(currentRole === 'admin' ? '/admin' : '/moderator');

  useEffect(() => {
    if (!profile || !['jobseeker', 'employer'].includes(profile.role) || !socket) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadMessages = async () => {
      try {
        let applications: { id: string }[] = [];
        if (profile.role === 'jobseeker') {
          const apps = await getMyApplications();
          applications = apps.filter(app => app.status === 'Accepted');
        } else if (profile.role === 'employer') {
          const posts = await getMyJobPosts();
          const appsPromises = posts.map(post => getApplicationsForJobPost(post.id));
          const appsArrays = await Promise.all(appsPromises);
          applications = appsArrays.flat().filter(app => app.status === 'Accepted');
        }

        applications.forEach(app => {
          socket.emit('joinChat', { jobApplicationId: app.id });
        });

        socket.on('chatHistory', (history: Message[]) => {
          const unread = history.filter(msg => msg.recipient_id === profile.id && !msg.is_read).length;
          setUnreadCount(unread);
        });

        socket.on('newMessage', (message: Message) => {
          if (message.recipient_id === profile.id && !message.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        });

        return () => {
          socket.off('chatHistory');
          socket.off('newMessage');
          setUnreadCount(0);
        };
      } catch (err) {
        console.error('Error fetching unread messages in Header:', err);
      }
    };

    fetchUnreadMessages();
  }, [profile, socket]);

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('token');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('token');
      window.location.href = '/login';
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

  if (isLoading) return null;

  return (
    <header className="header-container">
      <div className="header-content">
        <Link to="/" className="logo" onClick={closeMobileMenu}>Jobforge_</Link>
        <button className="burger-menu" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
        <nav className={`nav ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
          {isAuthenticated ? (
            <>
              {['admin', 'moderator'].includes(currentRole || '') ? (
                <>
                  {showBackToDashboard && (
                    <Link
                      to={currentRole === 'admin' ? '/admin' : '/moderator'}
                      onClick={closeMobileMenu}
                    >
                      Back to Dashboard
                    </Link>
                  )}
                  <button onClick={() => { handleLogout(); closeMobileMenu(); }} className="action-button">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/profile" onClick={closeMobileMenu}>Profile</Link>
                  {profile?.role === 'jobseeker' && (
                    <>
                      <Link to="/my-applications" onClick={closeMobileMenu}>My Applications</Link>
                      <Link to="/find-job" onClick={closeMobileMenu}>Find Job</Link>
                    </>
                  )}
                  {profile?.role === 'employer' && (
                    <>
                      <Link to="/my-job-posts" onClick={closeMobileMenu}>My Job Posts</Link>
                      <Link to="/post-job" onClick={closeMobileMenu}>Post Job</Link>
                    </>
                  )}
                  <Link to="/messages" onClick={closeMobileMenu}>
                    Messages {unreadCount > 0 && <span className="unread-count">{unreadCount}</span>}
                  </Link>
                  <Link to="/feedback" onClick={closeMobileMenu}>Feedback</Link>
                  <span className="greeting">Hello, {profile?.username}</span>
                  <button onClick={() => { handleLogout(); closeMobileMenu(); }} className="action-button">Logout</button>
                </>
              )}
            </>
          ) : (
            <>
              <div className={`dropdown ${isDropdownOpen ? 'active' : ''}`}>
                <span className="dropdown-toggle" onClick={toggleDropdown}>
                  How it Works <FaChevronDown className="dropdown-icon" />
                </span>
                <div className="dropdown-menu">
                  <Link to="/how-it-works/jobseeker-faq" onClick={closeMobileMenu}>Jobseeker FAQ</Link>
                  <Link to="/how-it-works/employer-faq" onClick={closeMobileMenu}>Employer FAQ</Link>
                </div>
              </div>
              <Link to="/pricing" onClick={closeMobileMenu}>Pricing</Link>
              <Link to="/real-results" onClick={closeMobileMenu}>Real Results</Link>
              <Link to="/role-selection" className="post-job" onClick={closeMobileMenu}>POST A JOB</Link>
              <Link to="/find-job" className="find-job" onClick={closeMobileMenu}>FIND JOB</Link>
              <Link to="/messages" onClick={closeMobileMenu}>Messages</Link>
              <span className="nav-divider"></span>
              <Link to="/login" className="login-link" onClick={closeMobileMenu}>LOG IN</Link>
              <Link to="/role-selection" className="signup-link" onClick={closeMobileMenu}>SIGN UP</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;