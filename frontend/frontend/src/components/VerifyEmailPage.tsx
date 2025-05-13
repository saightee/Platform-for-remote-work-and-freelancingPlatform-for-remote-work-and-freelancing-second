import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

const VerifyEmailPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { verifyEmail, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setError('Invalid verification link');
        return;
      }
      try {
        await verifyEmail(token);
        setSuccess('Email verified successfully! Redirecting...');
        setTimeout(() => {
          if (role) {
            navigate('/myaccount');
          } else {
            navigate('/select-role');
          }
        }, 2000);
      } catch (err: any) {
        setError(err.message || 'Verification failed');
      }
    };
    verify();
  }, [token, verifyEmail, role, navigate]);

  return (
    <div className="login-container">
      <h2 className="login-title">Verifying Email</h2>
      {error && <p className="login-error">{error}</p>}
      {success && <p className="login-success">{success}</p>}
    </div>
  );
};

export default VerifyEmailPage;