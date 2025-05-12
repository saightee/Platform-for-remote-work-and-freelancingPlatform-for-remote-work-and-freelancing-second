import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/VerifyEmail.css';

const VerifyEmailPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  if (!auth) {
    console.error('Auth context is undefined in VerifyEmailPage');
    return <div>Error: Auth context is not available</div>;
  }

  const { verifyEmail } = auth;

  useEffect(() => {
    const handleVerification = async () => {
      if (!token) {
        setError('Invalid verification token');
        return;
      }

      try {
        await verifyEmail(token);
        navigate('/select-role');
      } catch (err: any) {
        setError(err.message);
        setTimeout(() => navigate('/register'), 3000);
      }
    };

    handleVerification();
  }, [token, verifyEmail, navigate]);

  return (
    <div className="verify-email-page">
      {error ? (
        <>
          <h2>Email Verification Failed</h2>
          <p className="error">{error}</p>
          <p>Redirecting to registration page...</p>
        </>
      ) : (
        <>
          <h2>Verifying Email...</h2>
          <p>Please wait while we verify your email.</p>
        </>
      )}
    </div>
  );
};

export default VerifyEmailPage;