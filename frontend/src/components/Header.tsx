import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { logout, getMyApplications, getMyJobPosts, getApplicationsForJobPost } from '../services/api';
import { FaChevronDown, FaBars, FaTimes } from 'react-icons/fa';
import { JobApplicationDetails, JobApplication } from '@types';

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
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token && (!!profile || ['admin', 'moderator'].includes(currentRole || ''));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  const showBackToDashboard = ['admin', 'moderator'].includes(currentRole || '') &&
    !location.pathname.startsWith(currentRole === 'admin' ? '/admin' : '/moderator');

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const apps = await getMyApplications();
        const transformedApps: JobApplicationDetails[] = apps.map(app => ({
          applicationId: app.id,
          userId: app.job_seeker_id,
          username: app.job_seeker?.username || 'Unknown',
          email: app.job_seeker?.email || 'Unknown',
          jobDescription: '', // Заполни, если есть данные
          appliedAt: app.created_at,
          status: app.status,
          job_post_id: app.job_post_id,
        }));
        setApplications(transformedApps.filter(app => app.status === 'Accepted'));
      } catch (error) {
        console.error('Error fetching applications:', error);
      }
    };
    fetchApplications();
  }, []);

  useEffect(() => {
    if (!profile || !['jobseeker', 'employer'].includes(profile.role) || !socket || !token) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadMessages = async () => {
      try {
        let applications: JobApplicationDetails[] = [];
        if (profile.role === 'jobseeker') {
          const apps = await getMyApplications();
          applications = apps.map(app => ({
            applicationId: app.id,
            userId: app.job_seeker_id,
            username: app.job_seeker?.username || 'Unknown',
            email: app.job_seeker?.email || 'Unknown',
            jobDescription: '',
            appliedAt: app.created_at,
            status: app.status,
            job_post_id: app.job_post_id,
          })).filter(app => app.status === 'Accepted');
        } else if (profile.role === 'employer') {
          const posts = await getMyJobPosts();
          const appsPromises = posts.map(post => getApplicationsForJobPost(post.id));
          const appsArrays = await Promise.all(appsPromises);
          applications = appsArrays.flat().filter(app => app.status === 'Accepted');
        }

        if (applications.length === 0) {
          console.log('No accepted applications, skipping WebSocket join.');
          setUnreadCount(0);
          return;
        }

        applications.forEach(app => {
          socket.emit('joinChat', { jobApplicationId: app.applicationId });
        });

        socket.on('chatHistory', (history: Message[]) => {
          if (history.length > 0) {
            const unread = history.filter(msg => msg.recipient_id === profile.id && !msg.is_read).length;
            setUnreadCount(unread);
          }
        });

        socket.on('newMessage', (message: Message) => {
          if (message.recipient_id === profile.id && !message.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        });

        socket.on('connect_error', (err) => {
          console.error('WebSocket connection error in Header:', err.message);
        });

        return () => {
          socket.off('chatHistory');
          socket.off('newMessage');
          socket.off('connect_error');
        };
      } catch (err) {
        console.error('Error fetching unread messages in Header:', err);
      }
    };

    fetchUnreadMessages();
  }, [profile, socket, token]);

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
    setIsMobileMenuOpen((prev) => !prev);
    if (isDropdownOpen) setIsDropdownOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDropdownOpen((prev) => !prev);
  };

  if (isLoading) {
    return (
      <header className="header-container">
        <div className="header-content">
          <Link to="/" className="logo">
            Jobforge_
          </Link>
          <button className="burger-menu" onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <nav className={`nav ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
            <Link to="/role-selection" className="signup-link" onClick={closeMobileMenu}>
              SIGN UP
            </Link>
            <Link to="/login" className="login-link" onClick={closeMobileMenu}>
              LOG IN
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="header-container">
      <div className="header-content">
        <Link to="/" className="logo" onClick={closeMobileMenu}>
          Jobforge_
        </Link>
        <button className="burger-menu" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
        <nav className={`nav ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
          {isAuthenticated ? (
            <>
              {['admin', 'moderator'].includes(currentRole || '') ? (
                <>
                  {showBackToDashboard && (
                    <Link to={currentRole === 'admin' ? '/admin' : '/moderator'} onClick={closeMobileMenu}>
                      Back to Dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      closeMobileMenu();
                    }}
                    className="action-button"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/profile" onClick={closeMobileMenu}>
                    Profile
                  </Link>
                  {profile?.role === 'jobseeker' && (
                    <>
                      <Link to="/my-applications" onClick={closeMobileMenu}>
                        My Applications
                      </Link>
                      <Link to="/find-job" onClick={closeMobileMenu}>
                        Find Job
                      </Link>
                    </>
                  )}
                  {profile?.role === 'employer' && (
                    <>
                      <Link to="/my-job-posts" onClick={closeMobileMenu}>
                        My Job Posts
                      </Link>
                      <Link to="/post-job" onClick={closeMobileMenu}>
                        Post Job
                      </Link>
                    </>
                  )}
                  <Link to="/messages" onClick={closeMobileMenu}>
                    Messages {unreadCount > 0 && <span className="unread-count">{unreadCount}</span>}
                    {socketStatus === 'reconnecting' && <span className="reconnecting">...</span>}
                  </Link>
                  <Link to="/feedback" onClick={closeMobileMenu}>
                    Feedback
                  </Link>
                  <span className="greeting">Hello, <span className="username-bold">{profile?.username}</span></span>
                  <button
                    onClick={() => {
                      handleLogout();
                      closeMobileMenu();
                    }}
                    className="action-button"
                  >
                    Logout
                  </button>
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
                  <Link to="/how-it-works/jobseeker-faq" onClick={closeMobileMenu}>
                    Jobseeker FAQ
                  </Link>
                  <Link to="/how-it-works/employer-faq" onClick={closeMobileMenu}>
                    Employer FAQ
                  </Link>
                </div>
              </div>
              <Link to="/pricing" onClick={closeMobileMenu}>
                Pricing
              </Link>
              <Link to="/real-results" onClick={closeMobileMenu}>
                Real Results
              </Link>
              <Link to="/role-selection" className="post-job" onClick={closeMobileMenu}>
                POST A JOB
              </Link>
              <Link to="/find-job" className="find-job" onClick={closeMobileMenu}>
                FIND JOB
              </Link>
              <span className="nav-divider"></span>
              <Link to="/login" className="login-link" onClick={closeMobileMenu}>
                LOG IN
              </Link>
              <Link to="/role-selection" className="signup-link" onClick={closeMobileMenu}>
                SIGN UP
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
