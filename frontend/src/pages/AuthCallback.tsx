// src/pages/AuthCallback.tsx
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { useRole } from '../context/RoleContext';

const AuthCallback: React.FC = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { refreshProfile } = useRole();

  const params = new URLSearchParams(search);
  const token = params.get('token');
  const verified = params.get('verified');
  const error = params.get('error');
  const email =
    params.get('email') || localStorage.getItem('pendingEmail') || '';

  useEffect(() => {
    // успех — логиним и идём на главную
    if (token && verified === 'true') {
      document.cookie = 'jobforge.sid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      localStorage.setItem('token', token);
      refreshProfile()
        .then(() => {
          localStorage.removeItem('pendingEmail'); // почистили запасной e-mail
          navigate('/');
        })
        .catch(() => {
          localStorage.removeItem('token');
          document.cookie = 'jobforge.sid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
          navigate('/login');
        });
      return;
    }

    // любая ошибка/просрочка/нет токена — на страницу ресенда
    navigate('/check-email', { replace: true, state: { email } });
  }, [token, verified, error, email, navigate, refreshProfile]);

  return <Loader />;
};

export default AuthCallback;
