import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Header.css';

const Header: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="header">
      <div className="logo">
      <Link to="/" className="logo">
        <span className="logo-hire">Hire</span>
        <span className="logo-volve">volve</span>
      </Link>
      </div>
      <nav className="nav">
        <ul>
          <li>
            <Link to="/jobs">Find a Job</Link>
          </li>
          <li>
            <Link to="/post-job">Post a Job</Link>
          </li>
          {isAuthenticated ? (
            <>
              <li>
                <Link to="/logout" onClick={logout}>Logout</Link>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/login">Login</Link>
              </li>
              <li>
                <Link to="/register">Register</Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;