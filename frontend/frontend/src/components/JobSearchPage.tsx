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
    name: string;
    companyName?: string;
  };
  createdAt: string;
  views?: number; // Добавим для совместимости с текущей структурой
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
                <p><strong>Company:</strong> {job.createdBy.companyName || job.createdBy.name}</p>
                <p><strong>Type:</strong> N/A</p> {/* Поле отсутствует в бэкенде, можно добавить в будущем */}
                <p><strong>Location:</strong> 📍 Remote</p> {/* Поле отсутствует, предполагаем Remote */}
                <p><strong>Salary:</strong> 💰 ${job.budget}</p>
                <p><strong>Hours:</strong> 🕒 N/A</p> {/* Поле отсутствует */}
                <p><strong>Posted:</strong> {new Date(job.createdAt).toLocaleDateString()}</p>
              </div>
              <Link to={`/jobs/${job.id}`} className="view-details">
                View Details
              </Link>
              <div className="views-counter">
                👁️ {job.views || 0}
              </div>
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
              <th>Location</th>
              <th>Salary</th>
              <th>Type</th>
              <th>Posted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{job.title}</td>
                <td>{job.createdBy.companyName || job.createdBy.name}</td>
                <td>Remote</td> {/* Поле отсутствует */}
                <td>${job.budget}</td>
                <td>N/A</td> {/* Поле отсутствует */}
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
    location: '',
    salary: '',
    employmentType: '',
  });
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const keywords = params.get('keywords') || '';
    const locationFilter = params.get('location') || '';

    const fetchJobs = async () => {
      try {
        const response = await axios.get('/api/jobs', {
          baseURL: API_BASE_URL,
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          params: {
            title: keywords || undefined,
            category: filters.category || undefined,
            location: locationFilter || undefined,
          },
        });
        const fetchedJobs = response.data.map((job: Job) => ({
          ...job,
          views: job.views || Math.floor(Math.random() * 200), // Добавляем views для совместимости
        }));
        setJobs(fetchedJobs);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch jobs');
        setJobs([]);
      }
    };

    fetchJobs();
    setSearchTerm(keywords);
    setFilters((prev) => ({ ...prev, location: locationFilter }));
  }, [location.search, filters.category]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    const filteredJobs = jobs.filter((job) => {
      const matchesSearch = searchTerm
        ? job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.createdBy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.description.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      const matchesCategory = filters.category
        ? job.category.toLowerCase().includes(filters.category.toLowerCase())
        : true;
      const matchesLocation = filters.location
        ? true // Поле location отсутствует в бэкенде, пропускаем фильтр
        : true;
      const matchesSalary = filters.salary
        ? String(job.budget).includes(filters.salary)
        : true;
      const matchesType = filters.employmentType
        ? true // Поле employmentType отсутствует, пропускаем фильтр
        : true;
      return matchesSearch && matchesCategory && matchesLocation && matchesSalary && matchesType;
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
            <label htmlFor="location">Location</label>
            <input
              type="text"
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              placeholder="Enter location"
            />
          </div>
          <div className="filter-group">
            <label htmlFor="salary">Salary Range</label>
            <input
              type="text"
              name="salary"
              value={filters.salary}
              onChange={handleFilterChange}
              placeholder="e.g., $50,000 - $100,000"
            />
          </div>
          <div className="filter-group">
            <label htmlFor="employmentType">Job Type</label>
            <select
              name="employmentType"
              value={filters.employmentType}
              onChange={handleFilterChange}
            >
              <option value="">All Types</option>
              <option value="Remote">Remote</option>
              <option value="Full-Time">Full Time</option>
              <option value="Part-Time">Part Time</option>
              <option value="Freelance">Freelance</option>
            </select>
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