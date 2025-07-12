import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { getMyJobPosts, updateJobPost, closeJobPost, getApplicationsForJobPost, getCategories, updateApplicationStatus, notifyCandidates, initializeWebSocket } from '../services/api';
import { JobPost, Category, JobApplicationDetails } from '@types';
import { useRole } from '../context/RoleContext';
import { format, zonedTimeToUtc } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import { Socket } from 'socket.io-client';
import { AxiosError } from 'axios'; // Import AxiosError
import sanitizeHtml from 'sanitize-html'; // Import sanitize-html (install via npm if needed)

const MyJobPosts: React.FC = () => {
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
  const [selectedJobPostId, setSelectedJobPostId] = useState<string>(''); // Add state for selectedJobPostId

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
      (error) => console.error('WebSocket error:', error)
    );
    setSocket(newSocket);

    newSocket.on('chatInitialized', ({ jobApplicationId, jobSeekerId, employerId }) => {
      console.log('Chat initialized:', { jobApplicationId, jobSeekerId, employerId });
      newSocket.emit('joinChat', { jobApplicationId });
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

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
    try {
      await handleUpdate(id, {
        title: editingJob.title,
        description: editingJob.description,
        location: editingJob.location,
        salary: editingJob.salary,
        job_type: editingJob.job_type || null,
        category_id: editingJob.category_id || undefined,
      });
      setEditingJob(null);
    } catch (err: any) {
      console.error('Error saving job edit:', err);
      alert(err.response?.data?.message || 'Failed to save changes.');
    }
  };

  const handleCancelEdit = () => {
    setEditingJob(null);
  };

  const handleUpdateApplicationStatus = async (applicationId: string, status: 'Accepted' | 'Rejected', jobPostId: string) => {
    try {
      console.log(`Updating application ${applicationId} to status ${status} for job post ${jobPostId}`);
      const updatedApplication = await updateApplicationStatus(applicationId, status);
      console.log('Application updated:', updatedApplication);
      const updatedApps = await getApplicationsForJobPost(jobPostId);
      setApplications({ jobPostId, apps: updatedApps || [] });
      if (status === 'Accepted') {
        alert('Application accepted successfully! Chat initialized.');
        if (socket) {
          socket.emit('joinChat', { jobApplicationId: applicationId });
        }
      } else {
        alert('Application rejected successfully.');
      }
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      console.error(`Error updating application ${applicationId} to ${status}:`, err);
      const errorMsg = err.response?.data?.message || `Failed to ${status.toLowerCase()} application.`;
      alert(errorMsg);
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

  const truncateDescription = (description: string, maxLength: number) => {
    if (description.length > maxLength) {
      return description.substring(0, maxLength) + '...';
    }
    return description;
  };

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="container">
          <h2>My Job Posts</h2>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (roleLoading || !profile || profile.role !== 'employer') {
    return (
      <div>
        <Header />
        <div className="container">
          <h2>My Job Posts</h2>
          <p>This page is only available for employers.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="container my-job-posts-container">
        <h2>My Job Posts</h2>
        {error && <p className="error-message">{error}</p>}
        {jobPosts.length > 0 ? (
          <div className="my-job-grid">
            {jobPosts.map((post) => (
              <div key={post.id} className="my-job-card">
                {editingJob?.id === post.id ? (
                  <div className="my-job-edit-form">
                    <div className="my-job-form-group">
                      <label>Job Title:</label>
                      <input
                        type="text"
                        value={editingJob.title || ''}
                        onChange={(e) => editingJob && setEditingJob({ ...editingJob, title: e.target.value })}
                      />
                    </div>
                    <div className="my-job-form-group">
                      <label>Description:</label>
                      <textarea
                        value={editingJob.description || ''}
                        onChange={(e) => editingJob && setEditingJob({ ...editingJob, description: e.target.value })}
                        rows={6}
                        placeholder="Enter job description"
                      />
                    </div>
                    <div className="my-job-form-group">
                      <label>Location:</label>
                      <input
                        type="text"
                        value={editingJob.location || ''}
                        onChange={(e) => editingJob && setEditingJob({ ...editingJob, location: e.target.value })}
                      />
                    </div>
                    <div className="my-job-form-group">
                      <label>Salary:</label>
                      <input
                        type="number"
                        value={editingJob.salary !== null ? editingJob.salary : ''}
                        onChange={(e) =>
                          editingJob && setEditingJob({ ...editingJob, salary: e.target.value ? Number(e.target.value) : null })
                        }
                        min="0"
                      />
                    </div>
                    <div className="my-job-form-group">
                      <label>Job Type:</label>
                      <select
                        value={editingJob.job_type || ''}
                        onChange={(e) => {
                          const value = e.target.value as 'Full-time' | 'Part-time' | 'Project-based' | '';
                          editingJob && setEditingJob({
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
                    <div className="my-job-form-group">
                      <label>Category:</label>
                      <select
                        value={editingJob.category_id || ''}
                        onChange={(e) => editingJob && setEditingJob({ ...editingJob, category_id: e.target.value || undefined })}
                      >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="my-job-action-buttons">
                      <button onClick={() => handleSaveEdit(post.id)} className="my-job-action-button my-job-success">
                        Save Changes
                      </button>
                      <button onClick={handleCancelEdit} className="my-job-action-button">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3>{post.title}</h3>
                    <p><strong>Description:</strong> <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.description) }} /></p>
                    <p><strong>Status:</strong> {post.status}</p>
                   
                    <div className="my-job-action-buttons">
                      <button onClick={() => handleEditJob(post)} className="my-job-action-button">
                        Edit Job Post
                      </button>
                      {post.status === 'Active' ? (
                        <button onClick={() => handleClose(post.id)} className="my-job-action-button my-job-warning">
                          Close Job Post
                        </button>
                      ) : (
                        <button onClick={() => handleReopen(post.id)} className="my-job-action-button my-job-success">
                          Reopen Job Post
                        </button>
                      )}
                      <button
                        onClick={() => handleViewApplications(post.id)}
                        className="my-job-action-button my-job-success"
                      >
                        View Applications
                      </button>
                    </div>
                    {applications.jobPostId === post.id && applications.apps.length > 0 && (
                      <div className="my-job-application-details-section">
                        <h4>Applications:</h4>
                        <table className="my-job-application-table">
                          <thead>
                            <tr>
                              <th>Username</th>
                              <th>Email</th>
                              <th>Description</th>
                              <th>Applied On</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {applications.apps.map((app) => (
                              <tr key={app.applicationId}>
                                <td>{app.username}</td>
                                <td>{app.email}</td>
                                <td>{app.jobDescription || 'Not provided'}</td>
                                <td>{formatDateInTimezone(app.appliedAt)}</td>
                                <td>{app.status}</td>
                                <td>
                                  <button
                                    onClick={() => handleUpdateApplicationStatus(app.applicationId, 'Accepted', post.id)}
                                    className="my-job-action-button my-job-success"
                                    disabled={app.status !== 'Pending'}
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleUpdateApplicationStatus(app.applicationId, 'Rejected', post.id)}
                                    className="my-job-action-button my-job-danger"
                                    disabled={app.status !== 'Pending'}
                                  >
                                    Reject
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>No job posts found.</p>
        )}
      </div>
    </div>
  );
};

export default MyJobPosts;