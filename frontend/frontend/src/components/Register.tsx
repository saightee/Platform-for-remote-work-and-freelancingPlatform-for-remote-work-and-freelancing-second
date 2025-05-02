import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, username }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const containerStyles: React.CSSProperties = {
    maxWidth: '400px',
    margin: '50px auto',
    padding: '2rem',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
  };

  const titleStyles: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#2c3e50',
    marginBottom: '1.5rem',
    textAlign: 'center',
  };

  const formStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  };

  const inputStyles: React.CSSProperties = {
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #e9ecef',
    borderRadius: '4px',
    outline: 'none',
  };

  const buttonStyles: React.CSSProperties = {
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: 500,
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  };

  const errorStyles: React.CSSProperties = {
    color: 'red',
    fontSize: '0.9rem',
    textAlign: 'center',
  };

  const linkContainerStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '1rem',
  };

  const linkStyles: React.CSSProperties = {
    color: '#007bff',
    textDecoration: 'none',
    fontSize: '0.9rem',
  };

  return (
    <div style={containerStyles}>
      <h2 style={titleStyles}>Register</h2>
      {error && <p style={errorStyles}>{error}</p>}
      <form onSubmit={handleRegister} style={formStyles}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyles}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyles}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyles}
          required
        />
        <button type="submit" style={buttonStyles}>Register</button>
      </form>
      <div style={linkContainerStyles}>
        <Link to="/forgot-password" style={linkStyles}>Forgot Password?</Link>
        <Link to="/" style={linkStyles}>Go to Home</Link>
      </div>
    </div>
  );
};

export default Register;