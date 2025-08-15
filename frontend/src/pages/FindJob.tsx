import { useState, useEffect, Fragment, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import JobCard from '../components/JobCard';
import { JobPost, Category } from '@types';
import { FaFilter, FaSearch, FaBriefcase, FaTimes } from 'react-icons/fa';
import { searchJobPosts, getCategories, checkJobApplicationStatus, searchCategories } from '../services/api';
import { useRole } from '../context/RoleContext';
import Loader from '../components/Loader';
import '../styles/find-job.css';

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

  // --- автокомплит категорий
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
    category_id: initialCategoryId,
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
    category_id: initialCategoryId,
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

  // Сброс категории
  const clearCategory = () => {
    setSkillInput('');
    setTempSearchState((s) => ({ ...s, category_id: '' }));
    setSearchState((prev) => ({ ...prev, category_id: '', page: 1 }));

    const nextParams: Record<string, string> = {};
    if (searchInput.trim()) nextParams.title = searchInput.trim();
    setSearchParams(nextParams, { replace: true });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

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
      if (start > 2) pages.push('…');
    }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('…');
      pages.push(totalPages);
    }
    return pages;
  };

  // найти категорию по id
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

      {isLoading && (
        <div className="fj-loading">
          <Loader />
        </div>
      )}

      <div className="fj-shell">
        <div className="fj-card">
          <div className="fj-head">
            <h1 className="fj-title"><FaBriefcase /> Find Jobs</h1>
            <p className="fj-sub">Search and filter open roles across categories and work modes.</p>
          </div>

          {error && <div className="fj-alert fj-err">{error}</div>}

          <div className="fj-searchbar">
            <input
              type="text"
              className="fj-input"
              placeholder="Search by job title or company"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button className="fj-btn fj-primary" onClick={handleSearch}>
              <FaSearch /> Search
            </button>
            <button
              className={`fj-btn fj-ghost ${isFilterPanelOpen ? 'active' : ''}`}
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            >
              <FaFilter /> Filters
            </button>
          </div>

          <div className="fj-layout">
            {/* Filters */}
            <aside className={`fj-filters ${isFilterPanelOpen ? 'open' : ''}`}>
              <div className="fj-filters-head">
                <h3 className="fj-filters-title"><FaFilter /> Filters</h3>
                <button className="fj-filters-close" onClick={() => setIsFilterPanelOpen(false)}>
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSearch} className="fj-form" noValidate>
                <div className="fj-row">
                  <label className="fj-label">Title</label>
                  <input
                    type="text"
                    className="fj-input"
                    value={tempSearchState.title}
                    onChange={(e) => setTempSearchState({ ...tempSearchState, title: e.target.value })}
                    placeholder="Enter job title"
                  />
                </div>

                <div className="fj-row">
                  <label className="fj-label">Work Mode</label>
                  <select
                    className="fj-input"
                    value={tempSearchState.location}
                    onChange={(e) => setTempSearchState({ ...tempSearchState, location: e.target.value })}
                  >
                    <option value="">All Locations</option>
                    <option value="Remote">Remote</option>
                    <option value="On-site">On-site</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div className="fj-row">
                  <label className="fj-label">Salary Type</label>
                  <select
                    className="fj-input"
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

                <div className="fj-grid-2">
                  <div className="fj-row">
                    <label className="fj-label">Minimum Salary</label>
                    <input
                      type="number"
                      className="fj-input"
                      value={tempSearchState.salary_min || ''}
                      onChange={(e) =>
                        setTempSearchState({
                          ...tempSearchState,
                          salary_min: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="e.g. 500"
                      disabled={tempSearchState.salary_type === 'negotiable'}
                    />
                  </div>

                  <div className="fj-row">
                    <label className="fj-label">Maximum Salary</label>
                    <input
                      type="number"
                      className="fj-input"
                      value={tempSearchState.salary_max || ''}
                      onChange={(e) =>
                        setTempSearchState({
                          ...tempSearchState,
                          salary_max: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="e.g. 3000"
                      disabled={tempSearchState.salary_type === 'negotiable'}
                    />
                  </div>
                </div>

                <div className="fj-row">
                  <label className="fj-label">Job Type</label>
                  <select
                    className="fj-input"
                    value={tempSearchState.job_type}
                    onChange={(e) => setTempSearchState({ ...tempSearchState, job_type: e.target.value })}
                  >
                    <option value="">All Types</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Project-based">Project-based</option>
                  </select>
                </div>

                <div className="fj-row">
                  <label className="fj-label">Category</label>
                  <div className="fj-autocomplete">
                    <input
                      type="text"
                      className="fj-input"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder="Type to search categories/skills..."
                      onFocus={() => setIsCategoryDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsCategoryDropdownOpen(false), 200)}
                    />
                    {isCategoryDropdownOpen && (skillInput.trim() ? filteredCategories.length > 0 : categories.length > 0) && (
                      <ul className="fj-autocomplete-list">
                        {(skillInput.trim() ? filteredCategories : categories).map((cat) => (
                          <Fragment key={cat.id}>
                            <li
                              className="fj-autocomplete-item"
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
                                key={sub.id}
                                className="fj-autocomplete-item fj-sub"
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
                    <div className="fj-tags">
                      <span className="fj-tag">
                        {selectedCategoryLabel || skillInput || 'Selected category'}
                        <button type="button" className="fj-tag-x" onClick={clearCategory}>×</button>
                      </span>
                    </div>
                  )}
                </div>

                <button type="submit" className="fj-btn fj-primary fj-apply">Apply Filters</button>
              </form>
            </aside>

            {/* Results */}
            <main className="fj-results">
              <div className="fj-grid">
                {jobs.length > 0 ? (
                  jobs.map((job) => <JobCard key={job.id} job={job} variant="find-jobs" />)
                ) : (
                  <p className="fj-empty">No jobs found.</p>
                )}
              </div>

              {/* Pagination */}
              <div className="fj-pagination">
                {getVisiblePages().map((page, index) => (
                  <button
                    key={index}
                    className={`fj-page ${page === searchState.page ? 'is-current' : ''} ${page === '…' ? 'is-ellipsis' : ''}`}
                    onClick={() => typeof page === 'number' && handlePageChange(page)}
                    disabled={page === '…' || page === searchState.page}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className="fj-page fj-next"
                  onClick={() => handlePageChange(searchState.page + 1)}
                  disabled={searchState.page === totalPages}
                >
                  Next
                </button>
              </div>
            </main>
          </div>
        </div>
      </div>

      <Footer />
      <Copyright />
    </div>
  );
};

export default FindJob;
