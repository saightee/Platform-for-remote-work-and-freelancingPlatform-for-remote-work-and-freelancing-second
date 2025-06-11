import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { searchTalents, getCategories } from '../services/api';
import { Profile, Category } from '@types';
import { FaUserCircle, FaFilter } from 'react-icons/fa';
// import { mockTalents } from '../mocks/mockTalents'; // Закомментировано

const FindTalent: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [talents, setTalents] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<{
    skills: string;
    experience: string;
    rating?: number;
    timezone: string;
    category_id: string;
    page: number;
    limit: number;
  }>({
    skills: searchParams.get('skills') || '',
    experience: '',
    rating: undefined,
    timezone: '',
    category_id: '',
    page: 1,
    limit: 10,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const navigate = useNavigate();

  // Для разработки: использование мок-данных (закомментировано)
  // useEffect(() => {
  //   const mockProfile = { role: 'employer' }; // Эмуляция роли для доступа
  //   setTalents(mockTalents); // Установка мок-данных
  //   setCategories([]); // Пустой массив категорий, так как не загружаем их
  //   setIsLoading(false); // Отключаем загрузку
  // }, []);

  // Для продакшена: раскомментировать этот useEffect
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [talentsData, categoriesData] = await Promise.all([
          searchTalents(filters),
          getCategories(),
        ]);
        console.log('Fetched talents:', JSON.stringify(talentsData, null, 2));
        if (!Array.isArray(talentsData)) {
          console.error('Talents data is not an array:', talentsData);
          setError('Invalid data format received. Please try again.');
          setTalents([]);
          return;
        }
        setTalents(talentsData);
        setCategories(categoriesData);
      } catch (err: any) {
        console.error('Error fetching talents:', err);
        setError(err.response?.data?.message || 'Failed to load talents. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
    setSearchParams({ skills: filters.skills });
    setIsFilterPanelOpen(false);
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const toggleFilterPanel = () => {
    setIsFilterPanelOpen(prev => !prev);
  };

  const truncateDescription = (description: string, maxLength: number) => {
    if (description.length > maxLength) {
      return description.substring(0, maxLength) + '...';
    }
    return description;
  };

  // Вычисляем общее количество страниц на основе total из ответа API
  // Примечание: total будет добавлено бэкэндером в ответ /talents, пока используем запасной вариант
  const totalPages = talents.length > 0 && (talents[0] as any)?.total ? Math.ceil((talents[0] as any).total / filters.limit) : 1;

  const getVisiblePages = () => {
    const maxVisible = 5;
    const pages = [];
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

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <Header />
      <div className="container ft-container">
        <h2>Find Talent</h2>
        <div className="ft-search-bar">
          <input
            type="text"
            placeholder="Search by skills or keywords"
            value={filters.skills}
            onChange={(e) => setFilters({ ...filters, skills: e.target.value })}
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
              <div className="ft-form-group">
                <label>Skills:</label>
                <input
                  type="text"
                  value={filters.skills}
                  onChange={(e) => setFilters({ ...filters, skills: e.target.value })}
                  placeholder="Enter skills (e.g., JavaScript, Python)"
                />
              </div>
              <div className="ft-form-group">
                <label>Experience:</label>
                <input
                  type="text"
                  value={filters.experience}
                  onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
                  placeholder="Enter experience (e.g., 3 years)"
                />
              </div>
              <div className="ft-form-group">
                <label>Minimum Rating:</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={filters.rating || ''}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
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
                  value={filters.timezone}
                  onChange={(e) => setFilters({ ...filters, timezone: e.target.value })}
                  placeholder="Enter timezone (e.g., America/New_York)"
                />
              </div>
              <div className="ft-form-group">
                <label>Category:</label>
                <select
                  value={filters.category_id}
                  onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="ft-button ft-success">Apply Filters</button>
            </form>
          </div>
          <div className="ft-results">
            <div className="ft-grid">
              {talents.length > 0 ? (
                talents.map((talent) => {
                  const rating = (talent as any).average_rating ?? (talent as any).averageRating ?? null;
                  const skills = Array.isArray((talent as any).skills) ? (talent as any).skills : [];
                  const experience = (talent as any).experience ?? null;
                  const categoryList = Array.isArray((talent as any).categories)
                    ? (talent as any).categories
                    : Array.isArray((talent as any).skillCategories)
                    ? (talent as any).skillCategories
                    : [];
                  const profileViews = (talent as any).profile_views ?? (talent as any).profileViews ?? 0;

                  return (
                    <div key={talent.id} className="ft-card">
                      <div className="ft-avatar-top">
                        {talent.avatar ? (
                          <img src={`https://jobforge.net/backend${talent.avatar}`} alt="Talent Avatar" />
                        ) : (
                          <FaUserCircle className="ft-avatar-icon" />
                        )}
                      </div>
                      <div className="ft-content">
                        <div className="ft-title-row">
                          <h3>{talent.username}</h3>
                          {typeof rating === 'number' && (
                            <span className="ft-rating-top-right">{Array.from({ length: 5 }, (_, i) => (
                              <span key={i} className={i < Math.floor(rating) ? 'ft-star-filled' : 'ft-star'}>
                                ★
                              </span>
                            ))}</span>
                          )}
                        </div>
                        <div className="ft-details-columns">
                          <div className="ft-details-column">
                            <p><strong>Skills:</strong> {skills.length > 0 ? skills.join(', ') : 'Not specified'}</p>
                            <p><strong>Experience:</strong> {experience || 'Not specified'}</p>
                          </div>
                          <div className="ft-details-column">
                            <p><strong>Profile Views:</strong> {typeof profileViews === 'number' ? profileViews : 0}</p>
                            <p>
                              <strong>Categories:</strong>{' '}
                              {categoryList.length > 0
                                ? categoryList.map((cat: Category) => cat.name).join(', ')
                                : 'Not specified'}
                            </p>
                          </div>
                        </div>
                        <div className="ft-footer">
                          <div className="ft-spacer"></div>
                          <Link to={`/users/${talent.id}`} className="ft-button ft-view">
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
            <div className="ft-pagination">
              {getVisiblePages().map((page, index) => (
                <button
                  key={index}
                  className={`ft-button ${page === filters.page ? 'ft-current' : ''} ${page === '...' ? 'ft-ellipsis' : ''}`}
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

export default FindTalent;