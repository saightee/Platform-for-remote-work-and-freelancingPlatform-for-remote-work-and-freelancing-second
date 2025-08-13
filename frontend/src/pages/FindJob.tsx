import { useState, useEffect, Fragment, useRef, useMemo } from 'react';
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

  // --- автокомплит для категорий
  const [skillInput, setSkillInput] = useState('');
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const initialCategoryId = searchParams.get('category_id') || '';

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
    category_id: initialCategoryId, // ← стартуем с URL
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
    category_id: initialCategoryId, // ← тоже из URL
    required_skills: '',
    salary_type: '',
  });

  // грузим категории/вакансии
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = {
          title: searchState.title || undefined,
          location: searchState.location || undefined,
          salary_min: searchState.salary_type === 'negotiable' ? undefined : searchState.salary_min,
          salary_max: searchState.salary_type === 'negotiable' ? undefined : searchState.salary_max,
          job_type: searchState.job_type || undefined,
          category_id: searchState.category_id || undefined,
          required_skills: searchState.required_skills
            ? searchState.required_skills.split(',').map((s) => s.trim())
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

        const sortCategories = (cats: Category[]) => cats.sort((a, b) => a.name.localeCompare(b.name));
        setCategories(sortCategories(categoriesResponse) || []);

        if (profile?.role === 'jobseeker') {
          try {
            const statusPromises = jobsResponse.data.map((job) =>
              checkJobApplicationStatus(job.id).catch(() => ({ hasApplied: false }))
            );
            const statuses = await Promise.all(statusPromises);
            const statusMap = jobsResponse.data.reduce((acc, job, index) => {
              acc[job.id] = statuses[index].hasApplied;
              return acc;
            }, {} as { [key: string]: boolean });
            setApplicationStatus(statusMap);
          } catch {
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

  // debounce по полю "Search by job title"
  const firstRunRef = useRef(true);
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    const t = setTimeout(() => {
      setSearchState((prev) => ({ ...prev, title: searchInput, page: 1 }));
    }, 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  // автокомплит категорий
  useEffect(() => {
    const run = async () => {
      if (skillInput.trim() === '') {
        setFilteredCategories([]);
        setIsCategoryDropdownOpen(false);
        return;
      }
      try {
        const res = await searchCategories(skillInput);
        const sorted = res.sort((a, b) => a.name.localeCompare(b.name));
        setFilteredCategories(sorted);
        setIsCategoryDropdownOpen(true);
      } catch {
        setFilteredCategories([]);
        setIsCategoryDropdownOpen(false);
      }
    };
    const d = setTimeout(run, 300);
    return () => clearTimeout(d);
  }, [skillInput]);

  // Сброс категории — кнопка "Clear category"
  const clearCategory = () => {
    setSkillInput('');
    setTempSearchState((s) => ({ ...s, category_id: '' }));
    setSearchState((prev) => ({ ...prev, category_id: '', page: 1 }));

    const nextParams: Record<string, string> = {};
    if (searchInput.trim()) nextParams.title = searchInput.trim(); // оставим тайтл, если есть
    // category_id не передаём — он исчезнет из URL
    setSearchParams(nextParams, { replace: true });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // если поле категории пустое — снимаем фильтр категории
    const cleanedCategoryId = skillInput.trim() ? tempSearchState.category_id : '';

    setSearchState((prev) => ({
      ...prev,
      ...tempSearchState,
      title: searchInput,
      category_id: cleanedCategoryId,
      salary_min: tempSearchState.salary_type === 'negotiable' ? undefined : tempSearchState.salary_min,
      salary_max: tempSearchState.salary_type === 'negotiable' ? undefined : tempSearchState.salary_max,
      page: 1,
    }));

    const nextParams: Record<string, string> = {};
    if (searchInput.trim()) nextParams.title = searchInput.trim();
    if (cleanedCategoryId) nextParams.category_id = cleanedCategoryId;
    setSearchParams(nextParams, { replace: true });

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

    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // найти категорию по id (ходит по дереву)
const findCategoryById = (id: string, cats: Category[]): Category | undefined => {
  for (const c of cats) {
    if (c.id === id) return c;
    if (c.subcategories) {
      const found = findCategoryById(id, c.subcategories);
      if (found) return found;
    }
  }
  return undefined;
};


// красивое имя выбранной категории для бейджа
const selectedCategoryLabel = useMemo(() => {
  const id = tempSearchState.category_id || searchState.category_id;
  if (!id || categories.length === 0) return '';
  const cat = findCategoryById(id, categories);
  if (!cat) return '';
  const parent = cat.parent_id ? findCategoryById(cat.parent_id, categories) : undefined;
  return parent ? `${parent.name} > ${cat.name}` : cat.name;
}, [tempSearchState.category_id, searchState.category_id, categories]);


useEffect(() => {
  if (!skillInput && selectedCategoryLabel) setSkillInput(selectedCategoryLabel);
}, [selectedCategoryLabel, skillInput]);

  return (
    <div>
      <Header />
      {error && <div className="error-message">{error}</div>}

      <div className={`loading-overlay ${isLoading ? 'visible' : ''}`}>
        {isLoading && <Loader />}
      </div>

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
                  onChange={(e) => {
                    const st = e.target.value;
                    setTempSearchState({
                      ...tempSearchState,
                      salary_type: st,
                      salary_min: st === 'negotiable' ? undefined : tempSearchState.salary_min,
                      salary_max: st === 'negotiable' ? undefined : tempSearchState.salary_max,
                    });
                  }}
                >
                  <option value="">All</option>
                  <option value="per hour">Per Hour</option>
                  <option value="per month">Per Month</option>
                  <option value="negotiable">Negotiable</option>
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
                  disabled={tempSearchState.salary_type === 'negotiable'}
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
                  disabled={tempSearchState.salary_type === 'negotiable'}
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

              <div className="ft-form-group">
                <label>Category:</label>
                <div className="autocomplete-wrapper">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Type to search categories/skills..."
                    className="category-select"
                    onFocus={() => setIsCategoryDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsCategoryDropdownOpen(false), 200)}
                  />
                  {isCategoryDropdownOpen && (skillInput.trim() ? filteredCategories.length > 0 : categories.length > 0) && (
                    <ul className="autocomplete-dropdown">
                      {(skillInput.trim() ? filteredCategories : categories).map((cat) => (
                        <Fragment key={cat.id}>
                          <li
                            className="autocomplete-item"
                            onMouseDown={() => {
                              const displayName = cat.parent_id
                                ? `${categories.find(c => c.id === cat.parent_id)?.name || ''} > ${cat.name}`
                                : cat.name;
                              setTempSearchState({ ...tempSearchState, category_id: cat.id });
                              setSkillInput(displayName);
                              setIsCategoryDropdownOpen(false);
                            }}
                          >
                            {cat.parent_id
                              ? `${categories.find(c => c.id === cat.parent_id)?.name || ''} > ${cat.name}`
                              : cat.name}
                          </li>
                          {cat.subcategories?.map((sub) => (
                            <li
                              className="autocomplete-item sub-item"
                              onMouseDown={() => {
                                setTempSearchState({ ...tempSearchState, category_id: sub.id });
                                setSkillInput(`${cat.name} > ${sub.name}`);
                                setIsCategoryDropdownOpen(false);
                              }}
                            >
                              {`${cat.name} > ${sub.name}`}
                            </li>
                          ))}
                        </Fragment>
                      ))}
                    </ul>
                  )}
                </div>

{(searchState.category_id || tempSearchState.category_id) && (
  <div className="category-tags" style={{ marginTop: 6 }}>
    <span className="category-tag">
      {selectedCategoryLabel || skillInput || 'Selected category'}
      <span className="remove-tag" onClick={clearCategory}>×</span>
    </span>
  </div>
)}


              </div>

              <button type="submit" className="action-button">
                Apply Filters
              </button>
            </form>
          </div>

          <div className="find-job-results">
            <div className="job-grid">
              {jobs.length > 0 ? (
                jobs.map((job) => <JobCard key={job.id} job={job} variant="find-jobs" />)
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
