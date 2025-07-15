import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getMyApplications, createReview } from '../services/api';
import { JobApplication } from '@types';
import { useRole } from '../context/RoleContext';
import Copyright from '../components/Copyright';
import { formatDateInTimezone } from '../utils/dateUtils';
// import { mockApplications } from '../mocks/mockMyApplications'; // Закомментировано

const MyApplications: React.FC = () => {
  const { profile } = useRole();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<{ applicationId: string; rating: number; comment: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Эмуляция profile для мока (закомментировано)
  // const mockProfile = { role: 'jobseeker' };
  // if (!mockProfile || mockProfile.role !== 'jobseeker') {
  //   return (
  //     <div>
  //       <Header />
  //       <div className="container">
  //         <h2>My Applications</h2>
  //         <p>This page is only available for jobseekers.</p>
  //       </div>
  //       <Footer />
  //       <Copyright />
  //     </div>
  //   );
  // }

  // Мок-useEffect закомментирован
  // useEffect(() => {
  //   const mockProfile = { role: 'jobseeker' };
  //   if (!mockProfile || mockProfile.role !== 'jobseeker') {
  //     setError('This page is only available for jobseekers.');
  //     setIsLoading(false);
  //     return;
  //   }
  //   setApplications(mockApplications);
  //   setIsLoading(false);
  // }, []);

  // Для продакшена: раскомментировать этот useEffect
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
      setFormError('Please select a rating between 1 and 5 stars.');
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

  const handleStarClick = (rating: number) => {
    if (reviewForm) {
      setReviewForm({ ...reviewForm, rating });
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
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="container my-app-container">
        <h2>My Applications</h2>
        {error && <p className="my-app-error">{error}</p>}
        {applications.length > 0 ? (
          <div className="my-app-grid">
            {applications.map((app) => (
              <div key={app.id} className="my-app-card">
                <h3>{app.job_post?.title || 'Unknown Job'}</h3>
                <p><strong>Status:</strong> {app.status}</p>
                <p><strong>Applied On:</strong> {formatDateInTimezone(app.created_at, profile.timezone)}</p>
                {app.status === 'Accepted' && (
                  <>
                    <p className="my-app-success">Congratulations! Your application has been accepted.</p>
                    <button
                      onClick={() => setReviewForm({ applicationId: app.id, rating: 5, comment: '' })}
                      className="my-app-button"
                    >
                      Leave Review
                    </button>
                  </>
                )}
                {app.status === 'Rejected' && (
                  <p className="my-app-error">Unfortunately, your application was rejected.</p>
                )}
                {reviewForm && reviewForm.applicationId === app.id && (
                  <form onSubmit={handleCreateReview} className="my-app-review-form">
                    {formError && <p className="my-app-error">{formError}</p>}
                    <div className="my-app-form-group">
                      <label>Rating (1-5 stars):</label>
                      <div className="my-app-star-rating">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`my-app-star ${star <= (reviewForm.rating || 0) ? 'my-app-star-filled' : ''}`}
                            onClick={() => handleStarClick(star)}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="my-app-form-group">
                      <label>Comment:</label>
                      <textarea
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        placeholder="Enter your review"
                        rows={4}
                      />
                    </div>
                    <div className="my-app-action-buttons">
                      <button type="submit" className="my-app-button my-app-success">
                        Submit Review
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReviewForm(null);
                          setFormError(null);
                        }}
                        className="my-app-button"
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