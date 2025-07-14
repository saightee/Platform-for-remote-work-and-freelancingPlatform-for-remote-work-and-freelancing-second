import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { useState } from 'react';
import { submitFeedback } from '../services/api'; // Reuse feedback submit, or new if needed

const Support: React.FC = () => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitFeedback(message); // Using endpoint 37 for support issues
      setSuccess(true);
      setMessage('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit support request.');
    }
  };

  return (
    <div>
      <Header />
      <div className="container">
        <h2>Support</h2>
        <p>Contact us for help or report issues.</p>
        <form onSubmit={handleSubmit} className="feedback-form">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue or suggestion"
            rows={6}
            required
          />
          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">Support request submitted!</p>}
          <button type="submit" className="action-button">Submit</button>
        </form>
      </div>

    </div>
  );
};

export default Support;