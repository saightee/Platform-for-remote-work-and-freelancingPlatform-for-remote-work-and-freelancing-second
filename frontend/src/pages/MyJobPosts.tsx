import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getMyJobPosts, updateJobPost, closeJobPost, setJobPostApplicationLimit, getApplicationsForJobPost, getCategories } from '../services/api';
import { JobPost, Category } from '@types';
import { useRole } from '../context/RoleContext';
import Copyright from '../components/Copyright';
import { format, zonedTimeToUtc } from 'date-fns-tz';
import { parseISO } from 'date-fns';

const MyJobPosts: React.FC = () => {
  const { profile } = useRole();
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [applications, setApplications] = useState<
    { jobPostId: string; apps: { userId: string; username: string; email: string; jobDescription: string; appliedAt: string }[] }
  >({ jobPostId: '', apps: [] });
  const [limit, setLimit] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingJob, setEditingJob] = useState<Partial<JobPost> | null>(null);

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
        setJobPosts(posts);
        setCategories(categoriesData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load job posts or categories. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [profile]);

  const handleUpdate = async (id: string, updatedData: Partial<JobPost>) => {
    try {
      const updatedPost = await updateJobPost(id, updatedData);
      setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
      alert('Job post updated successfully!');
    } catch (err: any) {
      console.error('Error updating job post:', err.response?.data || err);
      alert(err.response?.data?.message || 'Failed to update job post.');
    }
  };

  const handleClose = async (id: string) => {
    try {
      const updatedPost = await closeJobPost(id);
      setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
      alert('Job post closed successfully!');
    } catch (err) {
      console.error('Error closing job post:', err);
      alert('Failed to close job post.');
    }
  };

  const handleSetLimit = async (id: string) => {
    if (limit === '' || limit < 0) {
      alert('Please enter a valid application limit.');
      return;
    }
    try {
      await setJobPostApplicationLimit(id, Number(limit));
      setJobPosts(jobPosts.map((post) => (post.id === id ? { ...post, applicationLimit: Number(limit) } : post)));
      alert('Application limit set successfully!');
      setLimit('');
    } catch (err) {
      console.error('Error setting application limit:', err);
      alert('Failed to set application limit.');
    }
  };

  const handleViewApplications = async (jobPostId: string) => {
    try {
      const apps = await getApplicationsForJobPost(jobPostId);
      setApplications({ jobPostId, apps });
    } catch (err) {
      console.error('Error fetching applications:', err);
      alert('Failed to load applications.');
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
        job_type: editingJob.job_type || undefined,
        category_id: editingJob.category_id || undefined,
      });
      setEditingJob(null);
    } catch (err) {
      console.error('Error saving job edit:', err);
      alert('Failed to save changes.');
    }
  };

  const handleCancelEdit = () => {
    setEditingJob(null);
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
        <Footer />
        <Copyright />
      </div>
    );
  }

  if (!profile || profile.role !== 'employer') {
    return (
      <div>
        <Header />
        <div className="container">
          <h2>My Job Posts</h2>
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
      <div className="container my-job-posts-container">
        <h2>My Job Posts</h2>
        {error && <p className="error-message">{error}</p>}
        {jobPosts.length > 0 ? (
          <div className="job-grid">
            {jobPosts.map((post) => (
              <div key={post.id} className="job-card">
                {editingJob?.id === post.id ? (
                  <div className="edit-form">
                    <div className="form-group">
                      <label>Job Title:</label>
                      <input
                        type="text"
                        value={editingJob.title || ''}
                        onChange={(e) => editingJob && setEditingJob({ ...editingJob, title: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Description:</label>
                      <textarea
                        value={editingJob.description || ''}
                        onChange={(e) => editingJob && setEditingJob({ ...editingJob, description: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div className="form-group">
                      <label>Location:</label>
                      <input
                        type="text"
                        value={editingJob.location || ''}
                        onChange={(e) => editingJob && setEditingJob({ ...editingJob, location: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Salary:</label>
                      <input
                        type="number"
                        value={editingJob.salary || ''}
                        onChange={(e) =>
                          editingJob && setEditingJob({ ...editingJob, salary: e.target.value ? Number(e.target.value) : undefined })
                        }
                        min="0"
                      />
                    </div>
                    <div className="form-group">
                      <label>Job Type:</label>
                      <select
                        value={editingJob.job_type || ''}
                        onChange={(e) =>
                          editingJob &&
                          setEditingJob({
                            ...editingJob,
                            job_type: e.target.value === '' ? undefined : (e.target.value as 'Full-time' | 'Part-time' | 'Project-based'),
                          })
                        }
                      >
                        <option value="">Select job type</option>
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Project-based">Project-based</option>
                      </select>
                    </div>
                    <div className="form-group">
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
                    <div className="action-buttons">
                      <button onClick={() => handleSaveEdit(post.id)} className="action-button success">
                        Save Changes
                      </button>
                      <button onClick={handleCancelEdit} className="action-button">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3>{post.title}</h3>
                    <p><strong>Description:</strong> {truncateDescription(post.description, 100)}</p>
                    <p><strong>Status:</strong> {post.status}</p>
                    <p><strong>Application Limit:</strong> {post.applicationLimit || 'No limit'}</p>
                    <p><strong>Posted On:</strong> {formatDateInTimezone(post.created_at, profile.timezone)}</p>
                    <div className="action-buttons">
                      <button onClick={() => handleEditJob(post)} className="action-button">
                        Edit Job Post
                      </button>
                      <button onClick={() => handleClose(post.id)} className="action-button warning">
                        Close Job Post
                      </button>
                      <button
                        onClick={() => handleViewApplications(post.id)}
                        className="action-button success"
                      >
                        View Applications
                      </button>
                    </div>
                    <div className="form-group">
                      <label>Set Application Limit:</label>
                      <input
                        type="number"
                        value={limit}
                        onChange={(e) => setLimit(e.target.value ? Number(e.target.value) : '')}
                        min="0"
                        placeholder="Enter limit"
                      />
                      <button onClick={() => handleSetLimit(post.id)} className="action-button">
                        Set Limit
                      </button>
                    </div>
                    {applications.jobPostId === post.id && applications.apps.length > 0 && (
                      <div className="applications-section">
                        <h4>Applications:</h4>
                        <ul>
                          {applications.apps.map((app, index) => (
                            <li key={index}>
                              <strong>{app.username}</strong> ({app.email}) - Applied:{' '}
                              {formatDateInTimezone(app.appliedAt, profile.timezone)} <br />
                              <strong>Description:</strong> {app.jobDescription || 'Not specified'}
                            </li>
                          ))}
                        </ul>
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
      <Footer />
      <Copyright />
    </div>
  );
};

export default MyJobPosts;