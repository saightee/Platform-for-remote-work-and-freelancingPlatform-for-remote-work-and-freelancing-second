import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import '../styles/JobSearchPage.css';

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

const JobCardList: React.FC<{ jobs: Job[] }> = ({ jobs }) => {
  return (
    <div className="job-listings">
      <h2>Job Listings</h2>
      {jobs.length > 0 ? (
        <div className="job-card-column">
          {jobs.map((job) => (
            <div key={job.id} className="job-card">
              <div className="job-header">
                <h3>{job.title}</h3>
                {job.status && <span className="job-status">{job.status}</span>}
              </div>
              <p className="job-description-snippet">{job.description.substring(0, 100)}...</p>
              <div className="job-meta">
                <p><strong>Company:</strong> {job.createdBy.companyName || job.createdBy.username}</p>
                <p><strong>Category:</strong> {job.category}</p>
                <p><strong>Salary:</strong> 💰 ${job.budget}</p>
                <p><strong>Posted:</strong> {new Date(job.createdAt).toLocaleDateString()}</p>
              </div>
              <Link to={`/jobs/${job.id}`} className="view-details">
                View Details
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p>No jobs found.</p>
      )}
    </div>
  );
};

const JobTable: React.FC<{ jobs: Job[] }> = ({ jobs }) => {
  return (
    <div className="job-listings">
      <h2>Job Listings</h2>
      {jobs.length > 0 ? (
        <table className="job-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Company</th>
              <th>Category</th>
              <th>Salary</th>
              <th>Posted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{job.title}</td>
                <td>{job.createdBy.companyName || job.createdBy.username}</td>
                <td>{job.category}</td>
                <td>${job.budget}</td>
                <td>{new Date(job.createdAt).toLocaleDateString()}</td>
                <td>
                  <Link to={`/jobs/${job.id}`}>View Details</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No jobs found.</p>
      )}
    </div>
  );
};

const JobSearchPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    salary: '',
  });
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const keywords = params.get('keywords') || '';

    const fetchJobs = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/jobs`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          params: {
            title: keywords || undefined,
            category: filters.category || undefined,
          },
        });
        setJobs(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch jobs');
        setJobs([]);
      }
    };

    fetchJobs();
    setSearchTerm(keywords);
  }, [location.search, filters.category]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    const filteredJobs = jobs.filter((job) => {
      const matchesSearch = searchTerm
        ? job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.createdBy.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.description.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      const matchesCategory = filters.category
        ? job.category.toLowerCase().includes(filters.category.toLowerCase())
        : true;
      const matchesSalary = filters.salary
        ? String(job.budget).includes(filters.salary)
        : true;
      return matchesSearch && matchesCategory && matchesSalary;
    });
    setJobs(filteredJobs);
  };

  return (
    <div className="job-search-page">
      <div className="search-panel">
        <input
          type="text"
          placeholder="Search by keywords..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button onClick={applyFilters} className="search-btn">
          Search
        </button>
      </div>
      {error && <p className="job-search-error">{error}</p>}
      <div className="content-layout">
        <div className="filters">
          <h2>Filters</h2>
          <div className="filter-group">
            <label htmlFor="category">Category</label>
            <select name="category" value={filters.category} onChange={handleFilterChange}>
              <option value="">All Categories</option>
              <option value="it">IT</option>
              <option value="design">Design</option>
              <option value="marketing">Marketing</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="salary">Salary Range</label>
            <input
              type="text"
              name="salary"
              value={filters.salary}
              onChange={handleFilterChange}
              placeholder="e.g., 50000 - 100000"
            />
          </div>
          <button onClick={applyFilters}>Apply Filters</button>
        </div>
        <div className="job-content">
          <div className="view-toggle">
            <button
              className={viewMode === 'cards' ? 'active' : ''}
              onClick={() => setViewMode('cards')}
            >
              Cards
            </button>
            <button
              className={viewMode === 'table' ? 'active' : ''}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
          </div>
          {viewMode === 'cards' ? <JobCardList jobs={jobs} /> : <JobTable jobs={jobs} />}
        </div>
      </div>
    </div>
  );
};

export default JobSearchPage;