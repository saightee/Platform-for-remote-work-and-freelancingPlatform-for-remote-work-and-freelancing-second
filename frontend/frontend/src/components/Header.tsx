import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  const headerStyles: React.CSSProperties = {
    padding: '1rem 0',
    borderBottom: '1px solid #e9ecef',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const logoStyles: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#2c3e50',
    textDecoration: 'none',
  };

  const navStyles: React.CSSProperties = {
    display: 'flex',
    gap: '1rem',
  };

  const linkStyles: React.CSSProperties = {
    color: '#007bff',
    textDecoration: 'none',
    fontSize: '0.9rem',
  };

  const userStyles: React.CSSProperties = {
    color: '#666',
    fontSize: '0.9rem',
  };

  return (
    <header style={headerStyles}>
      <Link to="/" style={logoStyles}>VACONNECT</Link>
      <nav style={navStyles}>
        {isAuthenticated ? (
          <>
            <span style={userStyles}>Welcome, {user}</span>
            <Link to="/logout" style={linkStyles}>Logout</Link>
          </>
        ) : (
          <>
            <Link to="/login" style={linkStyles}>Login</Link>
            <Link to="/register" style={linkStyles}>Register</Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;