import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import Loader from '../components/Loader';
import { Link } from 'react-router-dom';
import { verifyEmail } from '../services/api';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const token = searchParams.get('token');

  if (!token) {
    setError('Invalid or missing verification token.');
    setIsLoading(false);
    return;
  }

  (async () => {
    try {
      await verifyEmail(token); // подтверждаем e-mail на бэке
      setMessage('Your email has been verified successfully.');

      // читаем, куда вести после верификации
      const role = localStorage.getItem('pendingRole');
      const afterReturn = localStorage.getItem('afterVerifyReturn') || '';

      // чистим временные ключи (e-mail можно оставить по желанию)
      localStorage.removeItem('afterVerifyReturn');
      localStorage.removeItem('pendingRole');

      // правила:
      // - если jobseeker и есть сохранённый return — ведём на вакансию
      // - иначе по роли в соответствующий дашборд
      const dest =
        role === 'jobseeker' && afterReturn
          ? afterReturn
          : role === 'employer'
            ? '/employer-dashboard'
            : role === 'jobseeker'
              ? '/jobseeker-dashboard'
              : '/login';

      // чуть показываем сообщение и уводим
      setTimeout(() => navigate(dest, { replace: true }), 1500);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  })();
}, [searchParams, navigate]);


  if (isLoading) {
    return <Loader />;
  }

  return (
    <div>
      <Header />
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
              <Link to="/forgot-password">Request a new verification link</Link> or{' '}
              <Link to="/contact">contact support</Link>.
            </p>
          </div>
        )}
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default VerifyEmail;