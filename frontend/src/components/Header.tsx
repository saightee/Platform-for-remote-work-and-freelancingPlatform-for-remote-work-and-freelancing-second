import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { logout } from '../services/api';
import { FaChevronDown, FaBars, FaTimes } from 'react-icons/fa';


const Header: React.FC = () => {
  const { profile, isLoading } = useRole();
  const token = localStorage.getItem('token');
  const isAuthenticated = token && profile;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('token');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleMobileMenu = () => {
    console.log('Toggling mobile menu. Current state:', isMobileMenuOpen);
    setIsMobileMenuOpen(prev => !prev);
    if (isDropdownOpen) setIsDropdownOpen(false); // Закрываем dropdown при переключении меню
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault(); // Предотвращаем переход по ссылке
    console.log('Toggling dropdown. Current state:', isDropdownOpen); // Отладка
    setIsDropdownOpen(prev => !prev);
  };

  if (isLoading) return null;

  return (
    <header className="header-container">
      <div className="header-content">
        <Link to="/" className="logo">Jobforge_</Link>
        <button className="burger-menu" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
        <nav className={`nav ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
          {isAuthenticated ? (
            <>
              <Link to="/profile" onClick={closeMobileMenu}>Profile</Link>
              {profile.role === 'jobseeker' && (
                <>
                  <Link to="/my-applications" onClick={closeMobileMenu}>My Applications</Link>
                  <Link to="/find-job" onClick={closeMobileMenu}>Find Job</Link>
                </>
              )}
              {profile.role === 'employer' && (
                <>
                  <Link to="/my-job-posts" onClick={closeMobileMenu}>My Job Posts</Link>
                  <Link to="/post-job" onClick={closeMobileMenu}>Post Job</Link>
                </>
              )}
              <Link to="/feedback" onClick={closeMobileMenu}>Feedback</Link>
              <span className="greeting">Hello, {profile.username}</span>
              <button onClick={() => { handleLogout(); closeMobileMenu(); }}>Logout</button>
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