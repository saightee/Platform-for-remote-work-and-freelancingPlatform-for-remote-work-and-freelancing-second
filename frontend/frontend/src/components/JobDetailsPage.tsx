import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import '../styles/JobDetailsPage.css';

interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  status: string;
  createdBy: {
    id: string;
    username: string;
    companyName?: string;
  };
  createdAt: string;
}

const JobDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { role, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/job-posts/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setJob(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch job details');
      }
    };

    if (id) fetchJob();
  }, [id]);

  const handleApply = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (role !== 'jobseeker') {
      setError('Only jobseekers can apply for jobs.');
      return;
    }
    setIsApplying(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/job-applications`,
        { job_post_id: id },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setError(null);
      alert('Successfully applied for the job!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to apply for the job');
    } finally {
      setIsApplying(false);
    }
  };

  if (!job && !error) return <div>Loading...</div>;
  if (error) return <div className="job-details-error">{error}</div>;
  if (!job) return <div>Job not found</div>;

  return (
    <div className="job-details-page">
      <div className="job-card">
        <h3>{job.title}</h3>
        <p><strong>Company:</strong> {job.createdBy.companyName || job.createdBy.username}</p>
        <p><strong>Category:</strong> {job.category}</p>
        <p><strong>Salary:</strong> ${job.budget}/hour</p>
        <p><strong>Posted:</strong> {new Date(job.createdAt).toLocaleDateString()}</p>
        <p><strong>Description:</strong> {job.description}</p>
        <p><strong>Status:</strong> {job.status}</p>
        {role === 'jobseeker' && (
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="job-card-button"
          >
            {isApplying ? 'Applying...' : 'Apply'}
          </button>
        )}
        {role === 'employer' && job.createdBy.id === (useAuth().user?.id || '') && (
          <button
            onClick={() => navigate(`/job-posts/${id}/edit`)}
            className="job-card-button"
          >
            Edit Job
          </button>
        )}
      </div>
    </div>
  );
};

export default JobDetailsPage;