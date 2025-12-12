import { useState, useEffect, useMemo } from 'react';


import { getMyApplications, createReview, listInvitations, acceptInvitation,
  declineInvitation } from '../services/api';
import { JobApplication } from '@types';
import { useRole } from '../context/RoleContext';

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
  const { profile, currentRole, isLoading: roleLoading } = useRole();
 const timezone =
  profile?.timezone ??
   Intl.DateTimeFormat().resolvedOptions().timeZone ??
  'UTC';
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
  const [invActionLoading, setInvActionLoading] = useState<string | null>(null); // loader на Decline/Accept (per-card)

// модалка Accept (форма подачи)
const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
const [acceptLoading, setAcceptLoading] = useState(false);
const [acceptError, setAcceptError] = useState<string | null>(null);
const [acceptForm, setAcceptForm] = useState<{
  invitationId: string;
  cover_letter: string;
  relevant_experience: string;
  full_name?: string;
  referred_by?: string;
} | null>(null);

useEffect(() => {
  const fetchData = async () => {
    if (currentRole !== 'jobseeker') {
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
  if (!roleLoading) fetchData();
}, [currentRole, roleLoading]);


// === Invitation handlers (должны быть ВНУТРИ компонента MyApplications) ===

// Отклонить приглашение -> POST /job-applications/invitations/:id/decline
const handleDeclineInvitation = async (id: string) => {
  try {
    setInvActionLoading(id);
    await declineInvitation(id);
    // убираем карточку из Invitations
    setInvitations((prev) => prev.filter((i) => i.id !== id));
  } catch (e: any) {
    setError(e?.response?.data?.message || 'Failed to decline invitation.');
  } finally {
    setInvActionLoading(null);
  }
};

// Открыть модалку Accept (форма подачи)
const openAcceptForm = (id: string) => {
  setAcceptError(null);
  setAcceptForm({
    invitationId: id,
    cover_letter: '',
    relevant_experience: '',
    full_name: profile?.username || '',
    referred_by: '',
  });
  setIsAcceptModalOpen(true);
};

// Сабмит формы Accept -> POST /job-applications/invitations/:id/accept
const submitAccept = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!acceptForm) return;

  const cover = acceptForm.cover_letter?.trim() || '';
  const exp = acceptForm.relevant_experience?.trim() || '';
  if (!cover || !exp) {
    setAcceptError('Cover letter и Relevant experience обязательны.');
    return;
  }

  try {
    setAcceptLoading(true);
    setAcceptError(null);

    await acceptInvitation(acceptForm.invitationId, {
      cover_letter: cover,
      relevant_experience: exp,
      full_name: acceptForm.full_name?.trim(),
      referred_by: acceptForm.referred_by?.trim(),
    });

    // после успеха — обновляем список заявок, убираем инвайт и переключаемся на Pending
    const updatedApps = await getMyApplications();
    setApplications(updatedApps);
    setInvitations((prev) => prev.filter((i) => i.id !== acceptForm.invitationId));

    setIsAcceptModalOpen(false);
    setAcceptForm(null);
    setTab('pending');
  } catch (err: any) {
    setAcceptError(err?.response?.data?.message || 'Failed to accept invitation.');
  } finally {
    setAcceptLoading(false);
  }
};



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
      
        <div className="ma-shell">
          <div className="ma-card">
            <h1 className="ma-title"><FaBriefcase /> My Applications</h1>
            <Loader />
          </div>
        </div>
      </div>
    );
  }

  if (!roleLoading && currentRole !== 'jobseeker') {
    return (
      <div>
     
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
                {formatDateInTimezone(inv.created_at, timezone)}
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

    <button
      type="button"
      className="ma-btn ma-secondary ma-accept"
      onClick={() => openAcceptForm(inv.id)}
      disabled={invActionLoading === inv.id}
      title="Accept invitation and apply"
    >
      Accept
    </button>

    <button
      type="button"
      className="ma-btn ma-secondary ma-decline"
      onClick={() => handleDeclineInvitation(inv.id)}
      disabled={invActionLoading === inv.id}
      title="Decline invitation"
    >
      Decline
    </button>
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
              {formatDateInTimezone(app.created_at, timezone)}
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
{/* Accept Invitation Modal */}
{/* Accept Invitation Modal (унифицированная как в Job Details) */}
{isAcceptModalOpen && acceptForm && (
  <div
    className="modal"
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        setIsAcceptModalOpen(false);
        setAcceptForm(null);
        setAcceptError(null);
      }
    }}
  >
    <div
      className="modal-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="applyTitle"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="close"
        onClick={() => { setIsAcceptModalOpen(false); setAcceptForm(null); setAcceptError(null); }}
        aria-label="Close"
      >
        ×
      </button>

      <h3 id="applyTitle">Apply</h3>

      {acceptError && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 12 }}>
          {acceptError}
        </div>
      )}

      <form
        className="apply-form"
        onSubmit={(e) => {
          e.preventDefault();
          submitAccept(e);
        }}
        noValidate
      >
        {/* Full Name (optional) */}
        <div className="apply-row">
          <label className="apply-label" htmlFor="fullName">Full Name (optional)</label>
          <input
            id="fullName"
            type="text"
            className="apply-input"
            value={acceptForm.full_name || ''}
            onChange={(e) => setAcceptForm({ ...acceptForm, full_name: e.target.value })}
            placeholder="Your full name"
          />
        </div>

        {/* Referred By (optional) */}
        <div className="apply-row">
          <label className="apply-label" htmlFor="referredBy">Referred By (optional)</label>
          <input
            id="referredBy"
            type="text"
            className="apply-input"
            value={acceptForm.referred_by || ''}
            onChange={(e) => setAcceptForm({ ...acceptForm, referred_by: e.target.value })}
            placeholder="The name/email/ref code of who recommended you"
          />
        </div>

        {/* Relevant experience (required) */}
        <div className="apply-row">
          <label className="apply-label" htmlFor="relevantExperience">
            Relevant experience *
            <span className="apply-hint" style={{ display: 'block', fontSize: 12, opacity: .8 }}>
              Describe relevant experience: companies, roles, tasks, stack, achievements.
            </span>
          </label>
          <textarea
            id="relevantExperience"
            className="apply-textarea"
            rows={6}
            value={acceptForm.relevant_experience}
            onChange={(e) => setAcceptForm({ ...acceptForm, relevant_experience: e.target.value })}
            placeholder="Describe relevant experience (companies, roles, tasks, stack, achievements…)"
            required
          />
        </div>

        {/* Cover Letter (required) */}
        <div className="apply-row">
          <label className="apply-label" htmlFor="coverLetter">
            Why are you a good fit for this role? *
          </label>
          <textarea
            id="coverLetter"
            className="apply-textarea"
            rows={6}
            value={acceptForm.cover_letter}
            onChange={(e) => setAcceptForm({ ...acceptForm, cover_letter: e.target.value })}
            placeholder="Explain why you’re a strong fit for the role…"
            required
          />
        </div>

        <p className="apply-help">
          Your resume from profile will be attached automatically.
        </p>

        <div className="apply-actions">
          <button type="submit" className="apply-btn" disabled={acceptLoading}>
            {acceptLoading ? 'Submitting…' : 'Submit Application'}
          </button>
          <button
            type="button"
            className="ma-btn"
            onClick={() => { setIsAcceptModalOpen(false); setAcceptForm(null); setAcceptError(null); }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
)}


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

    
    </div>
  );
};

export default MyApplications;
