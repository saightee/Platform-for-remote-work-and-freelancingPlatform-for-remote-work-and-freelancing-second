import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import JobCard from '../components/JobCard';
import { JobPost, Category } from '@types';
import { FaFilter } from 'react-icons/fa';

const FindJob: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const navigate = useNavigate();

  // Для продакшена: работа с эндпоинтами
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const queryParams = new URLSearchParams();
        if (searchState.title) queryParams.append('title', searchState.title);
        if (searchState.location) queryParams.append('location', searchState.location);
        if (searchState.salary_min) queryParams.append('salary_min', searchState.salary_min.toString());
        if (searchState.salary_max) queryParams.append('salary_max', searchState.salary_max.toString());
        if (searchState.job_type) queryParams.append('job_type', searchState.job_type);
        if (searchState.category_id) queryParams.append('category_id', searchState.category_id);
        if (searchState.required_skills) {
          searchState.required_skills.split(',').forEach(skill => queryParams.append('required_skills[]', skill.trim()));
        }
        queryParams.append('page', searchState.page.toString());
        queryParams.append('limit', searchState.limit.toString());
        queryParams.append('sort_by', 'created_at');
        queryParams.append('sort_order', 'DESC');

        const [jobsResponse, categoriesResponse] = await Promise.all([
          fetch(`http://localhost:3000/api/job-posts?${queryParams.toString()}`),
          fetch('http://localhost:3000/api/categories'),
        ]);

        if (!jobsResponse.ok) throw new Error(`HTTP error! status: ${jobsResponse.status}`);
        if (!categoriesResponse.ok) throw new Error(`HTTP error! status: ${categoriesResponse.status}`);

        const jobsData: any = await jobsResponse.json(); // Временное использование any до обновления типов
        const categoriesData = await categoriesResponse.json();

        // Предполагаем, что бэкенд вернёт объект с полем total (по договорённости с бэкэндером)
        const totalJobs = jobsData.total || (Array.isArray(jobsData) ? jobsData.length : jobsData.data?.length || 0);
        setJobs(Array.isArray(jobsData) ? jobsData : jobsData.data || []);
        setCategories(categoriesData);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load jobs. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [searchState]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchState((prev) => ({ ...prev, page: 1 }));
    setSearchParams({ title: searchState.title });
    setIsFilterPanelOpen(false);
  };

  const handlePageChange = (newPage: number) => {
    setSearchState((prev) => ({ ...prev, page: newPage }));
  };

  // Вычисляем общее количество страниц на основе total из ответа API
  // Примечание: total будет добавлено бэкэндером, пока используем запасной вариант
  const totalPages = jobs.length > 0 && (jobs[0] as any)?.total ? Math.ceil((jobs[0] as any).total / searchState.limit) : 1;

  // Определяем отображаемые страницы
  const getVisiblePages = () => {
    const maxVisible = 5;
    const pages = [];
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
            value={searchState.title}
            onChange={(e) => setSearchState({ ...searchState, title: e.target.value })}
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
                  value={searchState.title}
                  onChange={(e) => setSearchState({ ...searchState, title: e.target.value })}
                  placeholder="Enter job title"
                />
              </div>
              <div className="form-group">
                <label>Location:</label>
                <input
                  type="text"
                  value={searchState.location}
                  onChange={(e) => setSearchState({ ...searchState, location: e.target.value })}
                  placeholder="Enter location"
                />
              </div>
              <div className="form-group">
                <label>Minimum Salary:</label>
                <input
                  type="number"
                  value={searchState.salary_min || ''}
                  onChange={(e) =>
                    setSearchState({
                      ...searchState,
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
                  value={searchState.salary_max || ''}
                  onChange={(e) =>
                    setSearchState({
                      ...searchState,
                      salary_max: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="Enter maximum salary"
                />
              </div>
              <div className="form-group">
                <label>Job Type:</label>
                <select
                  value={searchState.job_type}
                  onChange={(e) => setSearchState({ ...searchState, job_type: e.target.value })}
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
                  value={searchState.category_id}
                  onChange={(e) => setSearchState({ ...searchState, category_id: e.target.value })}
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
                  value={searchState.required_skills}
                  onChange={(e) => setSearchState({ ...searchState, required_skills: e.target.value })}
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