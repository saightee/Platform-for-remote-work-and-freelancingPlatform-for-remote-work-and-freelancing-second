// src/pages/MyJobPosts.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import {
  getMyJobPosts,
  updateJobPost,
  closeJobPost,
  getApplicationsForJobPost,
  getCategories,
  updateApplicationStatus,
  initializeWebSocket,
  createReview,
  searchCategories,
} from '../services/api';
import { JobPost, Category, JobApplicationDetails, SalaryType } from '@types';
import { useRole } from '../context/RoleContext';
import { format, zonedTimeToUtc } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import { Socket } from 'socket.io-client';
import { AxiosError } from 'axios';
import sanitizeHtml from 'sanitize-html';
import Loader from '../components/Loader';
import ReactQuill from 'react-quill';

// icons + styles
import {
  FaBriefcase, FaEdit, FaEye, FaCheckCircle, FaTimesCircle,
  FaFolderOpen, FaChevronDown, FaChevronUp, FaSyncAlt, FaUser,
  FaEnvelope, FaSearch, FaTimes, FaStar, FaComments
} from 'react-icons/fa';
import '../styles/my-job-posts.css';

const MyJobPosts: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { profile, isLoading: roleLoading } = useRole();
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [applications, setApplications] = useState<{
    jobPostId: string;
    apps: JobApplicationDetails[];
  }>({ jobPostId: '', apps: [] });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingJob, setEditingJob] = useState<Partial<JobPost> | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedJobPostId, setSelectedJobPostId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<{ applicationId: string; rating: number; comment: string } | null>(null);
  const [skillInput, setSkillInput] = useState('');
  const [filteredSkills, setFilteredSkills] = useState<Category[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [appDetails, setAppDetails] = useState<{
  fullName?: string | null;
  referredBy?: string | null;
  coverLetter: string;
} | null>(null);

type ConfirmState =
  | { kind: 'invite'; app: JobApplicationDetails; postId: string; note: string }
  | { kind: 'reject'; app: JobApplicationDetails; postId: string }
  | { kind: 'close'; postId: string }
  | null;

const [confirm, setConfirm] = useState<ConfirmState>(null);

  // NEW: tabs + collapsed cards
  const initialTab = (searchParams.get('tab') as 'active' | 'closed' | 'all') || 'active';
  const [tab, setTab] = useState<'active' | 'closed' | 'all'>(initialTab);
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile || profile.role !== 'employer') {
        setJobPosts([]);
        setError('This page is only available for employers.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [posts, categoriesData] = await Promise.all([getMyJobPosts(), getCategories()]);
        setJobPosts(posts || []);
        setCategories(categoriesData || []);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.message || 'Failed to load job posts or categories.');
      } finally {
        setIsLoading(false);
      }
    };
    if (!roleLoading) {
      fetchData();
    }
  }, [profile, roleLoading]);

  useEffect(() => {
    const newSocket = initializeWebSocket(
      (message) => console.log('New message:', message),
      (err) => console.error('WebSocket error:', err)
    );
    setSocket(newSocket);

    newSocket.on('chatInitialized', ({ jobApplicationId }) => {
      newSocket.emit('joinChat', { jobApplicationId });
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    const search = async () => {
      if (skillInput.trim()) {
        const res = await searchCategories(skillInput);
        const sortedFiltered = res.sort((a, b) => a.name.localeCompare(b.name));
        setFilteredSkills(sortedFiltered);
        setIsDropdownOpen(true);
      } else {
        setFilteredSkills([]);
        setIsDropdownOpen(false);
      }
    };
    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [skillInput]);

  const handleUpdate = async (id: string, updatedData: Partial<JobPost>) => {
    try {
      const updatedPost = await updateJobPost(id, updatedData);
      setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
      alert('Job post updated successfully!');
    } catch (err: any) {
      console.error('Error updating job post:', err);
      alert(err.response?.data?.message || 'Failed to update job post.');
    }
  };

  const handleClose = async (id: string) => {
    try {
      const updatedPost = await closeJobPost(id);
      setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
      alert('Job post closed successfully!');
    } catch (err: any) {
      console.error('Error closing job post:', err);
      alert(err.response?.data?.message || 'Failed to close job post.');
    }
  };

  const handleReopen = async (id: string) => {
    try {
      const updatedPost = await updateJobPost(id, { status: 'Active' });
      setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
      alert('Job post reopened successfully!');
    } catch (err: any) {
      console.error('Error reopening job post:', err);
      alert(err.response?.data?.message || 'Failed to reopen job post.');
    }
  };

  const handleViewApplications = async (jobPostId: string) => {
    try {
      if (selectedJobPostId === jobPostId) {
        setSelectedJobPostId('');
        setApplications({ jobPostId: '', apps: [] });
      } else {
        setSelectedJobPostId(jobPostId);
        const apps = await getApplicationsForJobPost(jobPostId);
        setApplications({ jobPostId, apps: apps || [] });
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error fetching applications:', axiosError);
      setError(axiosError.response?.data?.message || 'Failed to load applications.');
    }
  };

  const handleEditJob = (job: JobPost) => {
    setEditingJob({ ...job });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingJob) return;
    if (!editingJob.title || !editingJob.description) {
      alert('Job title and description are required.');
      return;
    }

    if (editingJob.salary_type !== 'negotiable') {
      if (editingJob.salary == null || editingJob.salary <= 0) {
        alert('Salary is required (>0) unless salary type is negotiable.');
        return;
      }
    }

    try {
      const payload: Partial<JobPost> = {
        title: editingJob.title,
        description: editingJob.description,
        location: editingJob.location ?? undefined,
        salary_type: (editingJob.salary_type ?? null) as SalaryType | null,
        salary:
          editingJob.salary_type === 'negotiable'
            ? null
            : typeof editingJob.salary === 'number'
            ? editingJob.salary
            : null,
        job_type: editingJob.job_type ?? null,
        category_id: editingJob.category_id || undefined,
      };

      await handleUpdate(id, payload);
      setEditingJob(null);
    } catch (err: any) {
      console.error('Error saving job edit:', err);
      alert(err.response?.data?.message || 'Failed to save changes.');
    }
  };

  const handleCancelEdit = () => {
    setEditingJob(null);
  };

  // ✅ Accept => автоматически Reject всех остальных по этой вакансии
const handleUpdateApplicationStatus = async (
  applicationId: string,
  status: 'Accepted' | 'Rejected',
  jobPostId: string
) => {
  try {
    await updateApplicationStatus(applicationId, status);

    if (status === 'Accepted') {
      alert('Application accepted.');
      if (socket) socket.emit('joinChat', { jobApplicationId: applicationId });
    } else {
      alert('Application rejected.');
    }

    const updatedApps = await getApplicationsForJobPost(jobPostId);
    setApplications({ jobPostId, apps: updatedApps || [] });
  } catch (error: unknown) {
    const err = error as AxiosError<{ message?: string }>;
    console.error(`Error updating application ${applicationId} to ${status}:`, err);
    const errorMsg = err.response?.data?.message || `Failed to ${status.toLowerCase()} application.`;
    alert(errorMsg);
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
      const updatedApps = await getApplicationsForJobPost(applications.jobPostId);
      setApplications({ jobPostId: applications.jobPostId, apps: updatedApps || [] });
      setReviewForm(null);
      alert('Review submitted successfully!');
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Failed to submit review.');
    }
  };

  const formatDateInTimezone = (dateString?: string, timezone?: string): string => {
    if (!dateString) return 'Not specified';
    try {
      const date = parseISO(dateString);
      if (timezone) {
        const zonedDate = zonedTimeToUtc(date, timezone);
        return format(zonedDate, 'PP', { timeZone: timezone });
      }
      return format(date, 'PP');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // --- NEW: sorting, filtering, tabs ---
  const activeCount = jobPosts.filter(p => p.status === 'Active').length;
  const closedCount = jobPosts.filter(p => p.status === 'Closed').length;

  const sorted = [...jobPosts].sort(
    (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
  );

  const filteredPosts = sorted.filter(p => {
    if (tab === 'active') return p.status === 'Active';
    if (tab === 'closed') return p.status === 'Closed';
    return true;
  });

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="mjp-shell">
          <div className="mjp-card">
            <h1 className="mjp-title"><FaBriefcase /> My Job Posts</h1>
            <Loader />
          </div>
        </div>
      </div>
    );
  }

  if (roleLoading || !profile || profile.role !== 'employer') {
    return (
      <div>
        <Header />
        <div className="mjp-shell">
          <div className="mjp-card">
            <h1 className="mjp-title"><FaBriefcase /> My Job Posts</h1>
            <p className="mjp-subtitle">This page is only available for employers.</p>
          </div>
        </div>
        <Footer />
        <Copyright />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="mjp-shell">
        <div className="mjp-header">
          <h1 className="mjp-title"><FaBriefcase /> My Job Posts</h1>
          <p className="mjp-subtitle">Manage your listings, review applicants, and keep posts up to date.</p>
        </div>

        {/* NEW: Tabs */}
        <div className="mjp-tabs">
          <button
            className={`mjp-tab ${tab === 'active' ? 'is-active' : ''}`}
            onClick={() => setSearchParams({ tab: 'active' })}
          >
            Active ({activeCount})
          </button>
          <button
            className={`mjp-tab ${tab === 'closed' ? 'is-active' : ''}`}
            onClick={() => setSearchParams({ tab: 'closed' })}
          >
            Closed ({closedCount})
          </button>
          <button
            className={`mjp-tab ${tab === 'all' ? 'is-active' : ''}`}
            onClick={() => setSearchParams({ tab: 'all' })}
          >
            All ({jobPosts.length})
          </button>
        </div>

        {error && <div className="mjp-alert mjp-err">{error}</div>}

        {filteredPosts.length > 0 ? (
          <div className="mjp-grid">
            {filteredPosts.map((post) => {
              const closedAt = (post as any).closed_at as string | undefined;

              // функции для отображения заявок
              const rawApps =
                applications.jobPostId === post.id ? applications.apps : [];
              // const hasAccepted = rawApps.some(a => a.status === 'Accepted');
              const visibleApps =
  post.status === 'Closed'
    ? rawApps.filter(a => a.status === 'Accepted')
    : rawApps;

              return (
                <div key={post.id} className="mjp-card">
                  {editingJob?.id === post.id ? (
                    <div className="mjp-edit">
                      {/* ... (редактор вакансии без изменений) ... */}
                      <div className="mjp-row">
                        <label className="mjp-label"><FaEdit /> Job Title</label>
                        <input
                          className="mjp-input"
                          type="text"
                          value={editingJob.title || ''}
                          onChange={(e) => editingJob && setEditingJob({ ...editingJob, title: e.target.value })}
                        />
                      </div>

                      <div className="mjp-row">
                        <label className="mjp-label"><FaEdit /> Description</label>
                        <div className="mjp-quill-wrap">
                          <ReactQuill
                            value={editingJob.description || ''}
                            onChange={(value) => editingJob && setEditingJob({ ...editingJob, description: value })}
                            placeholder="Enter job description"
                          />
                        </div>
                      </div>

                      <div className="mjp-row">
                        <label className="mjp-label"><FaFolderOpen /> Work Mode</label>
                        <select
                          className="mjp-select"
                          value={editingJob.location || ''}
                          onChange={(e) => editingJob && setEditingJob({ ...editingJob, location: e.target.value })}
                        >
                          <option value="">Work mode</option>
                          <option value="Remote">Remote</option>
                          <option value="On-site">On-site</option>
                          <option value="Hybrid">Hybrid</option>
                        </select>
                      </div>

                      <div className="mjp-row">
                        <label className="mjp-label"><FaFolderOpen /> Salary</label>
                        <div className="mjp-salary">
                          <input
                            className="mjp-input"
                            type="number"
                            value={editingJob?.salary_type === 'negotiable' ? '' : editingJob?.salary ?? ''}
                            onChange={(e) =>
                              editingJob &&
                              setEditingJob({
                                ...editingJob,
                                salary: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            min={0}
                            placeholder={editingJob?.salary_type === 'negotiable' ? 'Negotiable' : 'Enter salary'}
                            disabled={editingJob?.salary_type === 'negotiable'}
                          />
                          <select
                            className="mjp-select"
                            value={editingJob?.salary_type ?? 'per hour'}
                            onChange={(e) => {
                              if (!editingJob) return;
                              const st = e.target.value as SalaryType;
                              setEditingJob({
                                ...editingJob,
                                salary_type: st,
                                salary: st === 'negotiable' ? null : editingJob.salary ?? null,
                              });
                            }}
                          >
                            <option value="per hour">per hour</option>
                            <option value="per month">per month</option>
                            <option value="negotiable">negotiable</option>
                          </select>
                        </div>
                      </div>

                      <div className="mjp-row">
                        <label className="mjp-label"><FaFolderOpen /> Job Type</label>
                        <select
                          className="mjp-select"
                          value={editingJob.job_type || ''}
                          onChange={(e) => {
                            const value = e.target.value as 'Full-time' | 'Part-time' | 'Project-based' | '';
                            editingJob &&
                              setEditingJob({
                                ...editingJob,
                                job_type: value === '' ? null : value,
                              });
                          }}
                        >
                          <option value="">Select job type</option>
                          <option value="Full-time">Full-time</option>
                          <option value="Part-time">Part-time</option>
                          <option value="Project-based">Project-based</option>
                        </select>
                      </div>

                      <div className="mjp-row">
                        <label className="mjp-label"><FaSearch /> Category</label>
                        <div className="mjp-auto">
                          <FaSearch className="mjp-auto-icon" />
                          <input
                            className="mjp-input mjp-auto-input"
                            type="text"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            placeholder="Type to search categories..."
                            onFocus={() => setIsDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                          />
                          {isDropdownOpen && (
                            <ul className="mjp-dropdown">
                              {(skillInput.trim() ? filteredSkills : categories).map((category) => (
                                <React.Fragment key={category.id}>
                                  <li
                                    className="mjp-item"
                                    onMouseDown={() => {
                                      setEditingJob({ ...editingJob!, category_id: category.id });
                                      setSkillInput(category.name);
                                      setIsDropdownOpen(false);
                                    }}
                                  >
                                    {category.name}
                                  </li>
                                  {category.subcategories?.map((sub) => (
                                    <li
                                      key={sub.id}
                                      className="mjp-item mjp-sub"
                                      onMouseDown={() => {
                                        setEditingJob({ ...editingJob!, category_id: sub.id });
                                        setSkillInput(`${category.name} > ${sub.name}`);
                                        setIsDropdownOpen(false);
                                      }}
                                    >
                                      {`${category.name} > ${sub.name}`}
                                    </li>
                                  ))}
                                </React.Fragment>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      <div className="mjp-actions-row">
                        <button onClick={() => handleSaveEdit(post.id)} className="mjp-btn mjp-success">
                          <FaCheckCircle /> Save Changes
                        </button>
                        <button onClick={handleCancelEdit} className="mjp-btn">
                          <FaTimesCircle /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mjp-card-head">
                        <h3 className="mjp-card-title">{post.title}</h3>
                        <span className={`mjp-status ${post.status === 'Active' ? 'active' : post.status === 'Closed' ? 'closed' : ''}`}>
                          {post.status}
                        </span>
                      </div>

                      {/* NEW: posted/closed dates */}
                      <div className="mjp-meta">
                        <span>Posted: {formatDateInTimezone(post.created_at)}</span>
                        {closedAt && <span>Closed: {formatDateInTimezone(closedAt)}</span>}
                      </div>

                      <div className="mjp-actions mjp-actions--top">
                        {/* NEW: go to Messages page for this job */}
                        <button
                          className="mjp-btn mjp-primary"
                          onClick={() => navigate('/employer-dashboard/messages', { state: { jobPostId: post.id } })}
                        >
                          <FaComments /> Start chat with applicants
                        </button>

                        <button
                          onClick={() => setOpenCards(o => ({ ...o, [post.id]: !o[post.id] }))}
                          className="mjp-btn"
                        >
                          {openCards[post.id] ? <><FaChevronUp /> Collapse</> : <><FaChevronDown /> Expand</>}
                        </button>

                       {post.status === 'Active' ? (
  <button onClick={() => setConfirm({ kind: 'close', postId: post.id })} className="mjp-btn mjp-warning">
    <FaTimesCircle /> Close
  </button>
                        ) : (
                          post.status !== 'Closed' && (
                            <button onClick={() => handleReopen(post.id)} className="mjp-btn mjp-success">
                              <FaSyncAlt /> Reopen
                            </button>
                          )
                        )}

                        {post.status !== 'Closed' && (
                          <button onClick={() => handleEditJob(post)} className="mjp-btn">
                            <FaEdit /> Edit
                          </button>
                        )}
                      </div>

                      {openCards[post.id] && (
                        <>
                          <div
                            className="mjp-desc"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.description) }}
                          />

                          <div className="mjp-actions">
                            <button onClick={() => handleViewApplications(post.id)} className="mjp-btn mjp-primary">
                              {applications.jobPostId === post.id ? <FaChevronUp /> : <FaChevronDown />} Applications
                            </button>
                          </div>
                        </>
                      )}

                      {applications.jobPostId === post.id && visibleApps.length > 0 && (
                        <div className="mjp-apps">
                          <h4 className="mjp-section-title"><FaFolderOpen /> Applications</h4>
                          <div className="mjp-table-wrap">
                            <table className="mjp-table">
                          <thead>
  <tr>
    <th className="col-user"><FaUser /> Username</th>
    <th className="col-email"><FaEnvelope /> Email</th>
    <th className="col-exp">Experience</th>
    <th className="col-applied">Applied On</th>
    <th className="col-status">Status</th>
    <th className="col-actions">Actions</th>
  </tr>
</thead>
                              <tbody>
                                {visibleApps.map((app) => (
                                  <tr key={app.applicationId}>
                                    <td className="col-user" data-label="Username">{app.username}</td>
      <td className="col-email" data-label="Email">{app.email}</td>
      <td className="col-exp" data-label="Experience">{app.jobDescription || 'Not provided'}</td>
      <td className="col-applied" data-label="Applied On">{formatDateInTimezone(app.appliedAt)}</td>
      <td className="col-status" data-label="Status">{app.status}</td>
      <td className="col-actions mjp-table-actions" data-label="Actions">

                                      {app.status === 'Pending' && (
  <>
    <button
      onClick={() => setConfirm({ kind: 'invite', app, postId: post.id, note: '' })}
      className="mjp-btn mjp-success mjp-sm"
      title="Move this candidate to the next interview stage"
    >
      <FaCheckCircle /> Invite to interview
    </button>

    <button
      onClick={() => setConfirm({ kind: 'reject', app, postId: post.id })}
      className="mjp-btn mjp-danger mjp-sm"
      title="Reject this applicant"
    >
      <FaTimesCircle /> Reject
    </button>
  </>
)}

                                     <button
  onClick={() => {
    const d = (app as any).details || {};
    setAppDetails({
      fullName: d.fullName ?? (app as any).fullName ?? null,
      referredBy: d.referredBy ?? (app as any).referredBy ?? null,
      coverLetter: (d.coverLetter ?? app.coverLetter) || 'No cover letter',
    });
  }}
  className="mjp-btn mjp-sm"
>
  <FaEye /> View Details
</button>

                                      <Link to={`/public-profile/${app.userId}`}>
                                        <button className="mjp-btn mjp-sm"><FaEye /> Profile</button>
                                      </Link>

                                      {/* NEW: перейти в чат по этой заявке */}
                                      <button
                                        className="mjp-btn mjp-sm"
                                        onClick={() => navigate('/employer-dashboard/messages', {
                                          state: { jobPostId: post.id, applicationId: app.applicationId }
                                        })}
                                      >
                                        <FaComments /> Chat
                                      </button>

                                      {/* ✅ Review только для Accepted */}
                                      {app.status === 'Accepted' && (
                                        <button
                                          className="mjp-btn mjp-sm"
                                          onClick={() =>
                                            setReviewForm({ applicationId: app.applicationId, rating: 5, comment: '' })
                                          }
                                        >
                                          <FaStar /> Review
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mjp-card">
            <p className="mjp-subtitle">No job posts found.</p>
          </div>
        )}
      </div>

{appDetails && (
  <div className="mjp-modal" onClick={() => setAppDetails(null)}>
    <div className="mjp-modal-content" onClick={(e) => e.stopPropagation()}>
      <button className="mjp-modal-close" onClick={() => setAppDetails(null)} aria-label="Close">
        <FaTimes />
      </button>
      <h4 className="mjp-modal-title"><FaEnvelope /> Application Details</h4>

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


      {/* Modal: Review (без изменений визуально) */}
      {reviewForm && (
        <div className="mjp-modal" onClick={() => setReviewForm(null)}>
          <div className="mjp-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="mjp-modal-close" onClick={() => setReviewForm(null)} aria-label="Close">
              <FaTimes />
            </button>
            <h4 className="mjp-modal-title"><FaStar /> Leave a Review</h4>
            <form onSubmit={handleCreateReview} className="mjp-form" noValidate>
              {formError && <div className="mjp-alert mjp-err">{formError}</div>}

              <div className="mjp-row">
                <label className="mjp-label">Rating</label>
                <div className="mjp-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`mjp-star ${star <= reviewForm.rating ? 'filled' : ''}`}
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
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

      {confirm && (
  <div className="mjp-modal" onClick={() => setConfirm(null)}>
    <div className="mjp-modal-content" onClick={(e) => e.stopPropagation()}>
      <button className="mjp-modal-close" onClick={() => setConfirm(null)} aria-label="Close">
        <FaTimes />
      </button>

      {confirm.kind === 'invite' && (
        <>
          <h4 className="mjp-modal-title"><FaCheckCircle /> Invite to Interview</h4>
          <p className="mjp-subtitle">
            Are you sure you want to move <strong>{confirm.app.username}</strong> to the next interview stage?
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
                try {
                  await updateApplicationStatus(confirm.app.applicationId, 'Accepted');
                  // опционально отправим заметку в чат
                  if (confirm.note.trim() && socket) {
                    socket.emit('sendMessage', {
                      jobApplicationId: confirm.app.applicationId,
                      content: `You are invited to the interview. ${confirm.note.trim()}`,
                    });
                  }
                  // перезагрузим список заявок
                  const updated = await getApplicationsForJobPost(confirm.postId);
                  setApplications({ jobPostId: confirm.postId, apps: updated || [] });
                } catch (err: any) {
                  alert(err?.response?.data?.message || 'Failed to invite.');
                } finally {
                  setConfirm(null);
                }
              }}
            >
              Invite to interview
            </button>
            <button className="mjp-btn" onClick={() => setConfirm(null)}>Cancel</button>
          </div>
        </>
      )}

      {confirm.kind === 'reject' && (
        <>
          <h4 className="mjp-modal-title"><FaTimesCircle /> Reject applicant</h4>
          <p className="mjp-subtitle">
            Are you sure you want to reject <strong>{confirm.app.username}</strong>? This will remove the chat.
          </p>
          <div className="mjp-actions-row">
            <button
              className="mjp-btn mjp-danger"
              onClick={async () => {
                try {
                  await updateApplicationStatus(confirm.app.applicationId, 'Rejected');
                  const updated = await getApplicationsForJobPost(confirm.postId);
                  setApplications({ jobPostId: confirm.postId, apps: updated || [] });
                } catch (err: any) {
                  alert(err?.response?.data?.message || 'Failed to reject.');
                } finally {
                  setConfirm(null);
                }
              }}
            >
              Reject
            </button>
            <button className="mjp-btn" onClick={() => setConfirm(null)}>Cancel</button>
          </div>
        </>
      )}

      {confirm.kind === 'close' && (
        <>
          <h4 className="mjp-modal-title"><FaTimesCircle /> Close job</h4>
          <p className="mjp-subtitle">
            Are you sure you want to close this job post? Applicants will no longer be able to message you.
          </p>
          <div className="mjp-actions-row">
            <button
              className="mjp-btn mjp-warning"
              onClick={async () => {
                try {
                  const updatedPost = await closeJobPost(confirm.postId);
                  setJobPosts((prev) => prev.map((p) => (p.id === confirm.postId ? updatedPost : p)));
                } catch (err: any) {
                  alert(err?.response?.data?.message || 'Failed to close job post.');
                } finally {
                  setConfirm(null);
                }
              }}
            >
              Close job
            </button>
            <button className="mjp-btn" onClick={() => setConfirm(null)}>Cancel</button>
          </div>
        </>
      )}
    </div>
  </div>
)}

      <Footer />
      <Copyright />
    </div>
  );
};

export default MyJobPosts;
