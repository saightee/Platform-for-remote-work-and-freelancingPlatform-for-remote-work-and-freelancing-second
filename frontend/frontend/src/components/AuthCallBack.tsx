import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectRole } = useAuth();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');
    const role = searchParams.get('role');

    console.log('[AuthCallback] Received token:', token, 'role:', role, 'at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }));

    if (token) {
      localStorage.setItem('token', token);
      if (role) {
        selectRole(role, token)
          .then(() => {
            console.log('[AuthCallback] Role selected, redirecting to /myaccount at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }));
            navigate('/myaccount');
          })
          .catch((error) => {
            console.error('[AuthCallback] Role selection error at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }), error);
            navigate('/login');
          });
      } else {
        console.log('[AuthCallback] No role provided, redirecting to /myaccount at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }));
        navigate('/myaccount');
      }
    } else {
      console.error('[AuthCallback] No token received, redirecting to /login at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }));
      navigate('/login');
    }
  }, [navigate, location, selectRole]);

  return <div>Processing authentication...</div>;
};

export default AuthCallback;