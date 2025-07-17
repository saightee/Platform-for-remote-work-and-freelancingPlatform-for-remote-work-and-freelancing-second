import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';

const AuthCallback: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const verified = params.get('verified');
  const error = params.get('error');

  useEffect(() => {
    if (token && verified === 'true') {
      localStorage.setItem('token', token);  // Сохрани токен
      navigate('/');  // На главную
    } else if (error) {
      alert('Verification error: ' + error);  // Обработай ошибку
      navigate('/login');
    } else {
      navigate('/login');  // Фоллбек
    }
  }, [navigate]);

  return <Loader />;
};

export default AuthCallback;