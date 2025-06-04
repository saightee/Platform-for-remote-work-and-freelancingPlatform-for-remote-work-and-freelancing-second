import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { searchTalents, getCategories } from '../services/api';
import { Profile, Category } from '@types';
import { FaUserCircle } from 'react-icons/fa';

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
  const navigate = useNavigate();

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
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <Header />
      <div className="container find-job-container">
        <h2>Find Talent</h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by skills or keywords"
            value={filters.skills}
            onChange={(e) => setFilters({ ...filters, skills: e.target.value })}
          />
          <button onClick={handleSearch}>Search</button>
        </div>
        <div className="find-job-content">
          <div className="find-job-filters">
            <h3>Filters</h3>
            <form onSubmit={handleSearch} className="search-form">
              <div className="form-group">
                <label>Skills:</label>
                <input
                  type="text"
                  value={filters.skills}
                  onChange={(e) => setFilters({ ...filters, skills: e.target.value })}
                  placeholder="Enter skills (e.g., JavaScript, Python)"
                />
              </div>
              <div className="form-group">
                <label>Experience:</label>
                <input
                  type="text"
                  value={filters.experience}
                  onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
                  placeholder="Enter experience (e.g., 3 years)"
                />
              </div>
              <div className="form-group">
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
              <div className="form-group">
                <label>Timezone:</label>
                <input
                  type="text"
                  value={filters.timezone}
                  onChange={(e) => setFilters({ ...filters, timezone: e.target.value })}
                  placeholder="Enter timezone (e.g., America/New_York)"
                />
              </div>
              <div className="form-group">
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
              <button type="submit" className="action-button">Apply Filters</button>
            </form>
          </div>
          <div className="find-job-results">
            <div className="job-grid">
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
                    <div key={talent.id} className="job-card">
                      <div className="job-card-avatar">
                        {talent.avatar ? (
                          <img src={`https://jobforge.net/backend${talent.avatar}`} alt="Talent Avatar" />
                        ) : (
                          <FaUserCircle className="profile-avatar-icon" />
                        )}
                      </div>
                      <div className="job-card-content">
                        <div className="job-title-row">
                          <h3>{talent.username}</h3>
                          <span className="job-type">
                            {typeof rating === 'number' ? `${rating} ★` : 'No rating'}
                          </span>
                        </div>
                        <p><strong>Skills:</strong> {skills.length > 0 ? skills.join(', ') : 'Not specified'}</p>
                        <p><strong>Experience:</strong> {experience || 'Not specified'}</p>
                        <p>
                          <strong>Categories:</strong>{' '}
                          {categoryList.length > 0
                            ? categoryList.map((cat: Category) => cat.name).join(', ')
                            : 'Not specified'}
                        </p>
                        <p><strong>Profile Views:</strong> {typeof profileViews === 'number' ? profileViews : 0}</p>
                        <div className="job-card-footer">
                          <Link to={`/users/${talent.id}`} className="view-details-button">
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
            <div className="pagination">
              <button
                disabled={filters.page === 1}
                onClick={() => handlePageChange(filters.page - 1)}
              >
                Previous
              </button>
              <span>Page {filters.page}</span>
              <button
                disabled={talents.length < filters.limit}
                onClick={() => handlePageChange(filters.page + 1)}
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

export default FindTalent;