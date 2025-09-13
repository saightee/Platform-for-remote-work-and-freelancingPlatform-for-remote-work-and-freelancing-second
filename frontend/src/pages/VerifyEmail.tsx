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
  const run = async () => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Invalid or missing verification token.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await verifyEmail(token); // реальный вызов бэка
      setMessage(res?.message || 'Email verified successfully.');

      // читаем, что сохранили при регистрации
      const role   = localStorage.getItem('pendingRole') as 'employer' | 'jobseeker' | null;
      const after  = localStorage.getItem('afterVerifyReturn') || '';
      const hasAfter = after.startsWith('/') && !after.startsWith('//');

      // чистим
      try { localStorage.removeItem('afterVerifyReturn'); } catch {}
      try { localStorage.removeItem('pendingRole'); } catch {}
      try { localStorage.removeItem('pendingEmail'); } catch {}

      // редирект по правилам
      if (role === 'jobseeker' && hasAfter) {
        navigate(after, { replace: true });
      } else if (role === 'employer') {
        navigate('/employer-dashboard', { replace: true });
      } else {
        navigate('/jobseeker-dashboard', { replace: true });
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Email verification failed. The link may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };
  run();
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