import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Pricing.css';

const Pricing: React.FC = () => {
  const { role, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'messages' | 'howItWorks' | 'payments' | 'account'>('profile');

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in to continue.</div>;
  if (role !== 'employer') return <div>Access denied. This page is for employers only.</div>;

  return (
    <div className="pricing-container">
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

      <main className="pricing-content">
        <h2>Pricing Plans</h2>
        <div className="pricing-plans">
          <div className="plan-card">
            <h3>Free</h3>
            <p>Basic access to post jobs and browse resumes.</p>
            <ul>
              <li>Post up to 1 job</li>
              <li>Browse up to 10 resumes</li>
            </ul>
            <button className="action-button" onClick={() => navigate('/myaccount')}>
              Current Plan
            </button>
          </div>
          <div className="plan-card">
            <h3>Pro</h3>
            <p>Enhanced features for growing businesses.</p>
            <ul>
              <li>Instant Job Approval</li>
              <li>Contact Workers</li>
              <li>Hire Workers</li>
              <li>Read Worker Reviews</li>
            </ul>
            <button className="action-button" onClick={() => navigate('/upgrade')}>
              Upgrade to Pro
            </button>
          </div>
          <div className="plan-card">
            <h3>Premium</h3>
            <p>All features for maximum efficiency.</p>
            <ul>
              <li>All Pro features</li>
              <li>Background Data Checks</li>
              <li>Worker Coaching Service</li>
            </ul>
            <button className="action-button" onClick={() => navigate('/upgrade')}>
              Upgrade to Premium
            </button>
          </div>
        </div>
      </main>

      <footer className="pricing-footer">
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

export default Pricing;