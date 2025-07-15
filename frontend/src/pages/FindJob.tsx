import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import JobCard from '../components/JobCard';
import { JobPost, Category, PaginatedResponse } from '@types';
import { FaFilter } from 'react-icons/fa';
import { searchJobPosts, getCategories, checkJobApplicationStatus } from '../services/api';
import { useRole } from '../context/RoleContext';

const FindJob: React.FC = () => {
  const { profile } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
const [searchInput, setSearchInput] = useState(searchParams.get('title') || '');
const [jobs, setJobs] = useState<JobPost[]>([]);
const [categories, setCategories] = useState<Category[]>([]);
const [totalPages, setTotalPages] = useState(1);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
const [applicationStatus, setApplicationStatus] = useState<{ [key: string]: boolean }>({});
const navigate = useNavigate();

const [searchState, setSearchState] = useState<{
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
  title: searchParams.get('title') || '',
  location: '',
  salary_min: undefined,
  salary_max: undefined,
  job_type: '',
  category_id: '',
  required_skills: '',
  page: 1,
  limit: 30,
});
const [tempSearchState, setTempSearchState] = useState<{
  title: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  job_type: string;
  category_id: string;
  required_skills: string;
}>({
  title: searchParams.get('title') || '',
  location: '',
  salary_min: undefined,
  salary_max: undefined,
  job_type: '',
  category_id: '',
  required_skills: '',
});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const params = {
          title: searchState.title || undefined,
          location: searchState.location || undefined,
          salary_min: searchState.salary_min,
          salary_max: searchState.salary_max,
          job_type: searchState.job_type || undefined,
          category_id: searchState.category_id || undefined,
          required_skills: searchState.required_skills
            ? searchState.required_skills.split(',').map(skill => skill.trim())
            : undefined,
          page: searchState.page,
          limit: searchState.limit,
          sort_by: 'created_at',
          sort_order: 'DESC',
        };
        const [jobsResponse, categoriesResponse] = await Promise.all([
          searchJobPosts(params),
          getCategories(),
        ]);
        setJobs(jobsResponse.data || []);
        setTotalPages(Math.ceil(jobsResponse.total / searchState.limit) || 1);
        setCategories(categoriesResponse || []);

if (profile?.role === 'jobseeker') {
  try {
    const statusPromises = jobsResponse.data.map((job) =>
      checkJobApplicationStatus(job.id).catch((err) => {
        console.error(`Error checking application status for job ${job.id}:`, err);
        return { hasApplied: false };
      })
    );
    const statuses = await Promise.all(statusPromises);
    const statusMap = jobsResponse.data.reduce((acc, job, index) => {
      acc[job.id] = statuses[index].hasApplied;
      return acc;
    }, {} as { [key: string]: boolean });
    setApplicationStatus(statusMap);
  } catch (err) {
    console.error('Error fetching application statuses:', err);
    setApplicationStatus({});
  }
}
      } catch (err: any) {
        console.error('Error fetching jobs:', err);
        setError(err.response?.data?.message || 'Failed to load jobs. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [searchState, profile]);

const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();
  setSearchState((prev) => ({
    ...prev,
    ...tempSearchState,
    title: searchInput,
    page: 1,
  }));
  setSearchParams({ title: searchInput });
  setIsFilterPanelOpen(false);
};

  const handlePageChange = (newPage: number) => {
    setSearchState((prev) => ({ ...prev, page: newPage }));
  };

  const getVisiblePages = () => {
    const maxVisible = 5;
    const pages: (number | string)[] = [];
    const currentPage = searchState.page;

    if (currentPage <= 3) {
      for (let i = 1; i <= Math.min(maxVisible, totalPages); i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 4) {
        pages.push('...');
      }
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(currentPage + 1, totalPages); i++) {
        if (i > 1 && i < totalPages) {
          pages.push(i);
        }
      }
    }

    if (totalPages > maxVisible && currentPage < totalPages - 1) {
      if (!pages.includes('...')) {
        pages.push('...');
      }
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
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
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
  />
  <button onClick={handleSearch}>Search</button>
  <button className="filter-toggle" onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}>
    <FaFilter />
  </button>
</div>
        <div className="find-job-content">
          <div className={`find-job-filters ${isFilterPanelOpen ? 'open' : ''}`}>
  <h3>Filters</h3>
  <form onSubmit={handleSearch} className="search-form">
    <div className="form-group">
      <label>Title:</label>
      <input
        type="text"
        value={tempSearchState.title}
        onChange={(e) => setTempSearchState({ ...tempSearchState, title: e.target.value })}
        placeholder="Enter job title"
      />
    </div>
    <div className="form-group">
      <label>Location:</label>
      <input
        type="text"
        value={tempSearchState.location}
        onChange={(e) => setTempSearchState({ ...tempSearchState, location: e.target.value })}
        placeholder="Enter location"
      />
    </div>
    <div className="form-group">
      <label>Minimum Salary:</label>
      <input
        type="number"
        value={tempSearchState.salary_min || ''}
        onChange={(e) =>
          setTempSearchState({
            ...tempSearchState,
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
        value={tempSearchState.salary_max || ''}
        onChange={(e) =>
          setTempSearchState({
            ...tempSearchState,
            salary_max: e.target.value ? Number(e.target.value) : undefined,
          })
        }
        placeholder="Enter maximum salary"
      />
    </div>
    <div className="form-group">
      <label>Job Type:</label>
      <select
        value={tempSearchState.job_type}
        onChange={(e) => setTempSearchState({ ...tempSearchState, job_type: e.target.value })}
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
        value={tempSearchState.category_id}
        onChange={(e) => setTempSearchState({ ...tempSearchState, category_id: e.target.value })}
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
        value={tempSearchState.required_skills}
        onChange={(e) => setTempSearchState({ ...tempSearchState, required_skills: e.target.value })}
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
                  <JobCard key={job.id} job={job} variant="find-jobs" />
                ))
              ) : (
                <p>No jobs found.</p>
              )}
            </div>
            <div className="job-pagination">
              {getVisiblePages().map((page, index) => (
                <button
                  key={index}
                  className={`pagination-button ${page === searchState.page ? 'pagination-current' : ''} ${page === '...' ? 'pagination-ellipsis' : ''}`}
                  onClick={() => typeof page === 'number' && handlePageChange(page)}
                  disabled={page === '...' || page === searchState.page}
                >
                  {page}
                </button>
              ))}
              <button
                className="pagination-arrow"
                onClick={() => handlePageChange(searchState.page + 1)}
                disabled={searchState.page === totalPages}
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

export default FindJob;