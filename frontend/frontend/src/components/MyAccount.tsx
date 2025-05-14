import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import '../styles/Login.css';

interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  status: string;
  applicants: { id: string; name: string }[];
  selectedWorker?: { id: string; name: string };
}

interface CompletedJob {
  id: string;
  title: string;
  employerId: string;
  employerName: string;
  workerId: string;
  workerName: string;
}

const MyAccount: React.FC = () => {
  const { user, role, isAuthenticated, isLoading, setUser } = useAuth(); // Добавляем setUser
  const [activeTab, setActiveTab] = useState<'profile' | 'categories' | 'jobs' | 'reviews'>('profile');
  const [name, setName] = useState(user?.username || '');
  const [skills, setSkills] = useState(user?.skills?.join(', ') || '');
  const [experience, setExperience] = useState(user?.experience || '');
  const [companyName, setCompanyName] = useState(user?.company_name || '');
  const [companyInfo, setCompanyInfo] = useState(user?.company_info || '');
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState<string>('');

  useEffect(() => {
    console.log('[MyAccount] useEffect triggered - user:', user, 'role:', role, 'isAuthenticated:', isAuthenticated, 'at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }));
    if (user && isAuthenticated) {
      setName(user.username || '');
      setSkills(user.skills?.join(', ') || '');
      setExperience(user.experience || '');
      setCompanyName(user.company_name || '');
      setCompanyInfo(user.company_info || '');
      fetchCompletedJobs();
    }
    if (role === 'employer' && isAuthenticated) {
      fetchCategories();
      fetchJobs();
    }
  }, [user, isAuthenticated, role]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories', {
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setCategories(response.data.map((cat: any) => cat.name));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch categories');
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await axios.get('/api/jobs/my', {
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setJobs(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch jobs');
    }
  };

  const fetchCompletedJobs = async () => {
    try {
      const response = await axios.get('/api/jobs/completed', {
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setCompletedJobs(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch completed jobs');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const profileData = role === 'employer'
        ? { role, company_name: companyName, company_info: companyInfo }
        : { role, skills: skills.split(',').map(s => s.trim()), experience };

      const response = await axios.put('/api/profile', profileData, {
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
      // Обновляем данные пользователя в контексте
      setUser(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await axios.post('/api/categories', { name: categoryName }, {
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setSuccess('Category created successfully!');
      setCategoryName('');
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create category');
    }
  };

  const handleSelectWorker = async (jobId: string, workerId: string) => {
    try {
      await axios.post(`/api/jobs/${jobId}/select-worker`, { workerId }, {
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setSuccess('Worker selected successfully!');
      fetchJobs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to select worker');
    }
  };

  const handleCloseJob = async (jobId: string) => {
    try {
      await axios.post(`/api/jobs/${jobId}/close`, {}, {
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setSuccess('Job closed successfully!');
      fetchJobs();
      fetchCompletedJobs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to close job');
    }
  };

  const handleReviewSubmit = async (jobId: string, reviewedUserId: string) => {
    try {
      await axios.post('/api/reviews', {
        jobId,
        reviewedUserId,
        rating,
        review,
      }, {
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setSuccess('Review submitted successfully!');
      setRating(0);
      setReview('');
      fetchCompletedJobs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit review');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please log in to continue.</div>;
  }

  if (!role) {
    return <div>Please select a role to continue. Debug: user={JSON.stringify(user)}, role={role}, isAuthenticated={isAuthenticated}</div>;
  }

  return (
    <div className="myaccount-container">
      <h2>Welcome, {user?.email || 'User'}!</h2>
      <div className="tabs">
        <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'tab-active' : ''}>Profile</button>
        {role === 'employer' && (
          <>
            <button onClick={() => setActiveTab('categories')} className={activeTab === 'categories' ? 'tab-active' : ''}>Categories</button>
            <button onClick={() => setActiveTab('jobs')} className={activeTab === 'jobs' ? 'tab-active' : ''}>My Jobs</button>
          </>
        )}
        <button onClick={() => setActiveTab('reviews')} className={activeTab === 'reviews' ? 'tab-active' : ''}>Reviews</button>
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="login-form">
          <input
            type="text"
            placeholder="Username"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="login-input"
            disabled
          />
          {role === 'jobseeker' ? (
            <>
              <input
                type="text"
                placeholder="Skills (e.g., JavaScript, React)"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="login-input"
                required
              />
              <input
                type="text"
                placeholder="Experience (e.g., 2 years as a developer)"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="login-input"
                required
              />
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="login-input"
                required
              />
              <input
                type="text"
                placeholder="Company Info"
                value={companyInfo}
                onChange={(e) => setCompanyInfo(e.target.value)}
                className="login-input"
              />
            </>
          )}
          <button type="submit" className="login-button">Save Profile</button>
          {error && <p className="login-error">{error}</p>}
          {success && <p className="login-success">{success}</p>}
        </form>
      )}

      {activeTab === 'categories' && role === 'employer' && (
        <div>
          <h3>Manage Categories</h3>
          <form onSubmit={handleCategorySubmit} className="login-form">
            <input
              type="text"
              placeholder="Category Name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="login-input"
              required
            />
            <button type="submit" className="login-button">Create Category</button>
            {error && <p className="login-error">{error}</p>}
            {success && <p className="login-success">{success}</p>}
          </form>
          <h4>Existing Categories</h4>
          <ul>
            {categories.map((category, index) => (
              <li key={index}>{category}</li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'jobs' && role === 'employer' && (
        <div>
          <h3>My Jobs</h3>
          {error && <p className="login-error">{error}</p>}
          {success && <p className="login-success">{success}</p>}
          {jobs.length === 0 ? (
            <p>No jobs posted yet.</p>
          ) : (
            <ul>
              {jobs.map((job) => (
                <li key={job.id} className="job-item">
                  <h4>{job.title}</h4>
                  <p><strong>Status:</strong> {job.status}</p>
                  <p><strong>Applicants:</strong></p>
                  {job.applicants.length === 0 ? (
                    <p>No applicants yet.</p>
                  ) : (
                    <ul>
                      {job.applicants.map((applicant) => (
                        <li key={applicant.id}>
                          {applicant.name}
                          {job.status === 'open' && (
                            <button
                              onClick={() => handleSelectWorker(job.id, applicant.id)}
                              className="job-action-button"
                              style={{ marginLeft: '1rem' }}
                            >
                              Select
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {job.status === 'open' && (
                    <button
                      onClick={() => handleCloseJob(job.id)}
                      className="job-action-button"
                    >
                      Close Job
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div>
          <h3>Completed Jobs</h3>
          {error && <p className="login-error">{error}</p>}
          {success && <p className="login-success">{success}</p>}
          {completedJobs.length === 0 ? (
            <p>No completed jobs yet.</p>
          ) : (
            <ul>
              {completedJobs.map((job) => (
                <li key={job.id} className="job-item">
                  <h4>{job.title}</h4>
                  <p><strong>{role === 'employer' ? 'Worker' : 'Employer'}:</strong> {role === 'employer' ? job.workerName : job.employerName}</p>
                  <div>
                    <label>Rating (1-5):</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      className="login-input"
                    />
                  </div>
                  <textarea
                    placeholder="Your review"
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    className="login-input"
                    style={{ minHeight: '100px', resize: 'vertical' }}
                  />
                  <button
                    onClick={() => handleReviewSubmit(job.id, role === 'employer' ? job.workerId : job.employerId)}
                    className="job-action-button"
                  >
                    Submit Review
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default MyAccount;