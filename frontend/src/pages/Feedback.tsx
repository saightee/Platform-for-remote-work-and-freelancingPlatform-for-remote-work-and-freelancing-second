import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { submitFeedback } from '../services/api';
import Copyright from '../components/Copyright';

const Feedback: React.FC = () => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!message.trim()) {
    setError('Feedback cannot be empty.');
    return;
  }
  if (message.length > 500) {
    setError('Feedback cannot exceed 500 characters.');
    return;
  }
  try {
    setError(null);
    await submitFeedback(message);
    alert('Feedback submitted successfully!');
    setMessage('');
  } catch (error) {
    console.error('Error submitting feedback:', error);
    setError('Failed to submit feedback.');
  }
};

  return (
    <div>
      <Header />
      <div className="container">
        <h2>Submit Feedback</h2>
        {error && <p className="error-message">{error}</p>}
        <div>
          <div className="form-group">
            <label>Your Feedback:</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
          </div>
          <button onClick={handleSubmit}>Submit Feedback</button>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default Feedback;