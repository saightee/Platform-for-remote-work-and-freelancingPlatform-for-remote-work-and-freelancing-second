import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { getPlatformFeedback } from '../services/api';
import Loader from '../components/Loader';

const ClientStories: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (isLoading) return <Loader />;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <Header />
      <div className="container">
        <h2>Client Stories</h2>
        {feedbacks.length > 0 ? (
          feedbacks.map((fb) => (
            <div key={fb.id} className="feedback-item">
              <p><strong>Rating:</strong> {fb.rating}</p>
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