import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/JobSearchPage.css';

interface Job {
  id: string;
  title: string;
  companyName: string;
  location: string;
  salary: string;
  employmentType: string;
  postedDate: string;
  description: string;
  hoursPerWeek: string;
  status?: string;
  views: number; // Новое поле для количества просмотров
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
                <p><strong>Company:</strong> {job.companyName}</p>
                <p><strong>Type:</strong> {job.employmentType}</p>
                <p><strong>Location:</strong> 📍 {job.location}</p>
                <p><strong>Salary:</strong> 💰 {job.salary}</p>
                <p><strong>Hours:</strong> 🕒 {job.hoursPerWeek}</p>
                <p><strong>Posted:</strong> {job.postedDate}</p>
              </div>
              <Link to={`/jobs/${job.id}`} className="view-details">
                View Details
              </Link>
              <div className="views-counter">
                👁️ {job.views}
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
                <td>{job.companyName}</td>
                <td>{job.location}</td>
                <td>{job.salary}</td>
                <td>{job.employmentType}</td>
                <td>{job.postedDate}</td>
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const keywords = params.get('keywords') || '';
    const locationFilter = params.get('location') || '';

    const fetchJobs = async () => {
      try {
        const mockJobs: Job[] = [
          {
            id: '1',
            title: 'Frontend Developer',
            companyName: 'ABC Tech',
            location: 'Remote',
            salary: '$80,000 - $120,000',
            employmentType: 'Full-Time',
            postedDate: '2025-05-01',
            description: 'We are looking for a skilled Frontend Developer to join our team remotely...',
            hoursPerWeek: '40 hrs/wk',
            status: 'New',
            views: 150,
          },
          {
            id: '2',
            title: 'Graphic Designer',
            companyName: 'XYZ Design',
            location: 'New York, NY',
            salary: '$60,000 - $90,000',
            employmentType: 'Part-Time',
            postedDate: '2025-05-02',
            description: 'Seeking a creative Graphic Designer for our New York office...',
            hoursPerWeek: '20 hrs/wk',
            status: 'Hot',
            views: 200,
          },
          {
            id: '3',
            title: 'Marketing Manager',
            companyName: 'Global Corp',
            location: 'San Francisco, CA',
            salary: '$100,000 - $150,000',
            employmentType: 'Full-Time',
            postedDate: '2025-05-03',
            description: 'Looking for an experienced Marketing Manager to lead campaigns...',
            hoursPerWeek: '40 hrs/wk',
            views: 75,
          },
          {
            id: '4',
            title: 'Virtual Assistant',
            companyName: 'Remote Solutions',
            location: 'Remote',
            salary: '$40,000 - $60,000',
            employmentType: 'Freelance',
            postedDate: '2025-05-04',
            description: 'Hiring a Virtual Assistant to support our remote operations...',
            hoursPerWeek: 'Flexible',
            status: 'New',
            views: 120,
          },
        ];
        setJobs(mockJobs);
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
        setJobs([]);
      }
    };

    fetchJobs();
    setSearchTerm(keywords);
    setFilters((prev) => ({ ...prev, location: locationFilter }));
  }, [location.search]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    const filteredJobs = jobs.filter((job) => {
      const matchesSearch = searchTerm
        ? job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.description.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      const matchesCategory = filters.category
        ? job.title.toLowerCase().includes(filters.category.toLowerCase())
        : true;
      const matchesLocation = filters.location
        ? job.location.toLowerCase().includes(filters.location.toLowerCase())
        : true;
      const matchesSalary = filters.salary
        ? job.salary.toLowerCase().includes(filters.salary.toLowerCase())
        : true;
      const matchesType = filters.employmentType
        ? job.employmentType === filters.employmentType
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