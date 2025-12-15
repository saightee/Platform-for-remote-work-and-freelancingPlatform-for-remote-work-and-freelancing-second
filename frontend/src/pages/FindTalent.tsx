import { useState, useEffect, Fragment, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { UserCircle2, MapPin, Eye, Briefcase, Languages, Star } from 'lucide-react';
import { Search as SearchIcon } from 'lucide-react';
import {
  searchTalents,
  searchJobseekers,
  getCategories,
  searchCategories,
  getMyJobPosts,
  sendInvitation,
} from '../services/api';
import { Profile, Category, JobPost } from '@types';
import { FaUserCircle, FaFilter } from 'react-icons/fa';
import { AxiosError } from 'axios';
import Loader from '../components/Loader';
import '../styles/find-talent-v2.css';
import { Helmet } from 'react-helmet-async';
import { brand, brandBackendOrigin } from '../brand';
import { useRole } from '../context/RoleContext';
import { toast } from '../utils/toast';
import CountrySelect from '../components/inputs/CountrySelect';
import '../styles/country-langs.css';
import Pagination from '../components/Pagination.tsx';

function useDebouncedValue<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface TalentResponse {
  total: number;
  data: Profile[];
}

const calcAge = (dob?: string | null): number | null => {
  if (!dob) return null;
  const m = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const birth = new Date(year, month, day);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const mdiff = today.getMonth() - birth.getMonth();
  if (mdiff < 0 || (mdiff === 0 && today.getDate() < birth.getDate())) age--;

  if (age < 0 || age > 150) return null;
  return age;
};

const FindTalent: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('description') || '');
  const [langInput, setLangInput] = useState('');

  const addLang = (raw: string) => {
    const val = raw.trim().replace(/,$/, '');
    if (!val) return;
    setFilters((prev) => {
      const exists = prev.languages.some((l) => l.toLowerCase() === val.toLowerCase());
      return exists ? prev : { ...prev, languages: [...prev.languages, val], page: 1 };
    });
    setLangInput('');
  };

  const [filters, setFilters] = useState<{
    username: string;
    experience: string;
    rating?: number;
    expected_salary_min?: number;
    expected_salary_max?: number;
    expected_salary_type?: 'per month' | 'per day';
    job_search_status?: 'actively_looking' | 'open_to_offers' | 'hired';
    page: number;
    limit: number;
    description?: string;
    country: string;
    languages: string[];
    languages_mode: 'any' | 'all';
    has_resume?: boolean;
    preferred_job_types: ('Full-time' | 'Part-time' | 'Project-based')[];
  }>({
    username: searchParams.get('username') || '',
    experience: '',
    rating: undefined,
    expected_salary_min: searchParams.get('expected_salary_min')
      ? Number(searchParams.get('expected_salary_min'))
      : undefined,
    expected_salary_max: searchParams.get('expected_salary_max')
      ? Number(searchParams.get('expected_salary_max'))
      : undefined,
    expected_salary_type: ((): 'per month' | 'per day' | undefined => {
      const v = searchParams.get('expected_salary_type');
      return v === 'per month' || v === 'per day' ? v : undefined;
    })(),
    job_search_status: ((): any => {
      const v = searchParams.get('job_search_status');
      return v === 'actively_looking' || v === 'open_to_offers' || v === 'hired' ? v : undefined;
    })(),
    page: Number(searchParams.get('page') || '1'),
    limit: Number(searchParams.get('limit') || '25'),
    description: searchParams.get('description') || '',
    country: (() => {
      const single = (searchParams.get('country') || '').toUpperCase();
      const multi = searchParams.getAll('countries');
      if (multi.length) {
        const first = multi
          .join(',')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)[0];
        return (first || single).toUpperCase();
      }
      return single;
    })(),
    languages: ((): string[] => {
      const raw = searchParams.getAll('languages');
      if (raw.length) return raw.join(',').split(',').map((s) => s.trim()).filter(Boolean);
      const csv = searchParams.get('languages');
      return csv ? csv.split(',').map((s) => s.trim()).filter(Boolean) : [];
    })(),
    languages_mode: ((): 'any' | 'all' =>
      searchParams.get('languages_mode') === 'all' ? 'all' : 'any')(),
    has_resume: ((): boolean | undefined => {
      const v = searchParams.get('has_resume');
      return v === 'true' ? true : v === 'false' ? false : undefined;
    })(),
    preferred_job_types: ((): ('Full-time' | 'Part-time' | 'Project-based')[] => {
      const csv = searchParams.get('preferred_job_types');
      if (!csv) return [];
      const allowed = ['Full-time', 'Part-time', 'Project-based'] as const;
      return csv
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is 'Full-time' | 'Part-time' | 'Project-based' =>
          (allowed as readonly string[]).includes(s),
        );
    })(),
  });

  const flattenCats = (cats: Category[]): Category[] =>
    cats.flatMap((c) => [c, ...(c.subcategories ? flattenCats(c.subcategories) : [])]);

  const norm = (s: string) => s.trim().toLowerCase();
  const [talents, setTalents] = useState<Profile[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchType, setSearchType] = useState<'talents' | 'jobseekers'>('talents');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const navigate = useNavigate();
  const resultsRef = useRef<HTMLDivElement>(null);

  // Invite modal
  const { profile: currentUser } = useRole();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<Profile | null>(null);
  const [myActiveJobs, setMyActiveJobs] = useState<JobPost[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);

  const openInvite = async (talent: Profile) => {
    setInviteTarget(talent);
    setInviteOpen(true);
    setSelectedJobId('');
    setInviteMessage('');
    try {
      setLoadingJobs(true);
      const jobs = await getMyJobPosts();
      const active = (jobs || []).filter((j: any) => j.status === 'Active' && !j.pending_review);
      setMyActiveJobs(active);
    } catch (e) {
      console.error('getMyJobPosts error', e);
      setMyActiveJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  const closeInvite = () => {
    setInviteOpen(false);
    setInviteTarget(null);
  };

  const submitInvite = async () => {
    if (!inviteTarget || !selectedJobId) return;
    try {
      setSendingInvite(true);
      await sendInvitation({
        job_post_id: selectedJobId,
        job_seeker_id: String(inviteTarget.id),
        message: inviteMessage || undefined,
      });
      toast.success('Invitation sent');
      closeInvite();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to send invitation';
      toast.error(msg);
    } finally {
      setSendingInvite(false);
    }
  };

  // autocomplete
  const [skillInput, setSkillInput] = useState('');
  const [filteredSkills, setFilteredSkills] = useState<Category[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string>(
    searchParams.get('category_id') || '',
  );

  const allCats = useMemo(() => flattenCats(categories), [categories]);

  const autoSkillIds = useMemo(() => {
    const q = norm(searchInput);
    if (!q || q.length < 2) return [];

    const exact = allCats.filter((c) => norm(c.name) === q).map((c) => c.id);
    if (exact.length) return Array.from(new Set(exact));

    const partial = allCats
      .filter((c) => norm(c.name).includes(q))
      .slice(0, 3)
      .map((c) => c.id);

    return Array.from(new Set(partial));
  }, [searchInput, allCats]);

  const debouncedFilters = useDebouncedValue(filters, 400);
  const autoSkillsKey = useDebouncedValue(autoSkillIds.join(','), 400);

  function extractSkillNames(t: any): string[] {
    const out: string[] = [];
    const pushNames = (v: any) => {
      if (!v) return;
      if (Array.isArray(v)) {
        for (const x of v) {
          if (!x) continue;
          if (typeof x === 'string') out.push(x);
          else if (x?.name) out.push(x.name);
        }
      } else if (typeof v === 'string') {
        out.push(
          ...v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }
    };

    pushNames(t?.skills);
    pushNames(t?.skills_all);
    pushNames(t?.all_skills);
    pushNames(t?.skills_full);
    pushNames(t?.profile_skills);
    pushNames(t?.skills_text);

    if (Array.isArray(t?.categories)) {
      for (const c of t.categories) {
        if (c?.name) out.push(c.name);
        if (Array.isArray(c?.subcategories)) {
          for (const sub of c.subcategories) if (sub?.name) out.push(sub.name);
        }
      }
    }

    pushNames(t?.categories_all);
    pushNames(t?.profile_categories);
    pushNames(t?.skill_names);
    pushNames(t?.skill_list);

    return Array.from(new Set(out));
  }

  useEffect(() => {
    if (!selectedSkillId || !categories.length) return;
    const all = allCats;
    const cat = all.find((c) => c.id === selectedSkillId);
    if (!cat) return;
    const parent = cat.parent_id ? all.find((c) => c.id === cat.parent_id) : undefined;
    const label = parent ? `${parent.name} > ${cat.name}` : cat.name;
    setSkillInput(label);
  }, [selectedSkillId, allCats, categories]);

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

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 480);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const reqSeq = useRef(0);
  const firstRunRef = useRef(true);
  const skipAutoOnInitRef = useRef(true);

  useEffect(() => {
    const seq = ++reqSeq.current;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const autoIds = autoSkillsKey ? autoSkillsKey.split(',').filter(Boolean) : [];
        const useAutoSkills = !selectedSkillId && autoIds.length > 0;

        const effectiveDescription =
          selectedSkillId || useAutoSkills ? undefined : debouncedFilters.description || undefined;

        const countryCode = (debouncedFilters.country || '').toUpperCase();
        const geoParams: any = countryCode ? { country: countryCode } : {};

        const langs = (debouncedFilters.languages || []).map((s) => s.trim()).filter(Boolean);
        const langParams: any = {};
        if (langs.length) {
          langParams.languages = langs.join(',');
          langParams.languages_mode = debouncedFilters.languages_mode || 'any';
        }

        const resumeParam =
          typeof debouncedFilters.has_resume === 'boolean'
            ? { has_resume: debouncedFilters.has_resume }
            : {};

        const talentParams: any = {
          experience: debouncedFilters.experience || undefined,
          rating: debouncedFilters.rating,
          skills: selectedSkillId ? [selectedSkillId] : useAutoSkills ? autoIds : undefined,
          description: effectiveDescription,
          expected_salary_min: debouncedFilters.expected_salary_min,
          expected_salary_max: debouncedFilters.expected_salary_max,
          expected_salary_type: debouncedFilters.expected_salary_type,
          job_search_status: debouncedFilters.job_search_status,
          page: debouncedFilters.page,
          limit: debouncedFilters.limit,
          ...geoParams,
          ...langParams,
          ...resumeParam,
        };

        if (debouncedFilters.preferred_job_types && debouncedFilters.preferred_job_types.length) {
          talentParams.preferred_job_types = debouncedFilters.preferred_job_types;
        }

        const response =
          searchType === 'talents'
            ? await searchTalents(talentParams)
            : await searchJobseekers({
                username: debouncedFilters.username || undefined,
                page: debouncedFilters.page,
                limit: debouncedFilters.limit,
              });

        let talentData: Profile[] = [];
        let totalCount = 0;
        if (
          response &&
          typeof response === 'object' &&
          'total' in response &&
          'data' in response &&
          Array.isArray((response as any).data)
        ) {
          const r = response as TalentResponse;
          talentData = r.data;
          totalCount = r.total;
        } else if (Array.isArray(response)) {
          talentData = response as Profile[];
          totalCount = (response as Profile[]).length;
        } else {
          if (seq !== reqSeq.current) return;
          setError('Invalid data format received from server. Please try again.');
          setTalents([]);
          setTotal(0);
          return;
        }

        setTalents(talentData);
        setTotal(totalCount);
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        if (seq === reqSeq.current) {
          if (axiosError.response?.status === 401) {
            setError('Unauthorized access. Please log in again.');
            navigate('/login');
          } else {
            setError(
              axiosError.response?.data?.message || 'Failed to load talents. Please try again.',
            );
          }
        }
      } finally {
        if (seq === reqSeq.current) setIsLoading(false);
      }
    };
    fetchData();
  }, [debouncedFilters, searchType, autoSkillsKey, selectedSkillId, navigate]);

  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }

    if (skipAutoOnInitRef.current) {
      skipAutoOnInitRef.current = false;
      return;
    }

    const t = setTimeout(() => {
      if (selectedSkillId) return;

      const useAutoSkills = autoSkillIds.length > 0;
      const nextDesc = useAutoSkills ? undefined : searchInput || undefined;

      setFilters((prev) =>
        prev.description === nextDesc ? prev : { ...prev, description: nextDesc, page: 1 },
      );
    }, 400);

    return () => clearTimeout(t);
  }, [searchInput, selectedSkillId, autoSkillIds]);

  useEffect(() => {
    const p = Number(searchParams.get('page') || '1');
    const l = Number(searchParams.get('limit') || '25');
    setFilters((prev) =>
      prev.page === p && prev.limit === l ? prev : { ...prev, page: p, limit: l },
    );
  }, [searchParams]);

  useEffect(() => {
    if (isLoading) return;

    let r1 = 0,
      r2 = 0;
    const doScroll = () => {
      if (resultsRef.current) resultsRef.current.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
    };

    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(doScroll);
    });

    return () => {
      if (r1) cancelAnimationFrame(r1);
      if (r2) cancelAnimationFrame(r2);
    };
  }, [filters.page, total, isLoading]);

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
        console.error(
          'Error searching categories:',
          axiosError.response?.data?.message || axiosError.message,
        );
        setFilteredSkills([]);
        setIsDropdownOpen(false);
      }
    };
    const d = setTimeout(searchCategoriesAsync, 300);
    return () => clearTimeout(d);
  }, [skillInput]);

  const resetAll = () => {
    setFilters({
      username: '',
      experience: '',
      rating: undefined,
      expected_salary_min: undefined,
      expected_salary_max: undefined,
      expected_salary_type: undefined,
      job_search_status: undefined,
      page: 1,
      limit: 25,
      description: '',
      country: '',
      languages: [],
      languages_mode: 'any',
      has_resume: undefined,
      preferred_job_types: [],
    });
    setSearchInput('');
    setLangInput('');
    setSkillInput('');
    setSelectedSkillId('');
    setSearchParams({}, { replace: true });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const useAutoSkills = !selectedSkillId && autoSkillIds.length > 0;
    const nextDesc = useAutoSkills || selectedSkillId ? undefined : searchInput || undefined;

    setFilters((prev) =>
      prev.description === nextDesc && prev.page === 1
        ? prev
        : { ...prev, description: nextDesc, page: 1 },
    );

    const nextParams: Record<string, string> = {};
    if (selectedSkillId) nextParams.category_id = selectedSkillId;
    else if (useAutoSkills && autoSkillIds.length === 1) nextParams.category_id = autoSkillIds[0];
    if (!useAutoSkills && !selectedSkillId && searchInput.trim())
      nextParams.description = searchInput.trim();
    if (filters.expected_salary_min != null && !Number.isNaN(filters.expected_salary_min))
      nextParams.expected_salary_min = String(filters.expected_salary_min);
    if (filters.expected_salary_max != null && !Number.isNaN(filters.expected_salary_max))
      nextParams.expected_salary_max = String(filters.expected_salary_max);
    if (filters.expected_salary_type) nextParams.expected_salary_type = filters.expected_salary_type;
    if (filters.job_search_status) nextParams.job_search_status = filters.job_search_status;

    if (filters.country) nextParams.country = filters.country.toUpperCase();

    if (filters.languages.length) {
      nextParams.languages = filters.languages.join(',');
      if (filters.languages_mode) nextParams.languages_mode = filters.languages_mode;
    }

    if (typeof filters.has_resume === 'boolean') {
      nextParams.has_resume = String(filters.has_resume);
    }

    if (filters.preferred_job_types.length) {
      nextParams.preferred_job_types = filters.preferred_job_types.join(',');
    }

    nextParams.page = '1';
    nextParams.limit = String(filters.limit || 25);

    setSearchParams(nextParams, { replace: true });
  };

  const handlePageChange = (newPage: number) => {
    resultsRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setFilters((prev) => (prev.page === newPage ? prev : { ...prev, page: newPage }));

    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    params.set('limit', String(filters.limit || 25));
    setSearchParams(params, { replace: true });
  };

  const toggleFilterPanel = () => setIsFilterPanelOpen((prev) => !prev);

  const totalPages = Math.ceil(total / filters.limit) || 1;

  return (
    <div className="talv-root">
      <Helmet>
        <title>Hire Remote Talent | {brand.name}</title>
        <meta
          name="description"
          content="Post a job and reach vetted remote talent worldwide."
        />
        <link rel="canonical" href={`https://${brand.domain}/find-talent`} />
      </Helmet>

      <Header />

      <div className={`talv-loading ${isLoading ? 'talv-loading--visible' : ''}`}>
        {isLoading && <Loader />}
      </div>

      <div className="talv-shell">
        <div className="talv-card">
          <div className="talv-header">
            <h1 className="talv-title">Find Talent</h1>

            <form className="talv-search" onSubmit={handleSearch}>
              <div className="talv-search-count">
                {isLoading ? 'Loading…' : `${total} talents found`}
              </div>
        <div className="talv-searchbar-wrap">
  <SearchIcon className="talv-searchbar-icon" aria-hidden="true" />
  <input
    className="talv-input talv-input--search talv-searchbar"
    type="text"
    placeholder="Search by skills, keywords, or location..."
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
  />
</div>
              <button className="talv-button talv-button-primary" type="submit">
                Search
              </button>
              <button
                className={`talv-filters-toggle ${
                  isFilterPanelOpen ? 'talv-filters-toggle--active' : ''
                }`}
                type="button"
                onClick={toggleFilterPanel}
                aria-label="Toggle filters"
                title="Filters"
              >
                <FaFilter />
                <span className="talv-filters-toggle-label">Filters</span>
              </button>
            </form>
          </div>

          {error && <div className="talv-alert talv-alert-error">{error}</div>}

          <div className="talv-layout">
            {/* FILTERS */}
            <aside
              className={`talv-filters ${isFilterPanelOpen ? 'talv-filters--open' : ''}`}
            >
              <div className="talv-filters-header">
                <h3 className="talv-filters-title">Filters</h3>
             
              </div>

              <form onSubmit={handleSearch} className="talv-filters-form">
                {searchType === 'jobseekers' && (
                  <div className="talv-field">
                    <label className="talv-label">Username</label>
                    <input
                      className="talv-input"
                      type="text"
                      value={filters.username}
                      onChange={(e) =>
                        setFilters({ ...filters, username: e.target.value })
                      }
                      placeholder="Enter username"
                    />
                  </div>
                )}

                <div className="talv-field">
                  <label className="talv-label">Experience</label>
                  <select
                    className="talv-input"
                    value={filters.experience}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        experience: e.target.value,
                        page: 1,
                      })
                    }
                  >
                    <option value="">All</option>
                    <option value="No experience yet">No experience yet</option>
                    <option value="Less than 1 year">Less than 1 year</option>
                    <option value="1-2 years">1-2 years</option>
                    <option value="2-3 years">2-3 years</option>
                    <option value="3-6 years">3-6 years</option>
                    <option value="6+ years">6+ years</option>
                  </select>
                </div>

                <div className="talv-field">
                  <CountrySelect
                    label="Country"
                    placeholder="Start typing a country..."
                    value={filters.country}
                    onChange={(code) =>
                      setFilters((prev) => ({
                        ...prev,
                        country: code || '',
                        page: 1,
                      }))
                    }
                  />
                </div>

                <div className="talv-field">
                  <label className="talv-label">Languages</label>
                  <div className="talv-tags">
                    {filters.languages.map((l, i) => (
                      <span className="talv-tag" key={i}>
                        {l}
                        <button
                          type="button"
                          className="talv-tag-remove"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              languages: prev.languages.filter(
                                (_, idx) => idx !== i,
                              ),
                              page: 1,
                            }))
                          }
                          aria-label="Remove language"
                          title="Remove"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      className="talv-input talv-input--tag"
                      type="text"
                      placeholder="Type a language, press Enter"
                      value={langInput}
                      onChange={(e) => setLangInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addLang(langInput);
                        }
                      }}
                      onBlur={() => addLang(langInput)}
                    />
                  </div>
                </div>

                <div className="talv-field">
                  <label className="talv-label">Languages match</label>
                  <select
                    className="talv-input"
                    value={filters.languages_mode}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        languages_mode:
                          e.target.value === 'all' ? 'all' : 'any',
                        page: 1,
                      }))
                    }
                  >
                    <option value="any">any (default)</option>
                    <option value="all">all</option>
                  </select>
                </div>

         

                <div className="talv-field">
                  <label className="talv-label">Minimum Rating</label>
                  <input
                    className="talv-input"
                    type="number"
                    min="0"
                    max="5"
                    value={filters.rating ?? ''}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        rating: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                        page: 1,
                      })
                    }
                    placeholder="Enter rating (0-5)"
                  />
                </div>

                <div className="talv-field">
                  <label className="talv-label">Job status</label>
                  <select
                    className="talv-input"
                    value={filters.job_search_status ?? ''}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        job_search_status: (e.target.value ||
                          undefined) as any,
                        page: 1,
                      })
                    }
                  >
                    <option value="">All</option>
                    <option value="actively_looking">Actively looking</option>
                    <option value="open_to_offers">Open to offers</option>
                    <option value="hired">Hired</option>
                  </select>
                </div>

                <div className="talv-field">
                  <label className="talv-label">Salary From</label>
                  <input
                    className="talv-input"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 3000"
                    value={filters.expected_salary_min ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFilters((prev) => ({
                        ...prev,
                        expected_salary_min:
                          v === '' ? undefined : Number(v),
                        page: 1,
                      }));
                    }}
                  />
                </div>

                <div className="talv-field">
                  <label className="talv-label">Salary To</label>
                  <input
                    className="talv-input"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 5000"
                    value={filters.expected_salary_max ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFilters((prev) => ({
                        ...prev,
                        expected_salary_max:
                          v === '' ? undefined : Number(v),
                        page: 1,
                      }));
                    }}
                  />
                </div>

                <div className="talv-field">
                  <label className="talv-label">Salary Type</label>
                  <select
                    className="talv-input"
                    value={filters.expected_salary_type || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        expected_salary_type: (e.target.value ||
                          undefined) as 'per month' | 'per day' | undefined,
                        page: 1,
                      }))
                    }
                  >
                    <option value="">Any</option>
                    <option value="per month">per month</option>
                    <option value="per day">per day</option>
                  </select>
                </div>

                         <div className="talv-field">
                  <label className="talv-label">Category/Skill</label>
                  <div className="talv-skill-autocomplete">
                    <input
                      className="talv-input"
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder="Search skills or categories"
                      onFocus={() => setIsDropdownOpen(true)}
                      onBlur={() =>
                        setTimeout(() => setIsDropdownOpen(false), 200)
                      }
                    />
                    {isDropdownOpen &&
                      (skillInput.trim()
                        ? filteredSkills.length > 0
                        : categories.length > 0) && (
                        <ul className="talv-skill-list">
                          {(skillInput.trim()
                            ? filteredSkills
                            : categories
                          ).map((cat) => (
                            <Fragment key={cat.id}>
                              <li
                                className="talv-skill-item"
                                onMouseDown={() => {
                                  const displayName = cat.parent_id
                                    ? `${
                                        categories.find(
                                          (c) => c.id === cat.parent_id,
                                        )?.name || ''
                                      } > ${cat.name}`
                                    : cat.name;
                                  setSelectedSkillId(cat.id);
                                  setSkillInput(displayName);
                                  setIsDropdownOpen(false);
                                  setFilters((prev) => ({
                                    ...prev,
                                    description: undefined,
                                    page: 1,
                                  }));
                                }}
                              >
                                {cat.parent_id
                                  ? `${
                                      categories.find(
                                        (c) => c.id === cat.parent_id,
                                      )?.name || ''
                                    } > ${cat.name}`
                                  : cat.name}
                              </li>
                              {cat.subcategories?.map((sub) => (
                                <li
                                  key={sub.id}
                                  className="talv-skill-item talv-skill-item--nested"
                                  onMouseDown={() => {
                                    setSelectedSkillId(sub.id);
                                    setSkillInput(
                                      `${cat.name} > ${sub.name}`,
                                    );
                                    setIsDropdownOpen(false);
                                    setFilters((prev) => ({
                                      ...prev,
                                      description: undefined,
                                      page: 1,
                                    }));
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

       <div className="talv-field talv-field--inline">
                  <label className="talv-label" htmlFor="talv-has-resume">
                    Has resume
                  </label>
                  <input
                    id="talv-has-resume"
                    type="checkbox"
                    checked={!!filters.has_resume}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        has_resume: e.target.checked ? true : undefined,
                        page: 1,
                      }))
                    }
                  />
                </div>
                <div className="talv-field">
                  <label className="talv-label">Preferred Job Type</label>
                  <div className="talv-checkbox-group">
                    {(['Full-time', 'Part-time', 'Project-based'] as const).map(
                      (jt) => {
                        const list = filters.preferred_job_types || [];
                        const checked = list.includes(jt);
                        return (
                          <label
                            key={jt}
                            className="talv-checkbox-label"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setFilters((prev) => {
                                  const prevList =
                                    prev.preferred_job_types || [];
                                  let next: (
                                    | 'Full-time'
                                    | 'Part-time'
                                    | 'Project-based'
                                  )[];
                                  if (e.target.checked) {
                                    next = prevList.includes(jt)
                                      ? prevList
                                      : [...prevList, jt];
                                  } else {
                                    next = prevList.filter(
                                      (x) => x !== jt,
                                    );
                                  }
                                  return {
                                    ...prev,
                                    preferred_job_types: next,
                                    page: 1,
                                  };
                                });
                              }}
                            />
                            <span>{jt}</span>
                          </label>
                        );
                      },
                    )}
                  </div>
                </div>
                

       

                  {selectedSkillId && (
                    <div className="talv-tags" style={{ marginTop: 6 }}>
                      <span className="talv-tag">
                        {skillInput || 'Selected category'}
                        <button
                          type="button"
                          className="talv-tag-remove"
                          onClick={() => {
                            setSelectedSkillId('');
                            setSkillInput('');
                            setFilters((prev) => ({
                              ...prev,
                              description: searchInput || undefined,
                              page: 1,
                            }));
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

                <button
                  type="submit"
                  className="talv-button talv-button-primary talv-filters-submit"
                >
                  Apply Filters
                </button>
                   <button
                  type="button"
                  className="talv-button talv-button-link"
                  onClick={resetAll}
                >
                  Reset Filters
                </button>
              </form>
            </aside>

            {/* RESULTS */}
            <section className="talv-results" ref={resultsRef}>
              {isLoading ? (
                <div className="talv-results-loader">
                  <Loader />
                </div>
              ) : error ? (
                <p className="talv-error">{error}</p>
              ) : (
                <>
                  <div className="talv-cards" key={filters.page}>
                    {talents.length > 0 ? (
                      talents.map((talent) => {
                        const rating =
                          (talent as any).average_rating ??
                          (talent as any).averageRating ??
                          null;
                        const skillNames = extractSkillNames(talent);
                        const experience = (talent as any).experience ?? null;
                        const profileViews =
                          (talent as any).profile_views ??
                          (talent as any).profileViews ??
                          0;

                        const jobStatus = (talent as any).job_search_status;
                        let statusLabel: string | null = null;
                        let statusClass = '';
                        if (jobStatus === 'actively_looking') {
                          statusLabel = 'Actively looking';
                          statusClass = 'talv-status-pill--looking';
                        } else if (jobStatus === 'hired') {
                          statusLabel = 'Hired';
                          statusClass = 'talv-status-pill--hired';
                        } else if (jobStatus === 'open_to_offers') {
                          statusLabel = 'Open to offers';
                        }

                        const preferredJobTypes: string[] = Array.isArray(
                          (talent as any).preferred_job_types,
                        )
                          ? (talent as any).preferred_job_types
                          : [];

                        const jobTitle =
                          (talent as any).headline ||
                          (talent as any).job_title ||
                          (talent as any).title ||
                          '';

                        // salary text (как раньше, только в одну строчку)
                        const salaryText = (() => {
                          const tAny: any = talent;
                          const min = tAny.expected_salary;
                          const max = tAny.expected_salary_max;
                          const type = tAny.expected_salary_type;
                          const hasMin =
                            min != null && min !== '' && Number(min) !== 0;
                          const hasMax =
                            max != null && max !== '' && Number(max) !== 0;
                          if (!hasMin && !hasMax) return '';
                          const currency = tAny.currency || '';
                          const minNum = hasMin ? Number(min) : null;
                          const maxNum = hasMax ? Number(max) : null;
                          let base = '';
                          if (hasMin && hasMax) base = `${minNum} - ${maxNum}`;
                          else if (hasMin) base = String(minNum);
                          else if (hasMax) base = String(maxNum);
                          if (currency) base = `${base} ${currency}`;
                          if (type === 'per month' || type === 'per day') {
                            base = `${base} ${type}`;
                          }
                          return base;
                        })();

                        const languages =
                          Array.isArray((talent as any).languages) &&
                          (talent as any).languages.length > 0
                            ? (talent as any).languages.join(', ')
                            : '';

                        return (
                          <article
                            key={talent.id}
                            className="talv-card-item"
                            role="article"
                          >
                            <div className="talv-card-body">
  {/* HEADER */}
  <div className="talv-card-header">
    <div className="talv-card-header-main">
      <div className="talv-avatar">
        {talent.avatar &&
          (() => {
            const a = talent.avatar || '';
            const avatarSrc = a.startsWith('http')
              ? a
              : `${brandBackendOrigin()}${a}`;
            return (
              <img
                src={avatarSrc}
                alt="Talent Avatar"
                className="talv-avatar-image"
                onError={(e) => {
                  const box = e.currentTarget.parentElement as HTMLElement | null;
                  box?.classList.remove('talv-avatar--has-image');
                  e.currentTarget.style.display = 'none';
                }}
              />
            );
          })()}

        {!talent.avatar && (
          <UserCircle2 className="talv-avatar-fallback" />
        )}
      </div>

      <div className="talv-header-text">
        <h3 className="talv-name">{talent.username}</h3>

        {jobTitle && <p className="talv-subtitle">{jobTitle}</p>}

        {typeof rating === 'number' && (
          <span className="talv-stars" aria-label={`rating ${rating}/5`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`talv-star-icon ${
                  i < Math.floor(rating) ? 'talv-star-icon--on' : ''
                }`}
                aria-hidden="true"
              />
            ))}
          </span>
        )}
      </div>
    </div>

    <div className="talv-header-badges">
      {statusLabel && (
        <span className={`talv-status-pill ${statusClass}`}>
          {statusLabel}
        </span>
      )}

      {preferredJobTypes.map((jt) => (
        <span key={jt} className="talv-jobtype-pill">
          {jt}
        </span>
      ))}
    </div>
  </div>

  {/* SKILLS */}
  <div className="talv-skill-row">
    {skillNames.length > 0 ? (
      skillNames.slice(0, 8).map((s) => (
        <span key={s} className="talv-skill-pill">
          {s}
        </span>
      ))
    ) : (
      <span className="talv-skill-pill">Not specified</span>
    )}
  </div>

  {/* META ROW */}
  <div className="talv-meta-row">
    {(talent as any).country && (
      <div className="talv-meta-item">
        <MapPin className="talv-meta-icon" />
        <span>{(talent as any).country}</span>
      </div>
    )}

    {salaryText && (
      <div className="talv-meta-item">
        <span className="talv-meta-bold">{salaryText}</span>
      </div>
    )}

    <div className="talv-meta-item">
      <Eye className="talv-meta-icon" />
      <span>{typeof profileViews === 'number' ? profileViews : 0} views</span>
    </div>

    {experience && (
      <div className="talv-meta-item">
        <Briefcase className="talv-meta-icon" />
        <span>{experience}</span>
      </div>
    )}
  </div>

  {/* LANGUAGES */}
  {languages && (
    <div className="talv-lang-row">
      <Languages className="talv-lang-icon" />
      <span>{languages}</span>
    </div>
  )}

  {/* AGE (если нужен) */}
  {(() => {
    const age = calcAge((talent as any).date_of_birth || null);
    if (age == null) return null;
    return (
      <div className="talv-lang-row">
        <span className="talv-lang-label">Age</span>
        <span>{age}</span>
      </div>
    );
  })()}

  {/* FOOTER BUTTONS */}
  <div className="talv-card-footer">
    <div className="talv-card-footer-spacer" />

    {currentUser?.role === 'employer' && currentUser.id !== talent.id && (
      <button
        type="button"
        className="talv-button talv-button-primary"
        onClick={() => openInvite(talent)}
        title="Invite to job"
      >
        Invite to interview
      </button>
    )}

    <Link to={`/public-profile/${talent.slug_id ?? talent.id}`}>
      <button className="talv-button talv-button-outline">
        View Profile
      </button>
    </Link>
  </div>
</div>
                          </article>
                        );
                      })
                    ) : (
                      <p className="talv-empty">
                        No talents found. Try adjusting filters.
                      </p>
                    )}
                  </div>

                  {total > 0 && (
                    <Pagination
                      currentPage={filters.page}
                      totalPages={totalPages}
                      totalItems={total}
                      onPageChange={handlePageChange}
                      isMobile={isMobile}
                    />
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* INVITE MODAL */}
      {inviteOpen && (
        <div className="talv-modal-backdrop" onClick={closeInvite}>
          <div
            className="talv-modal-card talv-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="talv-modal-title"
          >
            <div className="talv-modal-header">
              <h3 id="talv-modal-title" className="talv-modal-title">
                Select Job to invite
              </h3>
              <button
                className="talv-modal-close"
                onClick={closeInvite}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="talv-modal-body">
              <div className="talv-modal-row">
                <label className="talv-modal-label">Candidate</label>
                <div className="talv-modal-value">
                  {inviteTarget?.username}
                </div>
              </div>

              <div className="talv-modal-row">
                <label
                  className="talv-modal-label"
                  htmlFor="talv-modal-job"
                >
                  Job Post
                </label>
                {loadingJobs ? (
                  <div className="talv-modal-note">
                    Loading your active jobs…
                  </div>
                ) : myActiveJobs.length ? (
                  <select
                    id="talv-modal-job"
                    className="talv-modal-input"
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                  >
                    <option value="" disabled>
                      Select a job post
                    </option>
                    {myActiveJobs.map((j) => (
                      <option key={j.id} value={String(j.id)}>
                        {j.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="talv-modal-note">
                    You have no active jobs available.
                  </div>
                )}
              </div>

              <div className="talv-modal-row">
                <label
                  className="talv-modal-label"
                  htmlFor="talv-modal-msg"
                >
                  Message to candidate{' '}
                  <span className="talv-modal-optional">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="talv-modal-msg"
                  className="talv-modal-textarea"
                  rows={4}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="We think you’re a great fit for this role…"
                />
              </div>
            </div>

            <div className="talv-modal-footer">
              <button
                className="talv-modal-button talv-modal-button-secondary"
                type="button"
                onClick={closeInvite}
              >
                Cancel
              </button>
              <button
                className="talv-modal-button talv-modal-button-primary"
                type="button"
                onClick={submitInvite}
                disabled={!selectedJobId || sendingInvite}
              >
                {sendingInvite ? 'Sending…' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
   
    </div>
  );
};

export default FindTalent;
