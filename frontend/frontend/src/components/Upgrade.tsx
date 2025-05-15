import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Upgrade.css';

const Upgrade: React.FC = () => {
  const { role, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'messages' | 'howItWorks' | 'payments' | 'account'>('profile');
  const [selectedPlan, setSelectedPlan] = useState<'Pro' | 'Premium' | null>(null);

  const handleUpgrade = () => {
    if (selectedPlan) {
      alert(`Upgrading to ${selectedPlan} plan... (This is a placeholder)`);
      navigate('/myaccount');
    } else {
      alert('Please select a plan to upgrade.');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in to continue.</div>;
  if (role !== 'employer') return <div>Access denied. This page is for employers only.</div>;

  return (
    <div className="upgrade-container">
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

      <main className="upgrade-content">
        <h2>Upgrade Your Plan</h2>
        <div className="plan-options">
          <label>
            <input
              type="radio"
              name="plan"
              value="Pro"
              checked={selectedPlan === 'Pro'}
              onChange={() => setSelectedPlan('Pro')}
            />
            Pro Plan
          </label>
          <label>
            <input
              type="radio"
              name="plan"
              value="Premium"
              checked={selectedPlan === 'Premium'}
              onChange={() => setSelectedPlan('Premium')}
            />
            Premium Plan
          </label>
        </div>
        <button className="action-button" onClick={handleUpgrade}>
          Upgrade Now
        </button>
      </main>

      <footer className="upgrade-footer">
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

export default Upgrade;