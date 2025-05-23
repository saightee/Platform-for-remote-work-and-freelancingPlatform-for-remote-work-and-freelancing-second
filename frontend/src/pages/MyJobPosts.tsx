// src/pages/MyJobPosts.tsx
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getMyJobPosts, updateJobPost, closeJobPost, setJobPostApplicationLimit, getApplicationsForJobPost } from '../services/api';
import { JobPost } from '@types';
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
  const [limit, setLimit] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobPosts = async () => {
      if (!profile || profile.role !== 'employer') {
        setJobPosts([]);
        setError('This page is only available for Employers.');
        return;
      }

      try {
        const posts = await getMyJobPosts();
        setJobPosts(posts);
      } catch (err) {
        console.error('Error fetching job posts:', err);
        setError('Failed to load job posts. Please try again.');
      }
    };
    fetchJobPosts();
  }, [profile]);

  const handleUpdate = async (id: string, updatedData: Partial<JobPost>) => {
    try {
      const updatedPost = await updateJobPost(id, updatedData);
      setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
      alert('Job post updated successfully!');
    } catch (err) {
      console.error('Error updating job post:', err);
      alert('Failed to update job post.');
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
    try {
      await setJobPostApplicationLimit(id, limit);
      alert('Application limit set successfully!');
      setLimit(0);
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
      alert('Failed to fetch applications.');
    }
  };

  const formatDateInTimezone = (dateString?: string, timezone?: string): string => {
    if (!dateString) return 'Not specified';
    try {
      const date = parseISO(dateString);
      if (timezone) {
        const zonedDate = zonedTimeToUtc(date, timezone);
        return format(zonedDate, 'PPpp', { timeZone: timezone });
      }
      return format(date, 'PPpp');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

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
                <h3>{post.title}</h3>
                <p><strong>Status:</strong> {post.status}</p>
                <p><strong>Application Limit:</strong> {post.applicationLimit || 'No limit'}</p>
                <button onClick={() => handleClose(post.id)} className="action-button warning">
                  Close Job
                </button>
                <div className="form-group">
                  <label>Set Application Limit:</label>
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    min="0"
                  />
                  <button onClick={() => handleSetLimit(post.id)} className="action-button">
                    Set Limit
                  </button>
                </div>
                <button
                  onClick={() => handleViewApplications(post.id)}
                  className="action-button success"
                >
                  View Applications
                </button>
                {applications.jobPostId === post.id && applications.apps.length > 0 && (
                  <div className="applications-section">
                    <h4>Applications:</h4>
                    <ul>
                      {applications.apps.map((app, index) => (
                        <li key={index}>
                          <strong>{app.username}</strong> ({app.email}) - Applied at:{' '}
                          {formatDateInTimezone(app.appliedAt, profile.timezone)} <br />
                          <strong>Description:</strong> {app.jobDescription || 'Not provided'}
                        </li>
                      ))}
                    </ul>
                  </div>
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