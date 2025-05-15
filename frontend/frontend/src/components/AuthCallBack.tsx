import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallBack: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const role = searchParams.get('role');

  useEffect(() => {
    console.log(
      '[AuthCallback] Current URL:',
      window.location.href,
      'at',
      new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }),
    );
    console.log(
      '[AuthCallback] Search params - token:',
      token,
      'role:',
      role,
      'at',
      new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }),
    );

    if (token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
        if (role) {
          localStorage.setItem('role', role);
        }
      }
      console.log(
        '[AuthCallback] Token saved, redirecting to /myaccount at',
        new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }),
      );
      navigate('/myaccount', { replace: true });
    } else {
      console.error(
        '[AuthCallback] No token received, redirecting to /login at',
        new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }),
      );
      navigate('/login', { replace: true });
    }
  }, [token, role, navigate]);

  return <div>Processing authentication...</div>;
};

export default AuthCallBack;