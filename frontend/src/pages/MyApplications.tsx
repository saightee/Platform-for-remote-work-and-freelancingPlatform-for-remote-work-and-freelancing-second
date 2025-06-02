import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getMyApplications, createReview } from '../services/api';
import { JobApplication } from '@types';
import { useRole } from '../context/RoleContext';
import Copyright from '../components/Copyright';
import { formatDateInTimezone } from '../utils/dateUtils';

const MyApplications: React.FC = () => {
  const { profile } = useRole();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<{ applicationId: string; rating: number; comment: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      if (!profile || profile.role !== 'jobseeker') {
        setError('This page is only available for jobseekers.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await getMyApplications();
        setApplications(data);
      } catch (err: any) {
        console.error('Error fetching applications:', err);
        setError(err.response?.data?.message || 'Failed to load applications. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchApplications();
  }, [profile]);

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm) return;
    if (reviewForm.rating < 1 || reviewForm.rating > 5) {
      setFormError('Rating must be between 1 and 5.');
      return;
    }
    if (!reviewForm.comment.trim()) {
      setFormError('Comment cannot be empty.');
      return;
    }
    try {
      setFormError(null);
      await createReview({
        job_application_id: reviewForm.applicationId,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
      setReviewForm(null);
      alert('Review submitted successfully!');
    } catch (error: any) {
      console.error('Error creating review:', error);
      setFormError(error.response?.data?.message || 'Failed to submit review.');
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="container">
          <h2>My Applications</h2>
          <p>Loading...</p>
        </div>
        <Footer />
        <Copyright />
      </div>
    );
  }

  if (!profile || profile.role !== 'jobseeker') {
    return (
      <div>
        <Header />
        <div className="container">
          <h2>My Applications</h2>
          <p>{error}</p>
        </div>
        <Footer />
        <Copyright />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="container my-applications-container">
        <h2>My Applications</h2>
        {error && <p className="error-message">{error}</p>}
        {applications.length > 0 ? (
          <div className="application-grid">
            {applications.map((app) => (
              <div key={app.id} className="application-card">
                <h3>{app.job_post?.title || 'Unknown Job'}</h3>
                <p><strong>Status:</strong> {app.status}</p>
                <p><strong>Applied On:</strong> {formatDateInTimezone(app.created_at, profile.timezone)}</p>
                {app.status === 'Accepted' && (
<<<<<<< HEAD
                  <>
                    <p className="success-message">Congratulations! Your application has been accepted.</p>
                    <button
                      onClick={() => setReviewForm({ applicationId: app.id, rating: 5, comment: '' })}
                      className="action-button"
                    >
                      Leave Review
                    </button>
                  </>
                )}
                {app.status === 'Rejected' && (
                  <p className="error-message">Unfortunately, your application was rejected.</p>
=======
                  <button
                    onClick={() => setReviewForm({ applicationId: app.id, rating: 5, comment: '' })}
                    className="action-button"
                  >
                    Leave Review
                  </button>
>>>>>>> 106c1739ee3388611e17fd6a61611bb44491a598
                )}
                {reviewForm && reviewForm.applicationId === app.id && (
                  <form onSubmit={handleCreateReview} className="review-form">
                    {formError && <p className="error-message">{formError}</p>}
                    <div className="form-group">
                      <label>Rating (1-5):</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={reviewForm.rating}
                        onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Comment:</label>
                      <textarea
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        placeholder="Enter your review"
                        rows={4}
                      />
                    </div>
                    <div className="action-buttons">
                      <button type="submit" className="action-button success">
                        Submit Review
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReviewForm(null);
                          setFormError(null);
                        }}
                        className="action-button"
                        style={{ marginLeft: '10px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>No applications found.</p>
        )}
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default MyApplications;