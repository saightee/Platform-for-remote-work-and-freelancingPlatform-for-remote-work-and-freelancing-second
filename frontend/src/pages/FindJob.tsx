import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import JobCard from '../components/JobCard';
import { JobPost, Category, PaginatedResponse } from '@types';
import { FaFilter } from 'react-icons/fa';
import { searchJobPosts, getCategories, checkJobApplicationStatus, searchCategories } from '../services/api';
import { useRole } from '../context/RoleContext';
import Loader from '../components/Loader';

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

const [categoryInput, setCategoryInput] = useState('');
const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

const [searchState, setSearchState] = useState<{
  title: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  job_type: string;
  category_id: string;
  required_skills: string;
  salary_type: string;
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
  salary_type: '',
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
  salary_type: string;
}>({
  title: searchParams.get('title') || '',
  location: '',
  salary_min: undefined,
  salary_max: undefined,
  job_type: '',
  category_id: '',
  required_skills: '',
  salary_type: '',
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
          salary_type: searchState.salary_type || undefined,
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
        // Сортировка категорий
        const sortCategories = (cats: Category[]) => cats.sort((a, b) => a.name.localeCompare(b.name));
        setCategories(sortCategories(categoriesResponse) || []);

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

  useEffect(() => {
  const debounce = setTimeout(() => {
    setSearchState((prev) => ({ ...prev, title: searchInput, page: 1 }));
  }, 500);
  return () => clearTimeout(debounce);
}, [searchInput]);

// Добавлено: search для categoryInput
useEffect(() => {
  const search = async () => {
    if (categoryInput.trim() === '') {
      setFilteredCategories([]);
      setIsCategoryDropdownOpen(false);
      return;
    }
    try {
      const res = await searchCategories(categoryInput);
      const sorted = res.sort((a, b) => a.name.localeCompare(b.name));
      setFilteredCategories(sorted);
      setIsCategoryDropdownOpen(true);
    } catch (err) {
      console.error('Error searching categories:', err);
      setFilteredCategories([]);
      setIsCategoryDropdownOpen(false);
    }
  };
  const debounce = setTimeout(search, 300);
  return () => clearTimeout(debounce);
}, [categoryInput]);

const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();
  setSearchState((prev) => ({
    ...prev,
    ...tempSearchState,
    page: 1,
  }));
  setSearchParams({ title: tempSearchState.title });
  setIsFilterPanelOpen(false);
};

  const handlePageChange = (newPage: number) => {
    setSearchState((prev) => ({ ...prev, page: newPage }));
  };

    const getVisiblePages = () => {
    const maxVisible = 5;
    const pages: (number | string)[] = [];
    const currentPage = searchState.page;

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  if (isLoading) return <Loader />;
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
  <label>Work Mode:</label>
  <select
    value={tempSearchState.location}
    onChange={(e) => setTempSearchState({ ...tempSearchState, location: e.target.value })}
  >
    <option value="">All Locations</option>
    <option value="Remote">Remote</option>
    <option value="On-site">On-site</option>
    <option value="Hybrid">Hybrid</option>
  </select>
</div>
 <div className="form-group">
  <label>Salary Type:</label>
  <select
    value={tempSearchState.salary_type || ''}
    onChange={(e) => setTempSearchState({ ...tempSearchState, salary_type: e.target.value })}
  >
    <option value="">All</option>
    <option value="per hour">Per Hour</option>
    <option value="per month">Per Month</option>
  </select>
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
  <div className="autocomplete-wrapper">
    <input
      type="text"
      value={categoryInput}
      onChange={(e) => setCategoryInput(e.target.value)}
      placeholder="Type to search categories..."
      className="category-select"
      onFocus={() => categoryInput.trim() && setIsCategoryDropdownOpen(true)}
      onBlur={() => setTimeout(() => setIsCategoryDropdownOpen(false), 200)}
    />
    {isCategoryDropdownOpen && filteredCategories.length > 0 && (
      <ul className="autocomplete-dropdown">
        {filteredCategories.map((cat) => (
          <li
            key={cat.id}
            className="autocomplete-item"
            onMouseDown={() => {
              setTempSearchState({ ...tempSearchState, category_id: cat.id });
              setCategoryInput(cat.parent_id ? `${categories.find(c => c.id === cat.parent_id)?.name || ''} > ${cat.name}` : cat.name);
              setIsCategoryDropdownOpen(false);
            }}
          >
            {cat.parent_id ? `${categories.find(c => c.id === cat.parent_id)?.name || ''} > ${cat.name}` : cat.name}
          </li>
        ))}
      </ul>
    )}
    {!categoryInput && categories.length > 0 && isCategoryDropdownOpen && ( // Show all if empty
      <ul className="autocomplete-dropdown">
        {categories.map((category) => (
          <>
            <li
              key={category.id}
              className="autocomplete-item"
              onMouseDown={() => {
                setTempSearchState({ ...tempSearchState, category_id: category.id });
                setCategoryInput(category.name);
                setIsCategoryDropdownOpen(false);
              }}
            >
              {category.name}
            </li>
            {category.subcategories?.map((sub) => (
              <li
                key={sub.id}
                className="autocomplete-item sub-item"
                onMouseDown={() => {
                  setTempSearchState({ ...tempSearchState, category_id: sub.id });
                  setCategoryInput(`${category.name} > ${sub.name}`);
                  setIsCategoryDropdownOpen(false);
                }}
              >
                {`${category.name} > ${sub.name}`}
              </li>
            ))}
          </>
        ))}
      </ul>
    )}
  </div>
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