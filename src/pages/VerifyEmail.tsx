import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
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

    const verify = async () => {
      try {
        setIsLoading(true);
        const response = await verifyEmail(token);
        setMessage(response.message || 'Email verified successfully!');
        setTimeout(() => navigate('/login'), 3000); // Редирект на логин через 3 секунды
      } catch (err: any) {
        console.error('Error verifying email:', err);
        setError(err.response?.data?.message || 'Failed to verify email. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    verify();
  }, [searchParams, navigate]);

  return (
    <div className="container verify-email-container">
      <Header />
      <h2>Email Verification</h2>
      {isLoading && <p>Loading...</p>}
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
      <Footer />
      <Copyright />
    </div>
  );
};

export default VerifyEmail;