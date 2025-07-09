import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { searchTalents, searchJobseekers, getCategories } from '../services/api';
import { Profile, Category } from '@types';
import { FaUserCircle, FaFilter } from 'react-icons/fa';
import { AxiosError } from 'axios';

interface TalentResponse {
  total: number;
  data: Profile[];
}

const FindTalent: React.FC = () => {
 const [searchParams, setSearchParams] = useSearchParams();
const [searchInput, setSearchInput] = useState(searchParams.get('skills') || '');
const [filters, setFilters] = useState<{
  skills: string;
  username: string;
  experience: string;
  description: string;
  rating?: number;
  timezone: string;
  skill_id: string;
  page: number;
  limit: number;
}>({
  skills: searchParams.get('skills') || '',
  username: searchParams.get('username') || '',
  experience: '',
  description: '',
  rating: undefined,
  timezone: '',
  skill_id: '',
  page: 1,
  limit: 10,
});
const [tempFilters, setTempFilters] = useState<{
  skills: string;
  username: string;
  experience: string;
  description: string;
  rating?: number;
  timezone: string;
  skill_id: string;
}>({
  skills: searchParams.get('skills') || '',
  username: searchParams.get('username') || '',
  experience: '',
  description: '',
  rating: undefined,
  timezone: '',
  skill_id: '',
});
const [talents, setTalents] = useState<Profile[]>([]);
const [total, setTotal] = useState<number>(0);
const [categories, setCategories] = useState<Category[]>([]);
const [searchType, setSearchType] = useState<'talents' | 'jobseekers'>('talents');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const navigate = useNavigate();


  useEffect(() => {
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [response, categoriesData] = await Promise.all([
        searchType === 'talents'
          ? searchTalents({
              skills: filters.skills,
              experience: filters.experience,
              description: filters.description,
              rating: filters.rating,
              timezone: filters.timezone,
              skill_id: filters.skill_id,
              page: filters.page,
              limit: filters.limit,
            })
          : searchJobseekers({
              username: filters.username,
              skills: filters.skills,
              page: filters.page,
              limit: filters.limit,
            }),
        getCategories(),
      ]);
      console.log('Fetched data:', JSON.stringify(response, null, 2));
      let talentData: Profile[] = [];
      let totalCount = 0;

      if ('total' in response && 'data' in response && Array.isArray(response.data)) {
        talentData = response.data;
        totalCount = response.total;
      } else if (Array.isArray(response)) {
        talentData = response;
        totalCount = response.length;
      } else {
        console.error('Invalid response format:', response);
        setError('Invalid data format received from server. Please try again.');
        setTalents([]);
        setTotal(0);
        return;
      }

      setTalents(talentData);
      setTotal(totalCount);
      setCategories(categoriesData);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      console.error('Error fetching data:', axiosError);
      if (axiosError.response?.status === 401) {
        setError('Unauthorized access. Please log in again.');
        navigate('/login');
      } else {
        setError(axiosError.response?.data?.message || 'Failed to load talents. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  fetchData();
}, [filters, searchType, navigate]);

const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();
  setFilters((prev) => ({
    ...prev,
    ...tempFilters,
    skills: searchInput, // Применяем значение из поискового бара
    page: 1,
  }));
  setSearchParams({
    skills: searchInput,
    username: searchType === 'jobseekers' ? tempFilters.username : '',
  });
  setIsFilterPanelOpen(false);
};

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const toggleFilterPanel = () => {
    setIsFilterPanelOpen((prev) => !prev);
  };

  const truncateDescription = (description: string | undefined, maxLength: number) => {
    if (description && description.length > maxLength) {
      return description.substring(0, maxLength) + '...';
    }
    return description || '';
  };

  const totalPages = Math.ceil(total / filters.limit) || 1;

  const getVisiblePages = () => {
    const maxVisible = 5;
    const pages: (number | string)[] = [];
    const currentPage = filters.page;

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

  return (
    <div>
      <Header />
      <div className="container ft-container">
        <h2>Find Talent</h2>
        <div className="ft-search-bar">
  <input
    type="text"
    placeholder="Search by skills or keywords"
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
  />
  <button onClick={handleSearch}>Search</button>
  <button className="ft-filter-toggle" onClick={toggleFilterPanel}>
    <FaFilter />
  </button>
</div>
        <div className="ft-content">
          <div className="ft-filters ${isFilterPanelOpen ? 'open' : ''}">
  <h3>Filters</h3>
  <form onSubmit={handleSearch} className="ft-search-form">
    <div className="ft-form-group">
      <label>Skills:</label>
      <input
        type="text"
        value={tempFilters.skills}
        onChange={(e) => setTempFilters({ ...tempFilters, skills: e.target.value })}
        placeholder="Enter skills (e.g., JavaScript, Python)"
      />
    </div>
    {searchType === 'jobseekers' && (
      <div className="ft-form-group">
        <label>Username:</label>
        <input
          type="text"
          value={tempFilters.username}
          onChange={(e) => setTempFilters({ ...tempFilters, username: e.target.value })}
          placeholder="Enter username"
        />
      </div>
    )}
    <div className="ft-form-group">
      <label>Experience:</label>
      <input
        type="text"
        value={tempFilters.experience}
        onChange={(e) => setTempFilters({ ...tempFilters, experience: e.target.value })}
        placeholder="Enter experience (e.g., 3 years)"
      />
    </div>
    <div className="ft-form-group">
      <label>Description:</label>
      <input
        type="text"
        value={tempFilters.description}
        onChange={(e) => setTempFilters({ ...tempFilters, description: e.target.value })}
        placeholder="Enter keywords for description"
      />
    </div>
    <div className="ft-form-group">
      <label>Minimum Rating:</label>
      <input
        type="number"
        min="0"
        max="5"
        value={tempFilters.rating || ''}
        onChange={(e) =>
          setTempFilters({
            ...tempFilters,
            rating: e.target.value ? Number(e.target.value) : undefined,
          })
        }
        placeholder="Enter rating (0-5)"
      />
    </div>
    <div className="ft-form-group">
      <label>Timezone:</label>
      <input
        type="text"
        value={tempFilters.timezone}
        onChange={(e) => setTempFilters({ ...tempFilters, timezone: e.target.value })}
        placeholder="Enter timezone (e.g., America/New_York)"
      />
    </div>
    <div className="ft-form-group">
      <label>Skill:</label>
      <select
        value={tempFilters.skill_id}
        onChange={(e) => setTempFilters({ ...tempFilters, skill_id: e.target.value })}
      >
        <option value="">All Skills</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </div>
    <button type="submit" className="ft-button ft-success">
      Apply Filters
    </button>
  </form>
</div>
          <div className="ft-results">
            <div className="ft-grid">
              {isLoading ? (
                <p>Loading...</p>
              ) : error ? (
                <p className="error-message">{error}</p>
              ) : talents.length > 0 ? (
                talents.map((talent) => {
    const rating =
      (talent as any).average_rating ?? (talent as any).averageRating ?? null;
    const skills = Array.isArray((talent as any).skills) ? (talent as any).skills : [];
    const experience = (talent as any).experience ?? null;
    const description = (talent as any).description ?? null;
    const profileViews =
      (talent as any).profile_views ?? (talent as any).profileViews ?? 0;

    return (
      <div key={talent.id} className="ft-card">
        <div className="ft-avatar-top">
          {talent.avatar ? (
            <img
              src={`https://jobforge.net/backend${talent.avatar}`}
              alt="Talent Avatar"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const nextSibling = e.currentTarget.nextSibling;
                if (nextSibling instanceof HTMLElement || nextSibling instanceof SVGElement) {
                  nextSibling.style.display = 'block';
                }
              }}
            />
          ) : null}
          <FaUserCircle
            className="ft-avatar-icon"
            style={{ display: talent.avatar ? 'none' : 'block' }}
          />
        </div>
        <div className="ft-content">
          <div className="ft-title-row">
            <h3>{talent.username}</h3>
            {typeof rating === 'number' && (
              <span className="ft-rating-top-right">
                {Array.from({ length: 5 }, (_, i) => (
                  <span
                    key={i}
                    className={i < Math.floor(rating) ? 'ft-star-filled' : 'ft-star'}
                  >
                    ★
                  </span>
                ))}
              </span>
            )}
          </div>
          <div className="ft-details-columns">
            <div className="ft-details-column">
              <p>
                <strong>Skills:</strong>{' '}
                {skills.length > 0 ? skills.map((skill: Category) => skill.name).join(', ') : 'Not specified'}
              </p>
              <p>
                <strong>Experience:</strong> {experience || 'Not specified'}
              </p>
            </div>
            <div className="ft-details-column">
              <p>
                <strong>Profile Views:</strong>{' '}
                {typeof profileViews === 'number' ? profileViews : 0}
              </p>
              <p>
                <strong>Description:</strong>{' '}
                {description ? truncateDescription(description, 100) : 'Not specified'}
              </p>
            </div>
          </div>
          <div className="ft-footer">
            <div className="ft-spacer"></div>
            <Link to={`/public-profile/${talent.id}`} className="ft-button ft-view">
              View Profile
            </Link>
          </div>
        </div>
      </div>
    );
  })
) : (
  <p>No talents found.</p>
)}
            </div>
            {total > 0 && (
              <div className="ft-pagination">
                {getVisiblePages().map((page, index) => (
                  <button
                    key={index}
                    className={`ft-button ${
                      page === filters.page ? 'ft-current' : ''
                    } ${page === '...' ? 'ft-ellipsis' : ''}`}
                    onClick={() => typeof page === 'number' && handlePageChange(page)}
                    disabled={page === '...' || page === filters.page}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className="ft-arrow"
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page === totalPages}
                >
                  Next
                </button>
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

export default FindTalent;