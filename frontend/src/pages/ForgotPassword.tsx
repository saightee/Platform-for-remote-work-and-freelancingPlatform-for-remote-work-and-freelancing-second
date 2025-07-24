import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { forgotPassword } from '../services/api';
import Loader from '../components/Loader';


const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await forgotPassword(email.trim());
      setMessage(response.message || 'Password reset link sent to your email.');
      setEmail('');
      setTimeout(() => navigate('/login'), 3000); // Редирект на логин через 3 секунды
    } catch (err: any) {
      console.error('Error requesting password reset:', err);
      setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loader />; 
  }

  return (
    <div>
      <Header />
    
    <div className="container forgot-password-container">
      
      <h2>Forgot Password</h2>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit} className="forgot-password-form">
        <div className="form-group">
          <label>Email Address:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </div>
        <button type="submit" className="action-button" disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
     
    </div>
     <Footer />
      <Copyright />
    </div>
  );
};

export default ForgotPassword;