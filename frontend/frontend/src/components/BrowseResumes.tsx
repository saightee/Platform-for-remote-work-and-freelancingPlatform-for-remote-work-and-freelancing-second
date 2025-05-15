import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/BrowseResumes.css';

interface Jobseeker {
  id: string;
  username: string;
  email: string;
  role: 'jobseeker';
  jobDescription?: string;
}

const BrowseResumes: React.FC = () => {
  const { role, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [jobseekers, setJobseekers] = useState<Jobseeker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'messages' | 'howItWorks' | 'payments' | 'account'>('profile');

  useEffect(() => {
    if (isAuthenticated && role === 'employer') {
      fetchJobseekers();
    }
  }, [isAuthenticated, role]);

  const fetchJobseekers = async () => {
    try {
      // Предполагаем, что мы получаем заявки для первой вакансии работодателя (нужно реализовать выбор конкретной вакансии)
      const jobId = 'some-job-id'; // Замените на динамический ID вакансии
      const response = await axios.get(`${API_BASE_URL}/api/job-applications/job-post/${jobId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const applications = response.data;
      const uniqueJobseekers = applications.map((app: any) => ({
        id: app.job_seeker.id,
        username: app.job_seeker.username,
        email: app.job_seeker.email,
        jobDescription: app.job_seeker.jobDescription,
      }));
      setJobseekers(uniqueJobseekers);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch jobseekers');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in to continue.</div>;
  if (role !== 'employer') return <div>Access denied. This page is for employers only.</div>;

  return (
    <div className="browse-resumes-container">
      <nav className="employer-navbar">
        <div className="navbar-brand">
          <Link to="/">Hirevolve</Link>
        </div>
        <div className="navbar-links">
          <button onClick={() => navigate('/pricing')}>
            Pricing
          </button>
          <div className="dropdown">
            <button className={activeTab === 'howItWorks' ? 'active' : ''} onClick={() => setActiveTab('howItWorks')}>
              How It Works
            </button>
            <div className="dropdown-content">
              <Link to="#" onClick={() => setActiveTab('howItWorks')}>FAQ Employer</Link>
              <Link to="#" onClick={() => setActiveTab('howItWorks')}>FAQ Jobseeker</Link>
            </div>
          </div>
          <button className={activeTab === 'messages' ? 'active' : ''} onClick={() => setActiveTab('messages')}>
            Messages
          </button>
          <button onClick={() => navigate('/post-a-job')}>
            Post a Job
          </button>
          <div className="dropdown">
            <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
              Account
            </button>
            <div className="dropdown-content">
              <Link to="#" onClick={() => setActiveTab('profile')}>Employer Free</Link>
              <Link to="#" onClick={() => setActiveTab('profile')}>Need Help Hiring?</Link>
              <Link to="#" onClick={() => setActiveTab('profile')}>Job Posts</Link>
              <Link to="#" onClick={() => setActiveTab('profile')}>Referral Program</Link>
              <Link to="#" onClick={() => setActiveTab('payments')}>Billing</Link>
              <Link to="#" onClick={() => setActiveTab('profile')}>Update Plan/Features</Link>
              <Link to="#" onClick={() => setActiveTab('account')}>Account Settings</Link>
              <Link to="#" onClick={() => setActiveTab('profile')}>Upgrade</Link>
              <Link to="#" onClick={() => navigate('/login')}>Logout</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="browse-resumes-content">
        <h2>Browse Resumes</h2>
        {error && <p className="browse-resumes-error">{error}</p>}
        {jobseekers.length > 0 ? (
          <div className="jobseeker-list">
            {jobseekers.map((jobseeker) => (
              <div key={jobseeker.id} className="jobseeker-card">
                <h3>{jobseeker.username}</h3>
                <p><strong>Email:</strong> {jobseeker.email}</p>
                <p><strong>Job Description:</strong> {jobseeker.jobDescription || 'Not specified'}</p>
                <Link to={`/profile/${jobseeker.id}`} className="view-profile">
                  View Profile
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p>No jobseekers found.</p>
        )}
      </main>

      <footer className="browse-resumes-footer">
        <div className="footer-content">
          <h3>Do more as an Employer with OnlineJobs.ph.</h3>
          <p>Enjoy these perks with Employer Pro and Premium.</p>
          <ul className="perks-list">
            <li>Instant Job Approval</li>
            <li>Contact Workers</li>
            <li>Hire Workers</li>
            <li>Read Worker Reviews</li>
            <li>Background Data Checks (Premium)</li>
            <li>Worker Coaching Service (Premium)</li>
          </ul>
        </div>
      </footer>
    </div>
  );
};

export default BrowseResumes;