import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { getPlatformFeedback, submitPlatformFeedback } from '../services/api';
import Loader from '../components/Loader';

const ClientStories: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setIsLoading(true);
        const response = await getPlatformFeedback();
        const employerFeedbacks = response.data.filter((fb: any) => fb.user.role === 'employer');
        setFeedbacks(employerFeedbacks);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load feedback.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeedback();
  }, []);

  const handleSubmitStory = async () => {
    if (rating < 1 || rating > 5) {
      setFormError('Rating must be between 1 and 5.');
      return;
    }
    if (!description.trim()) {
      setFormError('Description cannot be empty.');
      return;
    }
    try {
      setFormError(null);
      await submitPlatformFeedback(rating, description);
      alert('Story submitted successfully!');
      setShowSubmitForm(false);
      setDescription('');
      setRating(5);
      const response = await getPlatformFeedback();
      const employerFeedbacks = response.data.filter((fb: any) => fb.user.role === 'employer');
      setFeedbacks(employerFeedbacks);
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Failed to submit story.');
    }
  };

  if (isLoading) return <Loader />;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <Header />
      <div className="container">
        <h2>Client Stories</h2>
        <button onClick={() => setShowSubmitForm(true)} className="action-button">
          Leave Your Story
        </button>
        {showSubmitForm && (
          <div className="submit-form">
            {formError && <p className="error-message">{formError}</p>}
            <div className="form-group">
              <label>Rating:</label>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`star ${star <= rating ? 'filled' : ''}`}
                    onClick={() => setRating(star)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Description:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Your story..."
                rows={5}
                className="textarea"
              />
            </div>
            <div className="action-buttons">
              <button onClick={handleSubmitStory} className="action-button success">
                Submit
              </button>
              <button onClick={() => setShowSubmitForm(false)} className="action-button">
                Cancel
              </button>
            </div>
          </div>
        )}
        {feedbacks.length > 0 ? (
          feedbacks.map((fb) => (
            <div key={fb.id} className="feedback-item">
              <p><strong>Rating:</strong> {fb.rating} ★</p>
              <p><strong>Description:</strong> {fb.description}</p>
              <p><strong>By:</strong> {fb.user.username} ({fb.user.role})</p>
              <p><strong>Date:</strong> {fb.created_at}</p>
            </div>
          ))
        ) : (
          <p>No client stories yet.</p>
        )}
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default ClientStories;