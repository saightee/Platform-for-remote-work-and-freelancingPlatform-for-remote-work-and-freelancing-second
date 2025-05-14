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
  createdBy: string;
}

const JobDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const auth = useAuth();
  const { role, user } = auth;
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) {
        setError('Job ID is missing');
        return;
      }

      try {
        const response = await axios.get(`/api/jobs/${id}`, {
          baseURL: API_BASE_URL,
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setJob(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch job');
      }
    };
    fetchJob();
  }, [id]);

  const handleApply = async () => {
    if (role !== 'jobseeker') {
      setError('Only job seekers can apply for jobs.');
      return;
    }

    if (!id) {
      setError('Job ID is missing');
      return;
    }

    try {
      await axios.post(`/api/jobs/${id}/apply`, {}, {
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setSuccess('Application submitted successfully!');
      setTimeout(() => navigate('/jobs'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to apply for job');
    }
  };

  if (!job) {
    return <div>{error || 'Loading...'}</div>;
  }

  return (
    <div className="job-details-container">
      <h2>{job.title}</h2>
      <p><strong>Category:</strong> {job.category}</p>
      <p><strong>Budget:</strong> ${job.budget}</p>
      <p><strong>Description:</strong> {job.description}</p>
      <p><strong>Status:</strong> {job.status}</p>
      {user && user.username && <p><strong>User:</strong> {user.username}</p>} {/* Изменяем name на username */}
      {error && <p className="job-details-error">{error}</p>}
      {success && <p className="job-details-success">{success}</p>}
      {role === 'jobseeker' && job.status === 'open' && (
        <button onClick={handleApply} className="job-details-button">Apply for Job</button>
      )}
    </div>
  );
};

export default JobDetailsPage;