import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Profile.css';

interface WorkerProfile {
  id: string;
  username: string;
  email: string;
  role: 'jobseeker' | 'employer';
  jobDescription?: string;
  companyName?: string;
  companyInfo?: string;
}

const Profile: React.FC = () => {
  const { role, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'messages' | 'howItWorks' | 'payments' | 'account'>('profile');
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && role === 'employer') {
      fetchProfile();
    }
  }, [isAuthenticated, role]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setProfile(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Profile not found');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in to continue.</div>;
  if (role !== 'employer') return <div>Access denied. This page is for employers only.</div>;

  return (
    <div className="profile-container">
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

      <main className="profile-content">
        <h2>Worker Profile</h2>
        {error && <p className="profile-error">{error}</p>}
        {profile ? (
          <div className="profile-details">
            <h3>{profile.username}</h3>
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Job Description:</strong> {profile.jobDescription || 'Not specified'}</p>
            {profile.companyName && <p><strong>Company:</strong> {profile.companyName}</p>}
            {profile.companyInfo && <p><strong>Company Info:</strong> {profile.companyInfo}</p>}
            <button className="action-button" onClick={() => navigate(`/messages`)}>
              Contact Worker
            </button>
          </div>
        ) : (
          <div className="empty-section">
            <p>Profile not found.</p>
          </div>
        )}
      </main>

      <footer className="profile-footer">
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

export default Profile;