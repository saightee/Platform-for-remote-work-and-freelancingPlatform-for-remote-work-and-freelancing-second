// src/pages/EmployerOverview.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useRole } from '../context/RoleContext';
import {
  getMyJobPosts,
  getApplicationsForJobPost,
  initializeWebSocket,
  updateApplicationStatus,
  createReview,
} from '../services/api';
import { JobPost, JobApplicationDetails } from '@types';
import { Socket } from 'socket.io-client';

// FA icons
import {
  FaPlayCircle, FaStopCircle, FaInbox,
  FaPlus, FaListUl, FaComments, FaUserCog,
  FaCheckCircle, FaHourglassHalf, FaTimesCircle,
  FaEye, FaStar
} from 'react-icons/fa';

// стили «Other options» из My Job Posts
import '../styles/my-job-posts.css';

const EmployerOverview: React.FC = () => {
  const { profile } = useRole();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<JobPost[]>([]);
  const [apps, setApps] = useState<JobApplicationDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // dropdown "Other options"
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  // socket для отправки сообщений при инвайте
  const [socket, setSocket] = useState<Socket | null>(null);

  // модалки
  type ConfirmState =
    | { kind: 'invite'; app: JobApplicationDetails; note: string }
    | { kind: 'reject'; app: JobApplicationDetails }
    | null;
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const [appDetails, setAppDetails] = useState<{
    fullName?: string | null;
    referredBy?: string | null;
    coverLetter: string;
  } | null>(null);

  const [reviewForm, setReviewForm] = useState<{ applicationId: string; rating: number; comment: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // общий рефетч
  const fetchAll = async () => {
    const myPosts = await getMyJobPosts();
    setPosts(myPosts || []);
    const arrays = await Promise.all((myPosts || []).map(p => getApplicationsForJobPost(p.id)));
    setApps(arrays.flat() || []);
  };

  useEffect(() => {
    const run = async () => {
      try {
        await fetchAll();
      } finally {
        setLoading(false);
      }
    };
    if (profile?.role === 'employer') run();
  }, [profile]);

useEffect(() => {
  const s = initializeWebSocket(
    () => {},
    (err) => console.error('WebSocket error:', err)
  );

  setSocket(s);

  // важно: cleanup должен вернуть void, а не Socket
  return () => {
    s.disconnect(); // ← теперь возвращаем void
  };
}, []);

  // закрытие меню по клику вне/скроллу/resize
  useEffect(() => {
    const onDocDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('.mjp-menu') || t.closest('.mjp-more')) return;
      setOpenMenuId(null);
      setMenuPos(null);
    };
    const onScroll = () => { setOpenMenuId(null); setMenuPos(null); };
    const onResize = () => { setOpenMenuId(null); setMenuPos(null); };

    document.addEventListener('pointerdown', onDocDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onDocDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const activeCount = useMemo(() => posts.filter(p => p.status === 'Active').length, [posts]);
  const closedCount = useMemo(() => posts.filter(p => p.status === 'Closed').length, [posts]);
  const totalApps   = useMemo(() => apps.length, [apps]);

  const timeFromApplied = (a: JobApplicationDetails) => {
    const t = Date.parse(a.appliedAt || '');
    return Number.isNaN(t) ? 0 : t;
  };

  const recentApps = useMemo(() => {
    const arr = [...apps].sort((a, b) => timeFromApplied(b) - timeFromApplied(a));
    return arr.slice(0, 6);
  }, [apps]);

  const findTitle = (job_post_id?: string) =>
    posts.find(p => p.id === job_post_id)?.title || '—';

  const statusIcon = (status?: 'Pending' | 'Accepted' | 'Rejected') => {
    switch (status) {
      case 'Accepted': return <FaCheckCircle aria-hidden className="edb-badge__ico" />;
      case 'Rejected': return <FaTimesCircle aria-hidden className="edb-badge__ico" />;
      default:         return <FaHourglassHalf aria-hidden className="edb-badge__ico" />;
    }
  };

  if (loading) {
    return (
      <div className="edb-overview">
        <div className="edb-kpis">
          <div className="edb-skel" /><div className="edb-skel" /><div className="edb-skel" />
        </div>
      </div>
    );
  }

  return (
    <div className="edb-overview">
      <h1 className="edb-title">Overview</h1>

      {/* KPI */}
      <div className="edb-kpis">
        <Link to="/employer-dashboard/my-job-posts?tab=active" className="edb-kpi edb-kpi--clickable">
          <div className="edb-kpi__label">
            <FaPlayCircle aria-hidden className="edb-kpi__ico" />
            Active posts
          </div>
          <div className="edb-kpi__value">{activeCount}</div>
        </Link>

        <Link to="/employer-dashboard/my-job-posts?tab=closed" className="edb-kpi edb-kpi--clickable">
          <div className="edb-kpi__label">
            <FaStopCircle aria-hidden className="edb-kpi__ico" />
            Closed posts
          </div>
          <div className="edb-kpi__value">{closedCount}</div>
        </Link>

        <Link to="/employer-dashboard/my-job-posts?tab=all" className="edb-kpi edb-kpi--clickable">
          <div className="edb-kpi__label">
            <FaInbox aria-hidden className="edb-kpi__ico" />
            Total applications
          </div>
          <div className="edb-kpi__value">{totalApps}</div>
        </Link>
      </div>

      {/* Panels */}
      <div className="edb-panels">
        <div className="edb-panel">
          <div className="edb-panel__head">
            <h3>Quick actions</h3>
          </div>
          <div className="edb-actions">
            <Link to="/employer-dashboard/post-job" className="edb-action">
              <FaPlus aria-hidden className="edb-action__ico" />
              <span>Post a Job</span>
            </Link>
            <Link to="/employer-dashboard/my-job-posts" className="edb-action">
              <FaListUl aria-hidden className="edb-action__ico" />
              <span>My Job Posts</span>
            </Link>
            <Link to="/employer-dashboard/messages" className="edb-action">
              <FaComments aria-hidden className="edb-action__ico" />
              <span>Messages</span>
            </Link>
            <Link to="/employer-dashboard/profile" className="edb-action">
              <FaUserCog aria-hidden className="edb-action__ico" />
              <span>Profile</span>
            </Link>
          </div>
        </div>

        <div className="edb-panel">
          <div className="edb-panel__head">
            <h3>Recent applications</h3>
            {/* <Link to="/employer-dashboard/my-job-posts?tab=all" className="edb-link">View all</Link> */}
          </div>

          {recentApps.length ? (
            <div className="edb-table">
              <div className="edb-thead">
                <div>Applicant</div>
                <div>Job</div>
                <div>Status</div>
                <div>Applied</div>
                <div>Actions</div>
              </div>

              <div className="edb-tbody">
                {recentApps.map(a => (
                  <div key={a.applicationId} className="edb-row">
                    <div className="edb-row__head">
                      <div>{a.username || '—'}</div>
                      <div>{findTitle(a.job_post_id)}</div>
                      <div>
                        <span className={`edb-badge edb-badge--${(a.status || 'Pending').toLowerCase()}`}>
                          {statusIcon(a.status)}
                          <span className="edb-badge__text">{a.status}</span>
                        </span>
                      </div>
                      <div>{a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : '—'}</div>

                      {/* НОВЫЙ СТОЛБЕЦ: кнопка + меню */}
                      <div>
                        <div className="mjp-more">
                          <button
                            className="mjp-btn mjp-sm"
                            onClick={(e) => {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const MENU_W = 240;
                              const left = Math.max(8, Math.min(rect.right - MENU_W, window.innerWidth - MENU_W - 8));
                              const top = rect.bottom + 6;
                              setMenuPos({ top, left });
                              setOpenMenuId(openMenuId === a.applicationId ? null : a.applicationId);
                            }}
                          >
                            Other options
                          </button>
                        </div>

                        {/* Портал меню */}
                        {openMenuId === a.applicationId && menuPos && createPortal(
                          <div
                            className="mjp-menu"
                            role="menu"
                            style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, minWidth: 240, zIndex: 4000, right: 'auto' }}
                          >
                            {(a.status === 'Pending' || !a.status) && (
                              <>
                                <button
                                  className="mjp-menu-item"
                                  onClick={() => { setConfirm({ kind: 'invite', app: a, note: '' }); setOpenMenuId(null); setMenuPos(null); }}
                                >
                                  <FaCheckCircle /> Invite to interview
                                </button>
                                <button
                                  className="mjp-menu-item"
                                  onClick={() => { setConfirm({ kind: 'reject', app: a }); setOpenMenuId(null); setMenuPos(null); }}
                                >
                                  <FaTimesCircle /> Reject
                                </button>
                              </>
                            )}

                            <button
                              className="mjp-menu-item"
                              onClick={() => {
                                const d = (a as any).details || {};
                                setAppDetails({
                                  fullName: d.fullName ?? (a as any).fullName ?? null,
                                  referredBy: d.referredBy ?? (a as any).referredBy ?? null,
                                  coverLetter: (d.coverLetter ?? (a as any).coverLetter) || 'No cover letter',
                                });
                                setOpenMenuId(null); setMenuPos(null);
                              }}
                            >
                              <FaEye /> View details
                            </button>

                            {(a as any).userId && (
                              <Link
                                to={`/public-profile/${(a as any).userId}`}
                                onClick={() => { setOpenMenuId(null); setMenuPos(null); }}
                                className="mjp-menu-item"
                                style={{ textDecoration: 'none' }}
                              >
                                <FaEye /> Profile
                              </Link>
                            )}

                            <button
                              className="mjp-menu-item"
                              onClick={() => {
                                navigate('/employer-dashboard/messages', {
                                  state: { jobPostId: a.job_post_id, applicationId: a.applicationId }
                                });
                                setOpenMenuId(null); setMenuPos(null);
                              }}
                            >
                              <FaComments /> Chat
                            </button>

                            {a.status === 'Accepted' && (
                              <button
                                className="mjp-menu-item"
                                onClick={() => { setReviewForm({ applicationId: a.applicationId, rating: 5, comment: '' }); setOpenMenuId(null); setMenuPos(null); }}
                              >
                                <FaStar /> Leave a review
                              </button>
                            )}
                          </div>,
                          document.body
                        )}
                      </div>
                      {/* КОНЕЦ нового столбца */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="edb-empty">No applications yet.</div>
          )}
        </div>
      </div>

      {/* ===== Modals ===== */}

      {/* Details modal */}
      {appDetails && (
        <div className="mjp-modal" onClick={() => setAppDetails(null)}>
          <div className="mjp-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="mjp-modal-close" onClick={() => setAppDetails(null)} aria-label="Close">×</button>
            <h4 className="mjp-modal-title"><FaEye /> Application Details</h4>

            {appDetails.fullName ? (
              <div className="mjp-modal-row">
                <strong>Full Name:</strong> <span>{appDetails.fullName}</span>
              </div>
            ) : null}

            {appDetails.referredBy ? (
              <div className="mjp-modal-row">
                <strong>Referred By:</strong> <span>{appDetails.referredBy}</span>
              </div>
            ) : null}

            <div className="mjp-modal-row">
              <strong>Cover Letter:</strong>
              <p className="mjp-modal-body" style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>
                {appDetails.coverLetter}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewForm && (
        <div className="mjp-modal" onClick={() => setReviewForm(null)}>
          <div className="mjp-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="mjp-modal-close" onClick={() => setReviewForm(null)} aria-label="Close">×</button>
            <h4 className="mjp-modal-title"><FaStar /> Leave a Review</h4>
            <form
              onSubmit={async (e) => {
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
                  await fetchAll();
                  setReviewForm(null);
                  alert('Review submitted successfully!');
                } catch (err: any) {
                  setFormError(err?.response?.data?.message || 'Failed to submit review.');
                }
              }}
              className="mjp-form"
              noValidate
            >
              {formError && <div className="mjp-alert mjp-err">{formError}</div>}

              <div className="mjp-row">
                <label className="mjp-label">Rating</label>
                <div className="mjp-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`mjp-star ${star <= (reviewForm?.rating ?? 0) ? 'filled' : ''}`}
                      onClick={() => setReviewForm((rf) => (rf ? { ...rf, rating: star } : rf))}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              <div className="mjp-row">
                <label className="mjp-label">Comment</label>
                <textarea
                  className="mjp-textarea"
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="mjp-actions-row">
                <button type="submit" className="mjp-btn mjp-success">
                  <FaCheckCircle /> Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm modal (invite / reject) */}
      {confirm && (
        <div className="mjp-modal" onClick={() => setConfirm(null)}>
          <div className="mjp-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="mjp-modal-close" onClick={() => setConfirm(null)} aria-label="Close">×</button>

            {confirm.kind === 'invite' && (
              <>
                <h4 className="mjp-modal-title"><FaCheckCircle /> Invite to Interview</h4>
                <p className="mjp-subtitle">
                  Move <strong>{confirm.app.username}</strong> to the next interview stage?
                </p>

                <div className="mjp-row">
                  <label className="mjp-label">Optional note to the candidate</label>
                  <textarea
                    className="mjp-textarea"
                    rows={4}
                    placeholder="This note will be sent in chat together with the invite (optional)"
                    value={confirm.note}
                    onChange={(e) =>
                      setConfirm((c) => (c && c.kind === 'invite' ? { ...c, note: e.target.value } : c))
                    }
                  />
                </div>

                <div className="mjp-actions-row">
                  <button
                    className="mjp-btn mjp-success"
                    onClick={async () => {
                      if (actionSubmitting || confirm.kind !== 'invite') return;
                      try {
                        setActionSubmitting(true);
                        await updateApplicationStatus(confirm.app.applicationId, 'Accepted');
                        const note = (confirm.note || '').trim();
                        if (note && socket) {
                          socket.emit('sendMessage', {
                            jobApplicationId: confirm.app.applicationId,
                            content: `You are invited to the interview. ${note}`,
                          });
                        }
                        await fetchAll();
                      } catch (err: any) {
                        alert(err?.response?.data?.message || 'Failed to invite.');
                      } finally {
                        setActionSubmitting(false);
                        setConfirm(null);
                      }
                    }}
                    disabled={actionSubmitting}
                    aria-busy={actionSubmitting}
                  >
                    {actionSubmitting ? 'Inviting…' : 'Invite to interview'}
                  </button>
                  <button className="mjp-btn" onClick={() => setConfirm(null)}>Cancel</button>
                </div>
              </>
            )}

            {confirm.kind === 'reject' && (
              <>
                <h4 className="mjp-modal-title"><FaTimesCircle /> Reject applicant</h4>
                <p className="mjp-subtitle">
                  Reject <strong>{confirm.app.username}</strong>? This will remove the chat.
                </p>
                <div className="mjp-actions-row">
                  <button
                    className="mjp-btn mjp-danger"
                    onClick={async () => {
                      if (actionSubmitting || confirm.kind !== 'reject') return;
                      try {
                        setActionSubmitting(true);
                        await updateApplicationStatus(confirm.app.applicationId, 'Rejected');
                        await fetchAll();
                      } catch (err: any) {
                        alert(err?.response?.data?.message || 'Failed to reject.');
                      } finally {
                        setActionSubmitting(false);
                        setConfirm(null);
                      }
                    }}
                    disabled={actionSubmitting}
                    aria-busy={actionSubmitting}
                  >
                    Reject
                  </button>
                  <button className="mjp-btn" onClick={() => setConfirm(null)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerOverview;
