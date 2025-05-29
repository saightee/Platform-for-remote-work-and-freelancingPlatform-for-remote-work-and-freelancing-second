import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { searchJobPosts, getCategories } from '../services/api';
import { JobPost, Category } from '@types';
import { formatDateInTimezone } from '../utils/dateUtils';
import { FaEye, FaUserCircle } from 'react-icons/fa';

const FindJob: React.FC = () => {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchParams, setSearchParams] = useState<{
    title: string;
    location: string;
    salary_min?: number;
    salary_max?: number;
    job_type: string;
    category_id: string;
    required_skills: string;
    page: number;
    limit: number;
  }>({
    title: '',
    location: '',
    salary_min: undefined,
    salary_max: undefined,
    job_type: '',
    category_id: '',
    required_skills: '',
    page: 1,
    limit: 10,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [jobsData, categoriesData] = await Promise.all([
          searchJobPosts(searchParams),
          getCategories(),
        ]);
        setJobs(jobsData);
        setCategories(categoriesData);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load jobs. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => ({ ...prev, page: newPage }));
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <Header />
      <div className="container find-job-container">
        <h2>Find Jobs</h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by job title or company"
            value={searchParams.title}
            onChange={(e) => setSearchParams({ ...searchParams, title: e.target.value })}
          />
          <button onClick={handleSearch}>Search</button>
        </div>
        <div className="find-job-content">
          <div className="find-job-filters">
            <h3>Filters</h3>
            <form onSubmit={handleSearch} className="search-form">
              <div className="form-group">
                <label>Title:</label>
                <input
                  type="text"
                  value={searchParams.title}
                  onChange={(e) => setSearchParams({ ...searchParams, title: e.target.value })}
                  placeholder="Enter job title"
                />
              </div>
              <div className="form-group">
                <label>Location:</label>
                <input
                  type="text"
                  value={searchParams.location}
                  onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                  placeholder="Enter location"
                />
              </div>
              <div className="form-group">
                <label>Minimum Salary:</label>
                <input
                  type="number"
                  value={searchParams.salary_min || ''}
                  onChange={(e) =>
                    setSearchParams({
                      ...searchParams,
                      salary_min: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="Enter minimum salary"
                />
              </div>
              <div className="form-group">
                <label>Maximum Salary:</label>
                <input
                  type="number"
                  value={searchParams.salary_max || ''}
                  onChange={(e) =>
                    setSearchParams({
                      ...searchParams,
                      salary_max: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="Enter maximum salary"
                />
              </div>
              <div className="form-group">
                <label>Job Type:</label>
                <select
                  value={searchParams.job_type}
                  onChange={(e) => setSearchParams({ ...searchParams, job_type: e.target.value })}
                >
                  <option value="">All Types</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Project-based">Project-based</option>
                </select>
              </div>
              <div className="form-group">
                <label>Category:</label>
                <select
                  value={searchParams.category_id}
                  onChange={(e) => setSearchParams({ ...searchParams, category_id: e.target.value })}
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Skills (comma-separated):</label>
                <input
                  type="text"
                  value={searchParams.required_skills}
                  onChange={(e) => setSearchParams({ ...searchParams, required_skills: e.target.value })}
                  placeholder="e.g., JavaScript, Python"
                />
              </div>
              <button type="submit" className="action-button">
                Apply Filters
              </button>
            </form>
          </div>
          <div className="find-job-results">
            <div className="job-grid">
              {jobs.length > 0 ? (
                jobs.map((job) => (
                  <div key={job.id} className="job-card">
                    <div className="job-card-avatar">
                      {job.employer?.avatar ? (
                        <img src={`https://jobforge.net/backend${job.employer.avatar}`} alt="Employer Avatar" />
                      ) : (
                        <FaUserCircle className="profile-avatar-icon" />
                      )}
                    </div>
                    <div className="job-card-content">
                      <div className="job-title-row">
                        <h3>{job.title}</h3>
                        <span className="job-type">{job.job_type || 'Not specified'}</span>
                        <span className="view-counter">
                          <FaEye /> {job.views || 0}
                        </span>
                      </div>
                      <p>
                        <strong>Employer:</strong> {job.employer?.username || 'Unknown'} |{' '}
                        <strong>Posted on:</strong> {formatDateInTimezone(job.created_at)}
                      </p>
                      <p><strong>Salary:</strong> {job.salary ? `$${job.salary}` : 'Not specified'}</p>
                      <p><strong>Description:</strong> {truncateDescription(job.description, 150)}</p>
                      <p><strong>Location:</strong> {job.location || 'Not specified'}</p>
                      <p><strong>Category:</strong> {job.category?.name || 'Not specified'}</p>
                      <div className="job-card-footer">
                        <button
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          className="view-details-button"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p>No jobs found.</p>
              )}
            </div>
            <div className="pagination">
              <button
                onClick={() => handlePageChange(searchParams.page - 1)}
                disabled={searchParams.page === 1}
                className="action-button"
              >
                Previous
              </button>
              <span>Page {searchParams.page}</span>
              <button
                onClick={() => handlePageChange(searchParams.page + 1)}
                disabled={jobs.length < searchParams.limit}
                className="action-button"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

const truncateDescription = (description: string, maxLength: number) => {
  if (description.length > maxLength) {
    return description.substring(0, maxLength) + '...';
  }
  return description;
};

export default FindJob;