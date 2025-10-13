import { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getMyApplications, createReview, listInvitations } from '../services/api';
import { JobApplication } from '@types';
import { useRole } from '../context/RoleContext';
import Copyright from '../components/Copyright';
import { formatDateInTimezone } from '../utils/dateUtils';
import Loader from '../components/Loader';
import { Link } from 'react-router-dom';
import {
  FaBriefcase,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaStar,
  FaInbox,
} from 'react-icons/fa';
import '../styles/my-applications.css';

type TabKey = 'all' | 'pending' | 'accepted' | 'rejected' | 'invitations';


const MyApplications: React.FC = () => {
  const { profile } = useRole();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [invitations, setInvitations] = useState<Array<{
  id: string;
  status: 'Pending' | 'Accepted' | 'Declined';
  message?: string | null;
  created_at: string;
  job_post: {
    id: string;
    title: string;
    slug?: string | null;
    slug_id?: string | null;
    employer?: { id: string; username: string } | null;
  };
}>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<{ applicationId: string; rating: number; comment: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [leftReviews, setLeftReviews] = useState<{ [appId: string]: { rating: number; comment: string } }>({});
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // NEW: текущий таб
  const [tab, setTab] = useState<TabKey>('all');

useEffect(() => {
  const fetchData = async () => {
    if (!profile || profile.role !== 'jobseeker') {
      setError('This page is only available for jobseekers.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const [appsRes, invsRes] = await Promise.allSettled([
      getMyApplications(),
      listInvitations(),
    ]);

    setApplications(appsRes.status === 'fulfilled' ? appsRes.value : []);
    setInvitations(invsRes.status === 'fulfilled' ? invsRes.value : []);

    // Если оба запроса отвалились — покажем ошибку; иначе — работаем молча
    if (appsRes.status === 'rejected' && invsRes.status === 'rejected') {
      const err: any = (appsRes as any).reason || (invsRes as any).reason;
      setError(err?.response?.data?.message || 'Failed to load applications. Please try again.');
    }
    setIsLoading(false);
  };
  fetchData();
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

  const badge = (status?: string) => {
    if (status === 'Accepted') return <span className="ma-badge ma-accepted"><FaCheckCircle /> Accepted</span>;
    if (status === 'Rejected') return <span className="ma-badge ma-rejected"><FaTimesCircle /> Rejected</span>;
    return <span className="ma-badge ma-pending"><FaClock /> Pending</span>;
  };

  // Есть ли у заявки закрытый джоб-пост
  const isJobClosed = (app: JobApplication) => {
    const jp = (app as any).job_post as {
      status?: string;
      is_closed?: boolean;
      closed?: boolean;
      isActive?: boolean;
    } | undefined;

    if (!jp) return false;
    if (jp.is_closed === true || jp.closed === true) return true;
    if (jp.isActive === false) return true;

    const s = (jp.status || '').toString().toLowerCase();
    return s.includes('closed') || s.includes('archiv') || s.includes('inactive');
  };

const counts = useMemo(() => {
  const pending = applications.filter(a => a.status === 'Pending').length;
  const accepted = applications.filter(a => a.status === 'Accepted').length;
  const rejected = applications.filter(a => a.status === 'Rejected').length;
  const all = applications.length;
  const invitationsCount = invitations.length;
  return { all, pending, accepted, rejected, invitations: invitationsCount };
}, [applications, invitations]);


const filteredApps = useMemo(() => {
  switch (tab) {
    case 'pending':
      return applications.filter(a => a.status === 'Pending');
    case 'accepted':
      return applications.filter(a => a.status === 'Accepted');
    case 'rejected':
      return applications.filter(a => a.status === 'Rejected');
    default:
      return applications;
  }
}, [tab, applications]);


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

  return (
    <div>
      <Header />
      <div className="ma-shell">
        <div className="ma-card">
          <h1 className="ma-title"><FaBriefcase /> My Applications</h1>
          <p className="ma-sub">Track your applications and see their current status.</p>

          {error && <div className="ma-alert ma-err">{error}</div>}

        
<div className="ma-tabs">
  <button className={`ma-tab ${tab === 'all' ? 'is-active' : ''}`} onClick={() => setTab('all')}>
    All ({counts.all})
  </button>
  <button className={`ma-tab ${tab === 'pending' ? 'is-active' : ''}`} onClick={() => setTab('pending')}>
    Pending ({counts.pending})
  </button>
  <button className={`ma-tab ${tab === 'accepted' ? 'is-active' : ''}`} onClick={() => setTab('accepted')}>
    Accepted ({counts.accepted})
  </button>
  <button className={`ma-tab ${tab === 'rejected' ? 'is-active' : ''}`} onClick={() => setTab('rejected')}>
    Rejected ({counts.rejected})
  </button>
  <button className={`ma-tab ${tab === 'invitations' ? 'is-active' : ''}`} onClick={() => setTab('invitations')}>
    Invitations ({counts.invitations})
  </button>
</div>


{tab === 'invitations' ? (
  invitations.length > 0 ? (
    <div className="ma-grid">
      {invitations.map((inv) => (
        <div key={inv.id} className="ma-item">
          <div className="ma-item-head">
            <h3 className="ma-item-title">
              {inv.job_post?.title || 'Invitation'}
            </h3>
            <span
              className={`ma-badge ${
                inv.status === 'Accepted'
                  ? 'ma-accepted'
                  : inv.status === 'Declined'
                  ? 'ma-rejected'
                  : 'ma-pending'
              }`}
            >
              {inv.status}
            </span>
          </div>

          <div className="ma-rows">
            <div className="ma-row">
              <span className="ma-key">From</span>
              <span className="ma-val">
                {inv.job_post?.employer?.username || 'Employer'}
              </span>
            </div>

            <div className="ma-row">
              <span className="ma-key">Message</span>
              <span className="ma-val">{inv.message || '—'}</span>
            </div>

            <div className="ma-row">
              <span className="ma-key">Date</span>
              <span className="ma-val">
                {formatDateInTimezone(inv.created_at, profile.timezone)}
              </span>
            </div>
          </div>

          {inv.job_post?.id && (
            <div className="ma-actions-row">
              <Link
                className="ma-btn ma-secondary"
                to={`/vacancy/${inv.job_post.slug_id || inv.job_post.id}`}
              >
                View Job Post
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  ) : (
    <div className="ma-empty">
      <FaInbox className="ma-empty-ico" />
      <div className="ma-empty-title">No invitations</div>
      <div className="ma-empty-sub">Employers can invite you to apply here.</div>
    </div>
  )
) : filteredApps.length > 0 ? (
  <div className="ma-grid">
    {filteredApps.map((app) => (
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

        {app.job_post?.id && (
          <div className="ma-actions-row">
            <Link
              className="ma-btn ma-secondary"
              to={`/vacancy/${(app.job_post as any).slug_id || app.job_post!.id}`}
            >
              View Job Post
            </Link>

            {(() => {
              const alreadyReviewed =
                (app.reviews && app.reviews.length > 0) ||
                !!leftReviews[app.id];

              if (alreadyReviewed) {
                return (
                  <button
                    type="button"
                    className="ma-btn"
                    disabled
                    title="You have already left a review for this application"
                  >
                    Review submitted
                  </button>
                );
              }

              return (
                <button
                  type="button"
                  className="ma-btn ma-secondary"
                  onClick={() => {
                    setFormError(null);
                    setReviewForm({ applicationId: app.id, rating: 5, comment: '' });
                    setIsReviewModalOpen(true);
                  }}
                >
                  Leave Review
                </button>
              );
            })()}
          </div>
        )}

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
            {isJobClosed(app)
              ? 'This job post was closed, so your application can no longer be considered.'
              : 'Unfortunately, your application was rejected.'}
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

      {/* Review Modal (оставил твою логику) */}
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
