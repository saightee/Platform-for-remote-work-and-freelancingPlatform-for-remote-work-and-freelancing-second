import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { verifyEmail } from '../services/api';
import { AxiosError } from 'axios';
import Loader from '../components/Loader';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
  const token = searchParams.get('token');
  console.log('Verification token:', token); // Логирование токена для диагностики
  if (!token) {
    setError('Invalid or missing verification token.');
    setIsLoading(false);
    return;
  }

  const verify = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await verifyEmail(token);
      console.log('Email verification response:', response); // Логирование ответа
      setMessage(response.message || 'Email successfully confirmed');
      setTimeout(() => navigate('/login'), 5000); // Редирект на страницу логина через 5 секунд
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ message?: string }>;
      console.error('Error verifying email:', axiosError.response?.data || axiosError.message);
      const errorMessage =
        axiosError.response?.status === 400
          ? axiosError.response?.data?.message || 'Invalid or expired verification token.'
          : 'Failed to verify email. Please try again or contact support.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  verify();
}, [searchParams, navigate]);

  if (isLoading) {
    return <Loader />; // Лоадер на время верификации
  }

  return (
    <div className="container verify-email-container">
      
      <h2>Email Verification</h2>
      {message && (
        <div className="success-message">
          <p>{message}</p>
          <p>You will be redirected to the login page shortly.</p>
        </div>
      )}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <p>
            <a href="/forgot-password">Request a new verification link</a> or{' '}
            <a href="/contact">contact support</a>.
          </p>
        </div>
      )}
    </div>
  );
};

export default VerifyEmail;