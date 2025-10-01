// src/pages/PostJob.tsx
import { useState, useEffect, FormEvent, useRef } from 'react';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { createJobPost, getCategories, searchCategories, generateDescription, getMyJobPosts, getJobPost   } from '../services/api';
import { Category, JobPost, SalaryType } from '@types';
import { useRole } from '../context/RoleContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Loader from '../components/Loader';
import {
  FaBriefcase, FaMapMarkerAlt, FaMoneyBillWave, FaListUl,
  FaBolt, FaRedo, FaSearch, FaTimes, FaLightbulb, FaInfoCircle, FaHistory, FaTimesCircle
} from 'react-icons/fa';
import '../styles/post-job.css';

// маленькая универсальная иконка-подсказка
const InfoTip: React.FC<{ tip: string }> = ({ tip }) => (
  <span className="pjx-tip" data-tip={tip} tabIndex={0} aria-label={tip}>
    <FaInfoCircle />
  </span>
);

const PostJob: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const embedded = location.pathname.startsWith('/employer-dashboard');
  const { profile } = useRole();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [filteredSkills, setFilteredSkills] = useState<Category[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [salaryType, setSalaryType] = useState<SalaryType>('per hour');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationMode, setLocationMode] = useState('');
  const [jobType, setJobType] = useState<JobPost['job_type'] | undefined>(undefined);
  const [aiBrief, setAiBrief] = useState('');
  const [isEdited, setIsEdited] = useState(false);
  const [prevSelectedId, setPrevSelectedId] = useState<string | null>(null);
  const [requestTimes, setRequestTimes] = useState<number[]>([]);
  const [prevJobs, setPrevJobs] = useState<{ id: string; title: string; created_at: string }[]>([]);
const [prevOpen, setPrevOpen] = useState(false);
const [prevQuery, setPrevQuery] = useState('');
  // src/pages/PostJob.tsx
  const [salary, setSalary] = useState<number | null>(null);
  // --- changed: support multiple categories ---
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // helper: flatten categories for quick lookup
  const flattenCategories = (cats: Category[]): Category[] =>
    cats.flatMap((c) => [c, ...(c.subcategories ? flattenCategories(c.subcategories) : [])]);

  const allFlattened = () => {
    // merge tree categories + filtered (из поиска), чтобы показывать корректные ярлыки
    const base = flattenCategories(categories);
    const extra = filteredSkills.filter(
      x => !base.some(b => String(b.id) === String(x.id))
    );
    return base.concat(extra);
  };

  // helper: add/remove
  const addCategoryId = (id: string) => {
    setSelectedCategoryIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    // clear the input so employer can pick the next category right away
    setSkillInput('');
    setIsDropdownOpen(false);
  };

  const removeCategoryId = (id: string) => {
    setSelectedCategoryIds((prev) => prev.filter((x) => x !== id));
  };


  // исключения по странам
  const [excludedCountries, setExcludedCountries] = useState<string[]>([]);
  const [countryInput, setCountryInput] = useState('');
  const [filteredCountries, setFilteredCountries] = useState<string[]>([]);

  const allCountries = [
    "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria",
    "Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan",
    "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
    "Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo, Democratic Republic of the","Congo, Republic of the",
    "Costa Rica","Cote d'Ivoire","Croatia","Cuba","Cyprus","Czechia","Denmark","Djibouti","Dominica","Dominican Republic",
    "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland",
    "France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea",
    "Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq",
    "Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo",
    "Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania",
    "Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius",
    "Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia",
    "Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway",
    "Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland",
    "Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
    "Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands",
    "Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland",
    "Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia",
    "Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States of America","Uruguay","Uzbekistan",
    "Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
  ];

  useEffect(() => {
    if (countryInput.trim()) {
      const filtered = allCountries
        .filter((c) => c.toLowerCase().includes(countryInput.toLowerCase()) && !excludedCountries.includes(c));
      setFilteredCountries(filtered);
    } else {
      setFilteredCountries([]);
    }
  }, [countryInput, excludedCountries]);

  const addCountry = (c: string) => {
    if (!excludedCountries.includes(c)) setExcludedCountries([...excludedCountries, c]);
    setCountryInput('');
    setFilteredCountries([]);
  };
  const removeCountry = (c: string) => setExcludedCountries(excludedCountries.filter((x) => x !== c));

  const quillRef = useRef<any>(null);

  const handleGenerate = async (isRegenerate = false) => {
    if (!aiBrief.trim()) {
      setError('Brief description is required for generation.');
      return;
    }
    // rate limit: 5/min
    const now = Date.now() / 1000;
    const recent = requestTimes.filter((t) => now - t < 60);
    if (recent.length >= 5) {
      setError('Rate limit exceeded: 5 generations per minute.');
      return;
    }
    setRequestTimes([...recent, now]);

    try {
      setError(null);
      setIsGenerating(true);
      const res = await generateDescription({
        aiBrief,
        title,
        location: locationMode,
        salary: salary !== null ? salary : undefined,
        salary_type: salaryType,
        job_type: jobType ?? undefined,
      });
      const html = typeof res === 'string' ? res : res.description || '';
      if (quillRef.current) {
        const editor = quillRef.current.getEditor();
        editor.setContents(editor.clipboard.convert(html));
      }
      setDescription(html);
      setIsEdited(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate description.');
    } finally {
      setIsGenerating(false);
    }
  };

  // +++ Подставить данные из выбранной прошлой вакансии
const fillFromPrevious = async (jobId: string) => {
  try {
    const j = await getJobPost(jobId);

    // === подстановка полей из выбранной вакансии ===
    setTitle(j.title || '');
    setLocationMode(j.location || '');
    setSalaryType((j.salary_type as SalaryType) ?? 'per hour');
    setSalary(j.salary_type === 'negotiable' ? null : (j.salary ?? null));
    setJobType(j.job_type ?? undefined);

    // категории
    const ids = (j as any).category_ids ?? (j.category_id ? [String(j.category_id)] : []);
    setSelectedCategoryIds(ids.map(String));

    // исключённые страны
    setExcludedCountries(j.excluded_locations ?? []);

    // описание в редактор (и в стейт)
    const html = j.description || '';
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      editor.setContents(editor.clipboard.convert(html));
    }
    setDescription(html);

    // вспомогательные флаги
    setIsEdited(true);
    setPrevSelectedId(jobId);               // запомнили выбор
  } catch (e) {
    console.error('fillFromPrevious error', e);
    setError('Failed to load selected job.');
  } finally {
    setPrevOpen(false);
    setPrevQuery('');
  }
};
const clearPrevSelection = () => {
  setPrevSelectedId(null);
  setPrevQuery('');
  setPrevOpen(false);

  // очищаем ВСЕ вставленные поля формы
  setTitle('');
  setLocationMode('');
  setSalaryType('per hour');
  setSalary(null);
  setJobType(undefined);
  setSelectedCategoryIds([]);
  setExcludedCountries([]);
  setSkillInput('');        // строка поиска категорий
  setCountryInput('');      // строка поиска стран
  setFilteredSkills([]);
  setFilteredCountries([]);

  // описание и редактор
  setDescription('');
  if (quillRef.current) {
    const editor = quillRef.current.getEditor();
    editor.setContents(editor.clipboard.convert(''));
  }

  // сбрасываем AI brief и флаги редактирования (по желанию)
  setAiBrief('');
  setIsEdited(false);
};

  useEffect(() => {
    if (salaryType === 'negotiable') setSalary(null);
  }, [salaryType]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const data = await getCategories();
        const sortCats = (cats: Category[]): Category[] => {
          const sorted = cats.sort((a, b) => a.name.localeCompare(b.name));
          sorted.forEach((c) => { if (c.subcategories) c.subcategories = sortCats(c.subcategories); });
          return sorted;
        };
        setCategories(sortCats(data));
      } catch (err: any) {
        console.error('Error fetching categories:', err);
        setError(err.response?.data?.message || 'Failed to load categories.');
      } finally {
        setIsLoading(false);
      }
    };
    if (profile?.role === 'employer') fetchCategories();
    else setIsLoading(false);
  }, [profile]);

 
useEffect(() => {
  if (profile?.role !== 'employer') return;
  (async () => {
    try {
      const rows = await getMyJobPosts();
      const mapped = rows.map((j: any) => ({
        id: String(j.id),
        title: j.title,
        created_at: j.created_at,
      }));
      setPrevJobs(mapped.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
    } catch (e) {
      console.warn('getMyJobPosts failed', e);
    }
  })();
}, [profile]);


  useEffect(() => {
    const search = async () => {
      if (skillInput.trim()) {
        const res = await searchCategories(skillInput);
        const sorted = res.sort((a, b) => a.name.localeCompare(b.name));
        setFilteredSkills(sorted);
        setIsDropdownOpen(true);
      } else {
        setFilteredSkills([]);
        setIsDropdownOpen(false);
      }
    };
    const d = setTimeout(search, 300);
    return () => clearTimeout(d);
  }, [skillInput]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || profile.role !== 'employer') {
      navigate('/login');
      return;
    }
    if (!title.trim()) {
      setError('Job title is required.');
      return;
    }
    if (!description.trim() && !aiBrief.trim()) {
      setError('Either description or AI brief is required.');
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);

      if (salaryType !== 'negotiable') {
        if (salary === null || salary <= 0) {
          setError('Salary is required (>0) unless salary type is negotiable.');
          setIsSubmitting(false);
          return;
        }
      }

const jobData: Partial<JobPost> & { aiBrief?: string } = {
  title,
  location: locationMode,
  salary: salaryType === 'negotiable' ? null : (salary ?? null),
  salary_type: salaryType,
  excluded_locations: excludedCountries,
  status: 'Active',
  job_type: jobType,
  // --- changed: send multi-select values ---
  category_ids: selectedCategoryIds,
};

// ВСЕГДА отправляем description — тогда бэк НЕ будет заново генерировать
jobData.description = description;

// опционально добавляем aiBrief, если пользователь не редактировал и он есть
if (!isEdited && aiBrief.trim()) {
  jobData.aiBrief = aiBrief;
}


await createJobPost(jobData);

      navigate('/employer-dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create job post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const findCategoryById = (id: string, cats: Category[]): Category | undefined => {
    for (const cat of cats) {
      if (cat.id === id) return cat;
      if (cat.subcategories) {
        const found = findCategoryById(id, cat.subcategories);
        if (found) return found;
      }
    }
    return undefined;
  };

  if (isLoading) {
    return (
      <div>
        {!embedded && <Header />}
        <div className="pjx-shell">
          <div className="pjx-card">
            <h1 className="pjx-title"><FaBriefcase /> Post a Job</h1>
            <Loader />
          </div>
        </div>
        {!embedded && (<><Footer /><Copyright /></>)}
      </div>
    );
  }

  if (!profile || profile.role !== 'employer') {
    return (
      <div>
        {!embedded && <Header />}
        <div className="pjx-shell">
          <div className="pjx-card">
            <h1 className="pjx-title"><FaBriefcase /> Post a Job</h1>
            <p className="pjx-subtitle">This page is only available for Employers.</p>
          </div>
        </div>
        {!embedded && (<><Footer /><Copyright /></>)}
      </div>
    );
  }

  return (
    <div>
      {!embedded && <Header />}

      <div className="pjx-shell">
        <div className="pjx-header">
          <h1 className="pjx-title"><FaBriefcase /> Post a Job</h1>
          <p className="pjx-subtitle">Create a great listing — or let AI draft the description for you.</p>
        </div>

      <div className="pjx-prev">
  <div className="pjx-headrow">
    <label className="pjx-label">
      <FaHistory /> Use previous job
      <InfoTip tip="You can select any previously created job. All fields will be filled automatically." />
    </label>

    {/* Кнопка «Clear selection» — видна, когда есть выбор или введён запрос */}
    {(prevSelectedId || prevQuery) && (
      <button
        type="button"
        className="cs-button pjx-clear"
        onClick={clearPrevSelection}
        title="Clear previous job selection and remove pre-filled data"
      >
        <FaTimesCircle style={{ marginRight: 6 }} />
        Clear selection
      </button>
    )}
  </div>

  <div className="pjx-auto">
    <FaSearch className="pjx-auto-icon" />
    <input
      className="pjx-input pjx-auto-input"
      type="text"
      value={prevQuery}
      onChange={(e) => setPrevQuery(e.target.value)}
      onFocus={() => setPrevOpen(true)}
      onBlur={() => setTimeout(() => setPrevOpen(false), 150)}
      placeholder="Search your previous jobs…"
    />
    {prevOpen && (
      <ul className="pjx-dropdown">
        {prevJobs
          .filter(j => !prevQuery.trim() || j.title.toLowerCase().includes(prevQuery.toLowerCase()))
          .slice(0, 20)
          .map(j => (
            <li
              key={j.id}
              className={`pjx-item ${prevSelectedId === j.id ? 'is-selected' : ''}`}
              onMouseDown={() => fillFromPrevious(j.id)}
              title={j.title}
            >
              <span className="pjx-prev-title">{j.title}</span>
              <span className="pjx-prev-date">
                {new Date(j.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        {prevJobs.length === 0 && <li className="pjx-item pjx-empty">No previous jobs</li>}
        {prevJobs.length > 0 &&
         prevJobs.filter(j => j.title.toLowerCase().includes(prevQuery.toLowerCase())).length === 0 && (
          <li className="pjx-item pjx-empty">No matches</li>
        )}
      </ul>
    )}
  </div>
</div>


        {error && <div className="cs-alert cs-err">{error}</div>}

        <form onSubmit={handleSubmit} className="pjx-form" noValidate>
          <div className="pjx-grid">
            {/* LEFT */}
            <div className="pjx-card">
              <div className="pjx-row">
                <label className="pjx-label">
                  <FaBriefcase /> Job Title *{' '}
                  <InfoTip tip="Keep it short and searchable: Role — focus area/tools." />
                </label>
                <input
                  className="pjx-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Senior Virtual Assistant (E-commerce, Amazon)"
                  required
                />
              </div>

              <div className="pjx-row">
                <label className="pjx-label">
                  <FaMapMarkerAlt /> Location Exclusions{' '}
                  <InfoTip tip="Add countries you don’t want to receive applications from." />
                </label>
                <div className="pjx-auto">
                  <FaSearch className="pjx-auto-icon" />
                  <input
                    className="pjx-input pjx-auto-input"
                    type="text"
                    value={countryInput}
                    onChange={(e) => setCountryInput(e.target.value)}
                    placeholder="Search countries to exclude…"
                  />
                  {filteredCountries.length > 0 && (
                    <ul className="pjx-dropdown">
                      {filteredCountries.map((country) => (
                        <li
                          key={country}
                          className="pjx-item"
                          onMouseDown={() => addCountry(country)}
                        >
                          {country}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {excludedCountries.length > 0 && (
                  <div className="pjx-chips">
                    {excludedCountries.map((country) => (
                      <span key={country} className="pjx-chip">
                        {country}
                        <button
                          type="button"
                          className="pjx-chip-x"
                          onClick={() => removeCountry(country)}
                          aria-label={`Remove ${country}`}
                        >
                          <FaTimes />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pjx-row">
                <label className="pjx-label">
                  <FaMapMarkerAlt /> Work Mode{' '}
                  <InfoTip tip="Shown on the job card and used in search filters." />
                </label>
                <select
                  className="pjx-select"
                  value={locationMode}
                  onChange={(e) => setLocationMode(e.target.value)}
                >
                  <option value="">Work mode</option>
                  <option value="Remote">Remote</option>
                  <option value="On-site">On-site</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>

              <div className="pjx-row">
                <label className="pjx-label">
                  <FaMoneyBillWave /> Salary{' '}
                  <InfoTip tip="Choose a unit. Select ‘negotiable’ to hide the exact amount." />
                </label>
                <div className="pjx-salary">
                  <input
                    className="pjx-input"
                    type="number"
                    value={salaryType === 'negotiable' ? '' : salary ?? ''}
                    onChange={(e) => setSalary(e.target.value ? Number(e.target.value) : null)}
                    placeholder={salaryType === 'negotiable' ? 'Negotiable' : 'Enter amount'}
                    min={0}
                    disabled={salaryType === 'negotiable'}
                  />
                  <select
                    className="pjx-select"
                    value={salaryType}
                    onChange={(e) => setSalaryType(e.target.value as SalaryType)}
                  >
                    <option value="per hour">per hour</option>
                    <option value="per month">per month</option>
                    <option value="negotiable">negotiable</option>
                  </select>
                </div>
              </div>

              <div className="pjx-row">
                <label className="pjx-label">
                  <FaListUl /> Job Type{' '}
                  <InfoTip tip="How the role is contracted — affects candidate expectations." />
                </label>
                <select
                  className="pjx-select"
                  value={jobType || ''}
                  onChange={(e) => {
                    const v = e.target.value as 'Full-time' | 'Part-time' | 'Project-based' | '';
                    setJobType(v === '' ? undefined : v);
                  }}
                >
                  <option value="">Select job type</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Project-based">Project-based</option>
                </select>
              </div>

              <div className="pjx-row">
                <label className="pjx-label">
                  <FaListUl /> Categories{' '}
                  <InfoTip tip="Choose one or more categories. After selecting, the field clears so you can add another." />
                </label>
                <div className="pjx-auto">
                  <FaSearch className="pjx-auto-icon" />
                  <input
                    className="pjx-input pjx-auto-input"
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Start typing to search categories…"
                    onFocus={() => setIsDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                  />
                  {isDropdownOpen && (
                    <ul className="pjx-dropdown">
                      {(skillInput.trim() ? filteredSkills : categories).map((category) => (
                        <React.Fragment key={category.id}>
                          <li
                            className="pjx-item"
                            onMouseDown={() => addCategoryId(category.id)}
                          >
                            {category.name}
                          </li>
                          {category.subcategories?.map((sub) => (
                            <li
                              key={sub.id}
                              className="pjx-item pjx-sub"
                              onMouseDown={() => addCategoryId(sub.id)}
                            >
                              {`${category.name} > ${sub.name}`}
                            </li>
                          ))}
                        </React.Fragment>
                      ))}
                    </ul>
                  )}
                </div>

                {/* chips with all selected categories */}
                {selectedCategoryIds.length > 0 && (() => {
                  const all = allFlattened();
                  const chips = selectedCategoryIds
                    .map((id) => {
                      const cat = all.find((c) => String(c.id) === String(id));
                      if (!cat) return { id, label: 'Unknown Category' };
                      const parent = cat.parent_id
                        ? all.find((c) => String(c.id) === String(cat.parent_id))
                        : undefined;
                      return {
                        id,
                        label: parent ? `${parent.name} > ${cat.name}` : cat.name,
                      };
                    });

                  return (
                    <div className="pjx-chips">
                      {chips.map(({ id, label }) => (
                        <span key={id} className="pjx-chip">
                          {label}
                          <button
                            type="button"
                            className="pjx-chip-x"
                            onClick={() => removeCategoryId(id)}
                            aria-label="Remove category"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>


              <div className="pjx-row">
                <label className="pjx-label">
                  <FaBolt /> Brief Description for AI *{' '}
                  <InfoTip tip="1–3 sentences: responsibilities, must-have skills, tools, seniority." />
                </label>
                <textarea
                  className="pjx-textarea"
                  value={aiBrief}
                  onChange={(e) => setAiBrief(e.target.value)}
                  placeholder="1–3 sentences: responsibilities, must-have skills, tools, seniority…"
                  rows={4}
                />
                <button
                  type="button"
                  onClick={() => handleGenerate()}
                  className="cs-button pjx-inline-btn"
                  disabled={isSubmitting || isGenerating}
                >
                  {isGenerating ? 'Generating…' : <>Generate Description</>}
                </button>
              </div>
            </div>

            {/* RIGHT */}
            <div className="pjx-card">
              <div className="pjx-row">
                <div className="pjx-headrow">
                  <label className="pjx-label">
                    Job Description (editable){' '}
                    <InfoTip tip="You can edit the generated text. Click Regenerate to try a different wording." />
                  </label>
                  <div className="pjx-head-actions">
                    <button
                      type="button"
                      onClick={() => handleGenerate(true)}
                      className="cs-button pjx-regenerate"
                      disabled={isSubmitting || isGenerating}
                      title="Regenerate with AI"
                    >
                      <FaRedo /> Regenerate
                    </button>
                  </div>
                </div>

                {isGenerating ? (
                  <Loader />
                ) : (
                  <div className="pjx-quill-wrap">
                    <ReactQuill
                      ref={quillRef}
                      value={description || ''}
                      onChange={(value, _delta, source) => {
                        if (source === 'user') {
                          setDescription(value);
                          if (!isEdited) setIsEdited(true);
                        }
                      }}
                      modules={{ toolbar: false }}
                      formats={['header', 'bold', 'list', 'bullet']}
                      placeholder="Generated description will appear here"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pjx-actions">
            <button type="submit" className="cs-button" disabled={isSubmitting}>
              {isSubmitting ? 'Posting…' : 'Post Job'}
            </button>
          </div>
        </form>
      </div>

      {!embedded && (<><Footer /><Copyright /></>)}
    </div>
  );
};

export default PostJob;
