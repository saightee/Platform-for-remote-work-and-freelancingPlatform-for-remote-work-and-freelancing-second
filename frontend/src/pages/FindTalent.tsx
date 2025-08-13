import { useState, useEffect, useCallback, Fragment, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { searchTalents, searchJobseekers, getCategories, searchCategories } from '../services/api';
import { Profile, Category } from '@types';
import { FaUserCircle, FaFilter } from 'react-icons/fa';
import { AxiosError } from 'axios';
import Loader from '../components/Loader';




interface TalentResponse {
  total: number;
  data: Profile[];
}

const FindTalent: React.FC = () => {
 const [searchParams, setSearchParams] = useSearchParams();
const [searchInput, setSearchInput] = useState(searchParams.get('skills') || '');
const [filters, setFilters] = useState<{
  username: string;
  experience: string;
  rating?: number;
  skills?: string[];
  salary_type: string;
  page: number;
  limit: number;
  description?: string;          // ← добавили
}>({
  username: searchParams.get('username') || '',
  experience: '',
  rating: undefined,
  skills: undefined,
  salary_type: '',
  page: 1,
  limit: 10,
  description: searchParams.get('description') || '', // опционально
});

const [tempFilters, setTempFilters] = useState<{
  username: string;
  experience: string;
  rating?: number;
  skills?: string[];
  salary_type: string;
  description?: string;          // ← добавили (если захочешь использовать)
}>({
  username: searchParams.get('username') || '',
  experience: '',
  rating: undefined,
  skills: undefined,
  salary_type: '',
  description: '',
});

const [talents, setTalents] = useState<Profile[]>([]);
const [total, setTotal] = useState<number>(0);
const [categories, setCategories] = useState<Category[]>([]);
const [searchType, setSearchType] = useState<'talents' | 'jobseekers'>('talents');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const navigate = useNavigate();
const [skillInput, setSkillInput] = useState('');
const [filteredSkills, setFilteredSkills] = useState<Category[]>([]);
const [isDropdownOpen, setIsDropdownOpen] = useState(false);
// рядом с другими useState
const [selectedSkillId, setSelectedSkillId] = useState<string>(searchParams.get('category_id') || '');


useEffect(() => {
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Добавлено: получение category_id из params
      const categoryId = searchParams.get('category_id') || null;

const response = await (searchType === 'talents'
  ? searchTalents({
      experience: filters.experience,
      rating: filters.rating,
      skills: filters.skills,                 // имена/строки из автокомплита
      skill_id: categoryId || undefined,      // ← если пришли по ссылке с id — шлём отдельным параметром
      salary_type: filters.salary_type || undefined,
      description: searchInput,
      page: filters.page,
      limit: filters.limit,
    })
  : searchJobseekers({
      username: filters.username,
      page: filters.page,
      limit: filters.limit,
    }));

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

      const categoriesData = await getCategories();
      // Сортировка категорий по алфавиту
      const sortedCategories = categoriesData.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(sortedCategories || []);
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
}, [filters, searchType, navigate, searchParams]); // Добавлен searchInput для реактивного поиска

const firstRunRef = useRef(true);

useEffect(() => {
  if (firstRunRef.current) {
    firstRunRef.current = false;
    return;
  }
  const debounce = setTimeout(() => {
    setFilters(prev => ({ ...prev, description: searchInput, page: 1 }));
  }, 500);
  return () => clearTimeout(debounce);
}, [searchInput]);

useEffect(() => {
  const searchCategoriesAsync = async () => {
    if (skillInput.trim() === '') {
      setFilteredSkills([]);
      setIsDropdownOpen(false);
      return;
    }
    try {
      const response = await searchCategories(skillInput);
      const sorted = response.sort((a, b) => a.name.localeCompare(b.name));
      setFilteredSkills(sorted);
      setIsDropdownOpen(true);
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error searching categories:', axiosError.response?.data?.message || axiosError.message);
      setFilteredSkills([]);
      setIsDropdownOpen(false);
    }
  };
  const debounce = setTimeout(searchCategoriesAsync, 300);
  return () => clearTimeout(debounce);
}, [skillInput]);

const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();

  const cleanedSkills = skillInput.trim() ? tempFilters.skills : undefined;

  setFilters(prev => ({
    ...prev,
    ...tempFilters,
    skills: cleanedSkills,
    description: searchInput,
    page: 1,
  }));

  const nextParams: Record<string, string> = {};
  if (searchType === 'jobseekers' && (tempFilters.username || '').trim()) {
    nextParams.username = (tempFilters.username || '').trim();
  }
  // ← вот здесь добавляем выбранную категорию в URL
  if (selectedSkillId) {
    nextParams.category_id = selectedSkillId;
  }

  setSearchParams(nextParams);
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
          <div className={`ft-filters ${isFilterPanelOpen ? 'open' : ''}`}>
  <h3>Filters</h3>
  <form onSubmit={handleSearch} className="ft-search-form">
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
  <select
    value={tempFilters.experience}
    onChange={(e) => setTempFilters({ ...tempFilters, experience: e.target.value })}
  >
    <option value="">All</option>
    <option value="Less than 1 year">Less than 1 year</option>
    <option value="1-2 years">1-2 years</option>
    <option value="2-3 years">2-3 years</option>
    <option value="3-6 years">3-6 years</option>
    <option value="6+ years">6+ years</option>
  </select>
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
  <label>Category/Skill:</label>
  <div className="autocomplete-wrapper">
    <input
      type="text"
      value={skillInput}
      onChange={(e) => setSkillInput(e.target.value)}
      placeholder="Type to search categories/skills..."
      className="category-select"
      onFocus={() => setIsDropdownOpen(true)} // Изменено: open always on focus, to show tree if empty
      onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
    />
    {isDropdownOpen && (skillInput.trim() ? filteredSkills.length > 0 : categories.length > 0) && (
      <ul className="autocomplete-dropdown">
        {(skillInput.trim() ? filteredSkills : categories).map((cat) => (
  <Fragment key={cat.id}>
<li
  className="autocomplete-item"
  onMouseDown={() => {
    const displayName = cat.parent_id
      ? `${categories.find(c => c.id === cat.parent_id)?.name || ''} > ${cat.name}`
      : cat.name;

    setTempFilters({ ...tempFilters, skills: [cat.name] }); // имя — как раньше
    setSelectedSkillId(cat.id);                              // ← ВАЖНО: сохранить id
    setSkillInput(displayName);
    setIsDropdownOpen(false);
  }}
>
  {cat.parent_id ? `${categories.find(c => c.id === cat.parent_id)?.name || ''} > ${cat.name}` : cat.name}
</li>

{cat.subcategories?.map((sub) => (
  <li
    className="autocomplete-item sub-item"
    onMouseDown={() => {
      setTempFilters({ ...tempFilters, skills: [sub.name] }); // имя
      setSelectedSkillId(sub.id);                              // ← id подкатегории
      setSkillInput(`${cat.name} > ${sub.name}`);
      setIsDropdownOpen(false);
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
</div>
    <button type="submit" className="ft-button ft-success">
      Apply Filters
    </button>
  </form>
</div>
          <div className="ft-results">
            <div className="ft-grid">
              {isLoading ? (
                <Loader />
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
              <p><strong>Resume:</strong> {(talent as any).resume ? ( 
  <a 
    href={(talent as any).resume.startsWith('http') 
      ? (talent as any).resume 
      : `https://jobforge.net/backend${(talent as any).resume}`}
    target="_blank" 
    rel="noopener noreferrer"
  >
    Download Resume
  </a>
) : 'Not provided'}</p>
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
  <div className="job-pagination">
    {getVisiblePages().map((page, index) => (
      <button
        key={index}
        className={`pagination-button ${page === filters.page ? 'pagination-current' : ''} ${page === '...' ? 'pagination-ellipsis' : ''}`}
        onClick={() => typeof page === 'number' && handlePageChange(page)}
        disabled={page === '...' || page === filters.page}
      >
        {page}
      </button>
    ))}
    <button
      className="pagination-arrow"
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