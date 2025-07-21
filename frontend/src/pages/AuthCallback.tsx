import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { useRole } from '../context/RoleContext';  // Импорт useRole

const AuthCallback: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshProfile } = useRole();  // Добавь
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const verified = params.get('verified');
  const error = params.get('error');

  useEffect(() => {
    if (token && verified === 'true') {
      localStorage.setItem('token', token);  // Сохрани токен
      refreshProfile().then(() => {
        navigate('/');  // Или на основе role, если в context есть логика
      }).catch((err) => {
        console.error('Error refreshing profile:', err);
        navigate('/login');
      });
    } else if (error) {
      alert('Verification error: ' + error);  // Обработай ошибку
      navigate('/login');
    } else {
      navigate('/login');  // Фоллбек
    }
  }, [navigate, refreshProfile]);  // Добавь refreshProfile в deps

  return <Loader />;
};

export default AuthCallback;