import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
  const { user } = useAuth();

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 0',
  };

  const logoStyles: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#2c3e50',
  };

  const navStyles: React.CSSProperties = {
    display: 'flex',
    gap: '1rem',
  };

  const linkStyles: React.CSSProperties = {
    color: '#666',
    textDecoration: 'none',
    fontSize: '0.9rem',
  };

  const authLinkStyles: React.CSSProperties = {
    color: '#007bff',
    textDecoration: 'none',
    fontSize: '0.9rem',
  };

  return (
    <header>
      <div style={headerStyles}>
        <div>
          <Link to="/" style={logoStyles}>VACONNECT</Link>
        </div>
        <nav style={navStyles}>
          <Link to="/for-employers" style={linkStyles}>For Employers</Link>
          <Link to="/for-vas" style={linkStyles}>For VAs</Link>
          <Link to="/categories" style={linkStyles}>Categories</Link>
          <Link to="/how-it-works" style={linkStyles}>How It Works</Link>
          <Link to="/pricing" style={linkStyles}>Pricing</Link>
          {user ? (
            <Link to="/logout" style={authLinkStyles}>Logout</Link>
          ) : (
            <Link to="/register" style={authLinkStyles}>Register</Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;