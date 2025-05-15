import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link, useNavigate } from 'react-router-dom';
import JobPostCard from './JobPostCard';
import '../styles/MyAccount.css';

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

interface Jobseeker {
  id: string;
  username: string;
  email: string;
  role: 'jobseeker';
  jobDescription?: string;
}

const MyAccount: React.FC = () => {
  const { user, role, isAuthenticated, isLoading, setUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'messages' | 'howItWorks' | 'payments' | 'account'>('profile');
  const [name, setName] = useState(user?.username || '');
  const [jobDescription, setJobDescription] = useState(user?.jobDescription || '');
  const [jobPosts, setJobPosts] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<Jobseeker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user && isAuthenticated) {
      setName(user.username || '');
      setJobDescription(user?.jobDescription || '');
      if (role === 'employer') {
        fetchJobPosts();
        fetchWorkers();
      }
    }
  }, [user, isAuthenticated, role]);

  const fetchJobPosts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/jobs/employer`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setJobPosts(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch job posts');
    }
  };

  const fetchWorkers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/jobseekers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setWorkers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch workers');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const profileData = {
        username: name,
        jobDescription,
      };
      const response = await axios.put(`${API_BASE_URL}/api/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Profile updated successfully!');
      setUser(response.data);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in to continue.</div>;

  return (
    <div className="myaccount-container section-myaccount">
      <header className="account-status">
        <h3>Account Status:</h3>
        <div className="status-toggle">
          <span className="status active">Active</span>
          <span className="status">Inactive</span>
        </div>
      </header>

      {role === 'jobseeker' ? (
        <>
          <nav className="jobseeker-navbar">
            <div className="navbar-brand">
              <Link to="/">Hirevolve</Link>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search for job title..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') navigate('/jobs');
                  }}
                />
              </div>
            </div>
            <div className="navbar-links">
              <div className="dropdown">
                <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
                  Account
                </button>
                <div className="dropdown-content">
                  <Link to="#" onClick={() => setActiveTab('profile')}>My Profile</Link>
                  <Link to="#" onClick={() => setActiveTab('account')}>Account Settings</Link>
                  <Link to="#" onClick={() => setActiveTab('payments')}>Payments</Link>
                  <Link to="#" onClick={() => setActiveTab('howItWorks')}>How It Works</Link>
                  <Link to="#" onClick={() => navigate('/login')}>Logout</Link>
                </div>
              </div>
              <button onClick={() => navigate('/jobs')}>
                Find a Job
              </button>
              <button className={activeTab === 'messages' ? 'active' : ''} onClick={() => setActiveTab('messages')}>
                Messages
              </button>
              <button className={activeTab === 'howItWorks' ? 'active' : ''} onClick={() => setActiveTab('howItWorks')}>
                How It Works
              </button>
              <button className={activeTab === 'payments' ? 'active' : ''} onClick={() => setActiveTab('payments')}>
                Payments
              </button>
            </div>
          </nav>

          <main className="myaccount-content">
            {activeTab === 'profile' && (
              <div className="profile-section">
                <div className="profile-header">
                  <div className="avatar">
                    <img src="/default-avatar.png" alt="Avatar" />
                    <button>Update Profile Picture</button>
                  </div>
                  <div className="profile-info">
                    <h2>{name || 'Name not specified'}</h2>
                    <p>{jobDescription || 'Job description not specified'}</p>
                    <button className="edit-button">Edit Profile</button>
                    <button className="verify-button">Verification</button>
                  </div>
                </div>
                <button className="save-button" onClick={handleProfileSubmit}>Save</button>
                {error && <p className="myaccount-error">{error}</p>}
                {success && <p className="myaccount-success">{success}</p>}
              </div>
            )}

            {activeTab === 'messages' && <div>Messages content (to be implemented)</div>}
            {activeTab === 'howItWorks' && <div>How It Works content (to be implemented)</div>}
            {activeTab === 'payments' && <div>Payments content (to be implemented)</div>}
            {activeTab === 'account' && <div>Account Settings content (to be implemented)</div>}
          </main>

          <footer className="myaccount-footer">
            <div className="footer-content">
              <p>Looking for a job?</p>
              <p>1000’s of Employers are looking to hire right now!</p>
              <button className="find-job-button" onClick={() => navigate('/jobs')}>
                Find a Job
              </button>
            </div>
          </footer>
        </>
      ) : (
        <>
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

          <main className="myaccount-content">
            {activeTab === 'profile' && (
              <div className="employer-section">
                <div className="job-posts-section">
                  <h3>Your Job Posts</h3>
                  {jobPosts.length === 0 ? (
                    <div className="empty-section">
                      <p>No job posts yet.</p>
                      <button className="action-button" onClick={() => navigate('/post-a-job')}>
                        Post a Job
                      </button>
                    </div>
                  ) : (
                    <div>
                      {jobPosts.map((job) => (
                        <JobPostCard key={job.id} id={job.id} title={job.title} status={job.status || 'open'} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="workers-section">
                  <h3>Your Workers</h3>
                  {workers.length === 0 ? (
                    <div className="empty-section">
                      <p>Your hires and prospects will appear here</p>
                      <button className="action-button" onClick={() => navigate('/browse-resumes')}>
                        Browse Resumes
                      </button>
                    </div>
                  ) : (
                    <ul>
                      {workers.map((worker) => (
                        <li key={worker.id}>
                          <Link to={`/profile/${worker.id}`}>{worker.username}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="referral-section">
                  <h3>Invite friends to OnlineJobs.ph and earn a 40% lifetime commission</h3>
                  <p>SHARE YOUR REFERRAL LINK:</p>
                  <p className="referral-link">{user?.referral_link || 'http://store.onlinejobs.ph/?aid=725085'}</p>
                  <div className="referral-links">
                    <Link to="#">AFFILIATE AREA</Link>
                    <Link to="#">LEARN MORE</Link>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'messages' && <div>Messages content (to be implemented)</div>}
            {activeTab === 'howItWorks' && <div>How It Works content (to be implemented)</div>}
            {activeTab === 'payments' && <div>Billing content (to be implemented)</div>}
            {activeTab === 'account' && <div>Account Settings content (to be implemented)</div>}
          </main>

          <footer className="myaccount-footer">
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
        </>
      )}
    </div>
  );
};

export default MyAccount;