import { Link } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { logout } from '../services/api';
import { FaChevronDown } from 'react-icons/fa';

const Header: React.FC = () => {
  const { profile, isLoading } = useRole();
  const token = localStorage.getItem('token');
  const isAuthenticated = token && profile;

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('token');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) return null;

  return (
    <header className="header-container">
      <div className="header-content">
        <Link to="/" className="logo">HireVolve</Link>
        <nav>
          {isAuthenticated ? (
            <>
              <Link to="/profile">Profile</Link>
              {profile.role === 'jobseeker' && <Link to="/my-applications">My Applications</Link>}
              {profile.role === 'employer' && <Link to="/my-job-posts">My Job Posts</Link>}
              {/* {profile.role === 'admin' && <Link to="/admin">Admin Dashboard</Link>} */}
              <Link to="/feedback">Feedback</Link>
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <div className="dropdown">
                <span className="dropdown-toggle">
                  How it Works <FaChevronDown className="dropdown-icon" />
                </span>
                <div className="dropdown-menu">
                  <Link to="/how-it-works/jobseeker-faq">Jobseeker FAQ</Link>
                  <Link to="/how-it-works/employer-faq">Employer FAQ</Link>
                </div>
              </div>
              <Link to="/pricing">Pricing</Link>
              <Link to="/real-results">Real Results</Link>
              <Link to="/role-selection" className="post-job">POST A JOB</Link>
              <Link to="/find-job" className="find-job">FIND JOB</Link>
              <span className="nav-divider"></span>
              <Link to="/login" className="login-link">LOG IN</Link>
              <Link to="/role-selection" className="signup-link">SIGN UP</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;