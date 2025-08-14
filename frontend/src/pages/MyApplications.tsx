import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getMyApplications, createReview } from '../services/api';
import { JobApplication } from '@types';
import { useRole } from '../context/RoleContext';
import Copyright from '../components/Copyright';
import { formatDateInTimezone } from '../utils/dateUtils';
import Loader from '../components/Loader';
import {
  FaBriefcase,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaStar,
  FaInbox,
} from 'react-icons/fa';
import '../styles/my-applications.css';

const MyApplications: React.FC = () => {
  const { profile } = useRole();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<{ applicationId: string; rating: number; comment: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [leftReviews, setLeftReviews] = useState<{ [appId: string]: { rating: number; comment: string } }>({});
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

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
      setLeftReviews({ ...leftReviews, [reviewForm.applicationId]: { rating: reviewForm.rating, comment: reviewForm.comment } });
      const updatedApps = await getMyApplications();
      setApplications(updatedApps);
      setReviewForm(null);
      setIsReviewModalOpen(false);
      alert('Review submitted successfully!');
    } catch (error: any) {
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
        <div className="ma-shell">
          <div className="ma-card">
            <h1 className="ma-title"><FaBriefcase /> My Applications</h1>
            <Loader />
          </div>
        </div>
      </div>
    );
  }

  if (!profile || profile.role !== 'jobseeker') {
    return (
      <div>
        <Header />
        <div className="ma-shell">
          <div className="ma-card">
            <h1 className="ma-title"><FaBriefcase /> My Applications</h1>
            <p className="ma-alert ma-err">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const badge = (status?: string) => {
    if (status === 'Accepted') return <span className="ma-badge ma-accepted"><FaCheckCircle /> Accepted</span>;
    if (status === 'Rejected') return <span className="ma-badge ma-rejected"><FaTimesCircle /> Rejected</span>;
    return <span className="ma-badge ma-pending"><FaClock /> Pending</span>;
  };

  return (
    <div>
      <Header />
      <div className="ma-shell">
        <div className="ma-card">
          <h1 className="ma-title"><FaBriefcase /> My Applications</h1>
          <p className="ma-sub">Track your applications and see their current status.</p>

          {error && <div className="ma-alert ma-err">{error}</div>}

          {applications.length > 0 ? (
            <div className="ma-grid">
              {applications.map((app) => (
                <div key={app.id} className="ma-item">
                  <div className="ma-item-head">
                    <h3 className="ma-item-title">{app.job_post?.title || 'Unknown Job'}</h3>
                    {badge(app.status)}
                  </div>

                  <div className="ma-rows">
                    <div className="ma-row">
                      <span className="ma-key"><FaClock /> Applied</span>
                      <span className="ma-val">
                        {formatDateInTimezone(app.created_at, profile.timezone)}
                      </span>
                    </div>

                    <div className="ma-row">
                      <span className="ma-key"><FaBriefcase /> Status</span>
                      <span className="ma-val">{app.status}</span>
                    </div>
                  </div>

                  {app.status === 'Accepted' && (
                    <div className="ma-note ma-ok">
                      <strong>Congratulations!</strong> Your application has been accepted.
                      {app.reviews && app.reviews.length > 0 ? (
                        <div className="ma-left-review">
                          <div className="ma-left-title">Your Review</div>
                          <div className="ma-stars">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <FaStar key={i} className={i < (app.reviews![0].rating || 0) ? 'ma-star filled' : 'ma-star'} />
                            ))}
                          </div>
                          <div className="ma-left-text">{app.reviews[0].comment}</div>
                          <div className="ma-left-foot">You have already left a review for this application.</div>
                        </div>
                      ) : (
                        <div className="ma-left-foot">Leave your review directly in the chat with the employer.</div>
                      )}
                    </div>
                  )}

                  {app.status === 'Rejected' && (
                    <div className="ma-note ma-warn">
                      Unfortunately, your application was rejected.
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="ma-empty">
              <FaInbox className="ma-empty-ico" />
              <div className="ma-empty-title">No applications found</div>
              <div className="ma-empty-sub">Apply to jobs to see them listed here.</div>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal (оставил логику как в исходнике, только классы) */}
      {isReviewModalOpen && reviewForm && (
        <div
          className="ma-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsReviewModalOpen(false);
              setReviewForm(null);
            }
          }}
        >
          <div className="ma-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="ma-modal-close" onClick={() => { setIsReviewModalOpen(false); setReviewForm(null); }}>×</button>
            <form onSubmit={handleCreateReview} className="ma-review-form">
              {formError && <p className="ma-alert ma-err">{formError}</p>}

              <div className="ma-form-group">
                <label className="ma-label">Rating (1–5)</label>
                <div className="ma-star-select">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      className={`ma-star-btn ${star <= (reviewForm.rating || 0) ? 'filled' : ''}`}
                      onClick={() => handleStarClick(star)}
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    >
                      <FaStar />
                    </button>
                  ))}
                </div>
              </div>

              <div className="ma-form-group">
                <label className="ma-label">Comment</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Share your experience…"
                  rows={4}
                  className="ma-textarea"
                />
              </div>

              <div className="ma-actions">
                <button type="submit" className="ma-btn ma-success">Submit Review</button>
                <button
                  type="button"
                  onClick={() => { setReviewForm(null); setFormError(null); setIsReviewModalOpen(false); }}
                  className="ma-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
      <Copyright />
    </div>
  );
};

export default MyApplications;
