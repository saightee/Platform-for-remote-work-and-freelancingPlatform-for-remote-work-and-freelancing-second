import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getMyJobPosts, updateJobPost, closeJobPost, setJobPostApplicationLimit, getApplicationsForJobPost } from '../services/api';
import { JobPost } from '@types';
import { useRole } from '../context/RoleContext';
import Copyright from '../components/Copyright';

const MyJobPosts: React.FC = () => {
  const { profile } = useRole();
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [applications, setApplications] = useState<
    { jobPostId: string; apps: { userId: string; username: string; email: string; jobDescription: string; appliedAt: string }[] }
  >({ jobPostId: '', apps: [] });
  const [limit, setLimit] = useState<number>(0);

  useEffect(() => {
    const fetchJobPosts = async () => {
      if (profile?.role !== 'employer') {
        setJobPosts([]);
        return;
      }

      try {
        const posts = await getMyJobPosts();
        setJobPosts(posts);
      } catch (error) {
        console.error('Error fetching job posts:', error);
      }
    };
    fetchJobPosts();
  }, [profile]);

  const handleUpdate = async (id: string, updatedData: Partial<JobPost>) => {
    try {
      const updatedPost = await updateJobPost(id, updatedData);
      setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
      alert('Job post updated successfully!');
    } catch (error) {
      console.error('Error updating job post:', error);
      alert('Failed to update job post.');
    }
  };

  const handleClose = async (id: string) => {
    try {
      const updatedPost = await closeJobPost(id);
      setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
      alert('Job post closed successfully!');
    } catch (error) {
      console.error('Error closing job post:', error);
      alert('Failed to close job post.');
    }
  };

  const handleSetLimit = async (id: string) => {
    try {
      await setJobPostApplicationLimit(id, limit);
      alert('Application limit set successfully!');
      setLimit(0);
    } catch (error) {
      console.error('Error setting application limit:', error);
      alert('Failed to set application limit.');
    }
  };

  const handleViewApplications = async (jobPostId: string) => {
    try {
      const apps = await getApplicationsForJobPost(jobPostId);
      setApplications({ jobPostId, apps });
    } catch (error) {
      console.error('Error fetching applications:', error);
      alert('Failed to fetch applications.');
    }
  };

  if (profile?.role !== 'employer') {
    return (
      <div>
        <Header />
        <div className="container">
          <h2>My Job Posts</h2>
          <p>This page is only available for Employers.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="container">
        <h2>My Job Posts</h2>
        {jobPosts.length > 0 ? (
          jobPosts.map((post) => (
            <div key={post.id} className="job-card">
              <h3>{post.title}</h3>
              <p>Status: {post.status}</p>
              <p>Applications: {post.applicationLimit || 'No limit'}</p>
              <button onClick={() => handleClose(post.id)}>Close Job</button>
              <div className="form-group">
                <label>Set Application Limit:</label>
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                />
                <button onClick={() => handleSetLimit(post.id)}>Set Limit</button>
              </div>
              <button onClick={() => handleViewApplications(post.id)}>
                View Applications
              </button>
              {applications.jobPostId === post.id && applications.apps.length > 0 && (
                <div>
                  <h4>Applications:</h4>
                  <ul>
                    {applications.apps.map((app, index) => (
                      <li key={index}>
                        {app.username} ({app.email}) - Applied at: {app.appliedAt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
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