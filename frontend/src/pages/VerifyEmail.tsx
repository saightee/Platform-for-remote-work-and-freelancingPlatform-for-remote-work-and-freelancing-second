import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import Loader from '../components/Loader';
import { Link } from 'react-router-dom';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    console.log('Verification token:', token);
    if (!token) {
      setError('Invalid or missing verification token.');
      setIsLoading(false);
      return;
    }

    // No api call, backend redirects to /auth/callback, this is fallback if direct access
    setError('Verification link processed. If not redirected, please login.');
    setTimeout(() => navigate('/login'), 5000);
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