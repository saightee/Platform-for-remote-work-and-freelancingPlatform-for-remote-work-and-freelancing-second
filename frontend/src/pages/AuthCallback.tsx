import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { useRole } from '../context/RoleContext';

const AuthCallback: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshProfile } = useRole();
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const verified = params.get('verified');
  const error = params.get('error');

  useEffect(() => {
    if (token && verified === 'true') {
      document.cookie = 'jobforge.sid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'; // Очистка cookie
      localStorage.setItem('token', token);
      refreshProfile()
        .then(() => {
          navigate('/');
        })
        .catch((err) => {
          console.error('Error refreshing profile:', err);
          localStorage.removeItem('token');
          document.cookie = 'jobforge.sid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
          navigate('/login');
        });
    } else if (error) {
      alert('Verification error: ' + error);
      navigate('/login');
    } else {
      navigate('/login');
    }
  }, [navigate, refreshProfile]);

  return <Loader />;
};

export default AuthCallback;