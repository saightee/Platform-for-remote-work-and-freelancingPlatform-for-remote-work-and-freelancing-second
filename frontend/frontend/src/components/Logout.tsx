import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Logout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await logout();
        navigate('/');
      } catch (err: any) {
        setError(err.message);
      }
    };

    handleLogout();
  }, [logout, navigate]);

  const containerStyles: React.CSSProperties = {
    textAlign: 'center',
    padding: '3rem 0',
  };

  const titleStyles: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#2c3e50',
    marginBottom: '1rem',
  };

  const errorStyles: React.CSSProperties = {
    color: 'red',
    fontSize: '0.9rem',
  };

  return (
    <div style={containerStyles}>
      <h2 style={titleStyles}>Logging Out...</h2>
      {error && <p style={errorStyles}>{error}</p>}
    </div>
  );
};

export default Logout;