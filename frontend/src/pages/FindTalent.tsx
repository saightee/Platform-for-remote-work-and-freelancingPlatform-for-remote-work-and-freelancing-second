import { useState, useEffect, Fragment, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { searchTalents, searchJobseekers, getCategories, searchCategories } from '../services/api';
import { Profile, Category } from '@types';
import { FaUserCircle, FaFilter } from 'react-icons/fa';
import { AxiosError } from 'axios';
import Loader from '../components/Loader';
import '../styles/find-talent.css';

interface TalentResponse {
  total: number;
  data: Profile[];
}

const FindTalent: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('description') || '');
  const [filters, setFilters] = useState<{
    username: string;
    experience: string;
    rating?: number;
    page: number;
    limit: number;
    description?: string;
  }>({
    username: searchParams.get('username') || '',
    experience: '',
    rating: undefined,
    page: 1,
    limit: 10,
    description: searchParams.get('description') || '',
  });

  const flattenCats = (cats: Category[]): Category[] =>
    cats.flatMap(c => [c, ...(c.subcategories ? flattenCats(c.subcategories) : [])]);

  const norm = (s: string) => s.trim().toLowerCase();
  const [talents, setTalents] = useState<Profile[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchType, setSearchType] = useState<'talents' | 'jobseekers'>('talents');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const navigate = useNavigate();

  // ---- autocomplete state
  const [skillInput, setSkillInput] = useState('');
  const [filteredSkills, setFilteredSkills] = useState<Category[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // ВАЖНО: используем ID категории для поиска на бэке
  const [selectedSkillId, setSelectedSkillId] = useState<string>(searchParams.get('category_id') || '');

  const allCats = useMemo(() => flattenCats(categories), [categories]);

  // Автоподбор ID категорий из глобальной строки поиска
  const autoSkillIds = useMemo(() => {
    const q = norm(searchInput);
    if (!q || q.length < 2) return [];

    const exact = allCats.filter(c => norm(c.name) === q).map(c => c.id);
    if (exact.length) return Array.from(new Set(exact));

    const partial = allCats
      .filter(c => norm(c.name).includes(q))
      .slice(0, 3)
      .map(c => c.id);

    return Array.from(new Set(partial));
  }, [searchInput, allCats]);

  useEffect(() => {
    if (!selectedSkillId || !categories.length) return;
    const all = allCats;
    const cat = all.find(c => c.id === selectedSkillId);
    if (!cat) return;
    const parent = cat.parent_id ? all.find(c => c.id === cat.parent_id) : undefined;
    const label = parent ? `${parent.name} > ${cat.name}` : cat.name;
    setSkillInput(label);
  }, [selectedSkillId, allCats]);

  // грузим категории ОДИН РАЗ (для дерева/выпадашки)
  useEffect(() => {
    const loadCats = async () => {
      try {
        const data = await getCategories();
        const sorted = data.sort((a: Category, b: Category) => a.name.localeCompare(b.name));
        setCategories(sorted);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    loadCats();
  }, []);

  // Подгрузка талантов / соискателей
  const reqSeq = useRef(0);
  const firstRunRef = useRef(true);
  useEffect(() => {
    const seq = ++reqSeq.current;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const useAutoSkills = !selectedSkillId && autoSkillIds.length > 0;
        const effectiveDescription =
          (selectedSkillId || useAutoSkills) ? undefined : (filters.description || undefined);

        const response = await (searchType === 'talents'
          ? searchTalents({
              experience: filters.experience || undefined,
              rating: filters.rating,
              skills: selectedSkillId
                ? [selectedSkillId]
                : (useAutoSkills ? autoSkillIds : undefined),
              description: effectiveDescription,
              page: filters.page,
              limit: filters.limit,
            })
          : searchJobseekers({
              username: filters.username || undefined,
              page: filters.page,
              limit: filters.limit,
            }));

        let talentData: Profile[] = [];
        let totalCount = 0;

        if (response && typeof response === 'object' && 'total' in response && 'data' in response && Array.isArray((response as TalentResponse).data)) {
          const r = response as TalentResponse;
          talentData = r.data;
          totalCount = r.total;
        } else if (Array.isArray(response)) {
          talentData = response as Profile[];
          totalCount = (response as Profile[]).length;
        } else {
          console.error('Invalid response format:', response);
          if (seq !== reqSeq.current) return;
          setError('Invalid data format received from server. Please try again.');
          setTalents([]);
          setTotal(0);
          return;
        }

        if (seq !== reqSeq.current) return;
        setTalents(talentData);
        setTotal(totalCount);
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        console.error('Error fetching data:', axiosError);
        if (seq === reqSeq.current) {
          if (axiosError.response?.status === 401) {
            setError('Unauthorized access. Please log in again.');
            navigate('/login');
          } else {
            setError(axiosError.response?.data?.message || 'Failed to load talents. Please try again.');
          }
        }
      } finally {
        if (seq === reqSeq.current) setIsLoading(false);
      }
    };
    fetchData();
  }, [filters, searchType, selectedSkillId, autoSkillIds, navigate]);

  useEffect(() => {
    if (firstRunRef.current) { firstRunRef.current = false; return; }

    const t = setTimeout(() => {
      const useAutoSkills = !selectedSkillId && autoSkillIds.length > 0;
      setFilters(prev => ({
        ...prev,
        description: useAutoSkills || selectedSkillId ? undefined : searchInput,
        page: 1,
      }));
    }, 500);

    return () => clearTimeout(t);
  }, [searchInput, selectedSkillId, autoSkillIds]);

  // автокомплит категорий
  useEffect(() => {
    const searchCategoriesAsync = async () => {
      if (skillInput.trim() === '') {
        setFilteredSkills([]);
        setIsDropdownOpen(false);
        setSelectedSkillId('');
        return;
      }
      try {
        const response = await searchCategories(skillInput);
        const sorted = response.sort((a: Category, b: Category) => a.name.localeCompare(b.name));
        setFilteredSkills(sorted);
        setIsDropdownOpen(true);
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error('Error searching categories:', axiosError.response?.data?.message || axiosError.message);
        setFilteredSkills([]);
        setIsDropdownOpen(false);
      }
    };
    const d = setTimeout(searchCategoriesAsync, 300);
    return () => clearTimeout(d);
  }, [skillInput]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const useAutoSkills = !selectedSkillId && autoSkillIds.length > 0;

    setFilters(prev => ({
      ...prev,
      description: useAutoSkills || selectedSkillId ? undefined : searchInput,
      page: 1,
    }));

    const nextParams: Record<string, string> = {};
    if (selectedSkillId) {
      nextParams.category_id = selectedSkillId;
    } else if (useAutoSkills && autoSkillIds.length === 1) {
      nextParams.category_id = autoSkillIds[0];
    }
    if (!useAutoSkills && !selectedSkillId && searchInput.trim()) {
      nextParams.description = searchInput.trim();
    }

    setSearchParams(nextParams);
    setIsFilterPanelOpen(false);
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const toggleFilterPanel = () => setIsFilterPanelOpen((prev) => !prev);

  const truncateDescription = (description: string | undefined, maxLength: number) =>
    description && description.length > maxLength ? description.substring(0, maxLength) + '…' : (description || '');

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
      if (start > 2) pages.push('…');
    }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('…');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div>
      <Header />

      {/* overlay-лоадер в едином стиле */}
      <div className={`ftl-loading ${isLoading ? 'is-visible' : ''}`}>
        {isLoading && <Loader />}
      </div>

      <div className="ftl-shell">
        <div className="ftl-card">
          <div className="ftl-headbar">
            <h1 className="ftl-title">Find Talent</h1>

            <form className="ftl-search" onSubmit={handleSearch}>
  <input
    className="ftl-input"
    type="text"
    placeholder="Search by skills or keywords"
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
  />
  <button className="ftl-btn ftl-primary" type="submit">Search</button>

  {/* Кнопка Filters с иконкой и подписью (подпись видна на мобилке) */}
  <button
    className={`ftl-iconbtn ${isFilterPanelOpen ? 'is-active' : ''}`}
    type="button"
    onClick={toggleFilterPanel}
    aria-label="Toggle filters"
  >
    <FaFilter />
    <span className="ftl-iconbtn__label">Filters</span>
  </button>
</form>
          </div>

          {error && <div className="ftl-alert ftl-err">{error}</div>}

          <div className="ftl-content">
            {/* Filters */}
            <aside className={`ftl-filters ${isFilterPanelOpen ? 'is-open' : ''}`}>
              <h3 className="ftl-filters-title">Filters</h3>
              <form onSubmit={handleSearch} className="ftl-form">
                {searchType === 'jobseekers' && (
                  <div className="ftl-row">
                    <label className="ftl-label">Username</label>
                    <input
                      className="ftl-input"
                      type="text"
                      value={filters.username}
                      onChange={(e) => setFilters({ ...filters, username: e.target.value })}
                      placeholder="Enter username"
                    />
                  </div>
                )}

                <div className="ftl-row">
                  <label className="ftl-label">Experience</label>
                  <select
                    className="ftl-input"
                    value={filters.experience}
                    onChange={(e) => setFilters({ ...filters, experience: e.target.value, page: 1 })}
                  >
                    <option value="">All</option>
                    <option value="Less than 1 year">Less than 1 year</option>
                    <option value="1-2 years">1-2 years</option>
                    <option value="2-3 years">2-3 years</option>
                    <option value="3-6 years">3-6 years</option>
                    <option value="6+ years">6+ years</option>
                  </select>
                </div>

                <div className="ftl-row">
                  <label className="ftl-label">Minimum Rating</label>
                  <input
                    className="ftl-input"
                    type="number"
                    min="0"
                    max="5"
                    value={filters.rating ?? ''}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        rating: e.target.value ? Number(e.target.value) : undefined,
                        page: 1,
                      })
                    }
                    placeholder="Enter rating (0-5)"
                  />
                </div>

                <div className="ftl-row">
                  <label className="ftl-label">Category/Skill</label>
                  <div className="ftl-autocomplete">
                    <input
                      className="ftl-input"
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder="Type to search categories/skills..."
                      onFocus={() => setIsDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                    />
                    {isDropdownOpen && (skillInput.trim() ? filteredSkills.length > 0 : categories.length > 0) && (
                      <ul className="ftl-autocomplete-list">
                        {(skillInput.trim() ? filteredSkills : categories).map((cat) => (
                          <Fragment key={cat.id}>
                            <li
                              className="ftl-autocomplete-item"
                              onMouseDown={() => {
                                const displayName = cat.parent_id
                                  ? `${categories.find(c => c.id === cat.parent_id)?.name || ''} > ${cat.name}`
                                  : cat.name;
                                setSelectedSkillId(cat.id);
                                setSkillInput(displayName);
                                setIsDropdownOpen(false);
                                setFilters(prev => ({ ...prev, page: 1 }));
                              }}
                            >
                              {cat.parent_id
                                ? `${categories.find(c => c.id === cat.parent_id)?.name || ''} > ${cat.name}`
                                : cat.name}
                            </li>
                            {cat.subcategories?.map((sub) => (
                              <li
                                key={sub.id}
                                className="ftl-autocomplete-item ftl-sub"
                                onMouseDown={() => {
                                  setSelectedSkillId(sub.id);
                                  setSkillInput(`${cat.name} > ${sub.name}`);
                                  setIsDropdownOpen(false);
                                  setFilters(prev => ({ ...prev, page: 1 }));
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

                  {selectedSkillId && (
                    <div className="ftl-tags">
                      <span className="ftl-tag">
                        {skillInput || 'Selected category'}
                        <button
                          type="button"
                          className="ftl-tag-x"
                          onClick={() => {
                            setSelectedSkillId('');
                            setSkillInput('');
                            setFilters(prev => ({ ...prev, page: 1 }));
                          }}
                          aria-label="Remove category"
                          title="Remove"
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  )}
                </div>

                <button type="submit" className="ftl-btn ftl-primary" style={{ marginTop: 4 }}>
                  Apply Filters
                </button>
              </form>
            </aside>

            {/* Results */}
            <section className="ftl-results">
              {isLoading ? (
                <div className="ftl-results-loader"><Loader /></div>
              ) : error ? (
                <p className="ftl-error">{error}</p>
              ) : (
                <>
                  <div className="ftl-list">
                    {talents.length > 0 ? (
                      talents.map((talent) => {
                        const rating =
                          (talent as any).average_rating ?? (talent as any).averageRating ?? null;
                        const skills = Array.isArray((talent as any).skills) ? (talent as any).skills : [];
                        const experience = (talent as any).experience ?? null;
                        const description = (talent as any).description ?? null;
                        const profileViews =
                          (talent as any).profile_views ?? (talent as any).profileViews ?? 0;

                        return (
                          <article key={talent.id} className="ftl-card-item" role="article">
                      <div className={`ftl-avatar ${talent.avatar ? 'has-img' : ''}`}>
  {talent.avatar && (
    <img
      src={`https://jobforge.net/backend${talent.avatar}`}
      alt="Talent Avatar"
      className="ftl-avatar-img"
      onError={(e) => {
        // если картинка не загрузилась — показываемfallback
        const box = e.currentTarget.parentElement as HTMLElement | null;
        box?.classList.remove('has-img');
        e.currentTarget.style.display = 'none';
      }}
    />
  )}
  <FaUserCircle className="ftl-avatar-fallback" />
</div>

                            <div className="ftl-body">
                              <div className="ftl-row ftl-row-head">
                                <h3 className="ftl-name">{talent.username}</h3>
                                {typeof rating === 'number' && (
                                  <span className="ftl-stars" aria-label={`rating ${rating}/5`}>
                                    {Array.from({ length: 5 }, (_, i) => (
                                      <span
                                        key={i}
                                        className={i < Math.floor(rating) ? 'ftl-star is-on' : 'ftl-star'}
                                      >
                                        ★
                                      </span>
                                    ))}
                                  </span>
                                )}
                              </div>

                              <div className="ftl-cols">
                                <div className="ftl-col">
                                  <p className="ftl-line">
                                    <strong>Skills:</strong>{' '}
                                    {skills.length > 0 ? skills.map((s: Category) => s.name).join(', ') : 'Not specified'}
                                  </p>
                                  <p className="ftl-line">
                                    <strong>Experience:</strong> {experience || 'Not specified'}
                                  </p>
                                </div>
                                <div className="ftl-col">
                                  <p className="ftl-line">
                                    <strong>Profile Views:</strong>{' '}
                                    {typeof profileViews === 'number' ? profileViews : 0}
                                  </p>
                                  <p className="ftl-line">
                                    <strong>Description:</strong>{' '}
                                    {description ? truncateDescription(description, 120) : 'Not specified'}
                                  </p>
                                  <p className="ftl-line">
                                    <strong>Resume:</strong>{' '}
                                    {(talent as any).resume ? (
                                      <a
                                        href={(talent as any).resume.startsWith('http')
                                          ? (talent as any).resume
                                          : `https://jobforge.net/backend${(talent as any).resume}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        Download Resume
                                      </a>
                                    ) : 'Not provided'}
                                  </p>
                                </div>
                              </div>

                              <div className="ftl-foot">
                                <div className="ftl-spacer" />
                                <Link to={`/public-profile/${talent.id}`}>
                                  <button className="ftl-btn ftl-outline">View Profile</button>
                                </Link>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <p className="ftl-empty">No talents found.</p>
                    )}
                  </div>

                  {/* Pagination */}
                  {total > 0 && (
                    <div className="ftl-pagination" role="navigation" aria-label="Pagination">
                      {getVisiblePages().map((page, index) => (
                        <button
                          key={index}
                          className={`ftl-page ${page === filters.page ? 'is-current' : ''} ${page === '…' ? 'is-ellipsis' : ''}`}
                          onClick={() => typeof page === 'number' && handlePageChange(page)}
                          disabled={page === '…' || page === filters.page}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        className="ftl-page ftl-next"
                        onClick={() => handlePageChange(filters.page + 1)}
                        disabled={filters.page === totalPages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </div>

      <Footer />
      <Copyright />
    </div>
  );
};

export default FindTalent;
