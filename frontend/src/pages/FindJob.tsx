import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { searchJobPosts, getCategories, incrementJobView } from '../services/api';
import { JobPost, Category } from '@types';
import { FaEye } from 'react-icons/fa';
import { useRole } from '../context/RoleContext';

const FindJob: React.FC = () => {
  const { profile } = useRole();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<{
    title?: string;
    location?: string;
    salary_min?: number;
    salary_max?: number;
    job_type?: string;
    category_id?: string;
    required_skills?: string;
  }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories. Please try again.');
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const jobsData = await searchJobPosts(filters);
        setJobs(jobsData);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load jobs. Please try again.');
      }
    };
    fetchJobs();
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value || undefined,
    }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({
      ...prev,
      title: searchQuery || undefined,
      required_skills: requiredSkills || undefined,
    }));
  };

  const handleViewDetails = async (jobId: string) => {
    try {
      const response = await incrementJobView(jobId);
      setJobs((prevJobs) =>
        prevJobs.map((job) =>
          job.id === jobId ? { ...job, views: response.views || (job.views || 0) + 1 } : job
        )
      );
    } catch (err) {
      console.error('Error incrementing job view:', err);
    }
  };

  const truncateDescription = (description: string, maxLength: number) => {
    if (description.length > maxLength) {
      return description.substring(0, maxLength) + '...';
    }
    return description;
  };

  return (
    <div>
      <Header />
      <div className="container find-job-container">
        <h1>Find a Job</h1>
        <form onSubmit={handleSearch} className="find-job-search-bar">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by keywords..."
          />
          <button type="submit">Search</button>
        </form>

        <div className="find-job-content">
          <div className="find-job-filters">
            <h3>Filters</h3>
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={filters.location || ''}
                onChange={handleFilterChange}
                placeholder="Enter location"
              />
            </div>
            <div className="form-group">
              <label>Minimum Salary</label>
              <input
                type="number"
                name="salary_min"
                value={filters.salary_min || ''}
                onChange={handleFilterChange}
                placeholder="Enter min salary"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Maximum Salary</label>
              <input
                type="number"
                name="salary_max"
                value={filters.salary_max || ''}
                onChange={handleFilterChange}
                placeholder="Enter max salary"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Job Type</label>
              <select name="job_type" value={filters.job_type || ''} onChange={handleFilterChange}>
                <option value="">Select job type</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Temporary">Temporary</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select name="category_id" value={filters.category_id || ''} onChange={handleFilterChange}>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Required Skills (comma-separated)</label>
              <input
                type="text"
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
                placeholder="e.g., JavaScript, Python"
              />
            </div>
          </div>

          <div className="find-job-results">
            {error && <p className="error-message">{error}</p>}
            {jobs.length === 0 ? (
              <p>No jobs found.</p>
            ) : (
              <div className="job-grid">
                {jobs.map((job) => (
                  <div key={job.id} className="job-card">
                    <h3>{job.title}</h3>
                    <p><strong>Location:</strong> {job.location || 'Not specified'}</p>
                    <p>
                      <strong>Salary:</strong>{' '}
                      {job.salary
                        ? `${profile?.currency || '$'}${job.salary}`
                        : 'Not specified'}
                    </p>
                    <p><strong>Job Type:</strong> {job.job_type || 'Not specified'}</p>
                    <p>{truncateDescription(job.description, 100)}</p>
                    <div className="job-card-footer">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="view-details-button"
                        onClick={() => handleViewDetails(job.id)}
                      >
                        View Details
                      </Link>
                      <span className="view-counter">
                        <FaEye /> {job.views || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default FindJob;