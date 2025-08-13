import { useState, useEffect, FormEvent, useRef } from 'react';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { createJobPost, getCategories, searchCategories, generateDescription } from '../services/api';
import { Category, JobPost, SalaryType } from '@types';
import { useRole } from '../context/RoleContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Loader from '../components/Loader';

const PostJob: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const embedded = location.pathname.startsWith('/employer-dashboard'); // ← внутри дашборда?
  const { profile } = useRole();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [filteredSkills, setFilteredSkills] = useState<Category[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [salaryType, setSalaryType] = useState<SalaryType>('per hour');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationMode, setLocationMode] = useState(''); // Work Mode
  const [jobType, setJobType] = useState<JobPost['job_type'] | undefined>(undefined);
  const [aiBrief, setAiBrief] = useState('');
  const [isEdited, setIsEdited] = useState(false);
  const [requestTimes, setRequestTimes] = useState<number[]>([]);
  const [salary, setSalary] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const [excludedCountries, setExcludedCountries] = useState<string[]>([]);
  const [countryInput, setCountryInput] = useState('');
  const [filteredCountries, setFilteredCountries] = useState<string[]>([]);

 const allCountries = [ // From tool result, hardcoded
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo, Democratic Republic of the", "Congo, Republic of the",
  "Costa Rica", "Cote d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czechia", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland",
  "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea",
  "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo",
  "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius",
  "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia",
  "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino",
  "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
  "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia",
  "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
]; // Sorted list from tool

  useEffect(() => {
    if (countryInput.trim()) {
      const filtered = allCountries.filter(
        (c) => c.toLowerCase().includes(countryInput.toLowerCase()) && !excludedCountries.includes(c)
      );
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
          sorted.forEach((c) => {
            if (c.subcategories) c.subcategories = sortCats(c.subcategories);
          });
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
        salary: salaryType === 'negotiable' ? null : salary ?? null,
        salary_type: salaryType,
        excluded_locations: excludedCountries,
        status: 'Active',
        job_type: jobType,
        category_id: categoryId || undefined,
      };

      if (isEdited || !aiBrief.trim()) jobData.description = description;
      else jobData.aiBrief = aiBrief;

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
        <div className="container">
          <h2>Post a Job</h2>
          <Loader />
        </div>
        {!embedded && <>
          <Footer />
          <Copyright />
        </>}
      </div>
    );
  }

  if (!profile || profile.role !== 'employer') {
    return (
      <div>
        {!embedded && <Header />}
        <div className="container">
          <h2>Post a Job</h2>
          <p>This page is only available for Employers.</p>
        </div>
        {!embedded && <>
          <Footer />
          <Copyright />
        </>}
      </div>
    );
  }

  return (
    <div>
      {!embedded && <Header />}

      <div className="container">
        <div className="post-job-container">
          <h1 style={{ textAlign: 'left', textTransform: 'uppercase' }}>POST A JOB</h1>

          <div className="post-job-form">
            <form onSubmit={handleSubmit}>
              <div className="form-columns">
                <div className="form-column left-column">
                  <div className="form-group">
                    <label>Job Title *</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter job title"
                      required
                    />
                  </div>

                  <div className="form-group relative">
                    <label>Location Exclusions</label>
                    <input
                      type="text"
                      value={countryInput}
                      onChange={(e) => setCountryInput(e.target.value)}
                      placeholder="Search countries to exclude..."
                    />
                    {filteredCountries.length > 0 && (
                      <ul className="autocomplete-dropdown">
                        {filteredCountries.map((country) => (
                          <li key={country} className="autocomplete-item" onClick={() => addCountry(country)}>
                            {country}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="category-tags">
                      {excludedCountries.map((country) => (
                        <span key={country} className="category-tag">
                          {country}
                          <span className="remove-tag" onClick={() => removeCountry(country)}>×</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Work Mode</label>
                    <select value={locationMode} onChange={(e) => setLocationMode(e.target.value)}>
                      <option value="">Work mode</option>
                      <option value="Remote">Remote</option>
                      <option value="On-site">On-site</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Salary</label>
                    <div className="salary-group">
                      <input
                        type="number"
                        value={salaryType === 'negotiable' ? '' : salary ?? ''}
                        onChange={(e) => setSalary(e.target.value ? Number(e.target.value) : null)}
                        placeholder={salaryType === 'negotiable' ? 'Negotiable' : 'Enter salary'}
                        min="0"
                        disabled={salaryType === 'negotiable'}
                      />
                      <select
                        value={salaryType}
                        onChange={(e) => setSalaryType(e.target.value as SalaryType)}
                      >
                        <option value="per hour">per hour</option>
                        <option value="per month">per month</option>
                        <option value="negotiable">negotiable</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Job Type</label>
                    <select
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

                  <div className="form-group">
                    <label>Category</label>
                    <div className="autocomplete-wrapper">
                      <input
                        type="text"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        placeholder="Start typing to search skills..."
                        className="category-select"
                        onFocus={() => setIsDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                      />
                      {isDropdownOpen && (
                        <ul className="autocomplete-dropdown">
                          {(skillInput.trim() ? filteredSkills : categories).map((category) => (
                            <React.Fragment key={category.id}>
                              <li
                                className="autocomplete-item"
                                onMouseDown={() => {
                                  setCategoryId(category.id);
                                  setSkillInput(category.name);
                                  setIsDropdownOpen(false);
                                }}
                              >
                                {category.name}
                              </li>
                              {category.subcategories?.map((sub) => (
                                <li
                                  key={sub.id}
                                  className="autocomplete-item sub-category"
                                  onMouseDown={() => {
                                    setCategoryId(sub.id);
                                    setSkillInput(`${category.name} > ${sub.name}`);
                                    setIsDropdownOpen(false);
                                  }}
                                >
                                  {`${category.name} > ${sub.name}`}
                                </li>
                              ))}
                            </React.Fragment>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="category-tags">
                      {categoryId && (() => {
                        const skill =
                          findCategoryById(categoryId, categories) ||
                          findCategoryById(categoryId, filteredSkills);
                        const parent = skill?.parent_id
                          ? findCategoryById(skill.parent_id, categories)
                          : undefined;
                        const label = skill
                          ? (skill.parent_id && parent ? `${parent.name} > ${skill.name}` : skill.name)
                          : 'Unknown Category';
                        return (
                          <span className="category-tag">
                            {label}
                            <span className="remove-tag" onClick={() => setCategoryId('')}>×</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Brief Description for AI (will generate full description) *</label>
                    <textarea
                      value={aiBrief}
                      onChange={(e) => setAiBrief(e.target.value)}
                      placeholder="Briefly describe the job and requirements..."
                      rows={4}
                    />
                    <button
                      type="button"
                      onClick={() => handleGenerate()}
                      style={{ marginTop: '10px' }}
                      disabled={isSubmitting || isGenerating}
                    >
                      {isGenerating ? 'Generating…' : 'Generate Description'}
                    </button>
                  </div>
                </div>

                <div className="form-column right-column">
                  <div className="description-editor">
                    <h3>Job Description (editable)</h3>
                    {isGenerating ? (
                      <Loader />
                    ) : (
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
                        style={{ height: '380px', marginBottom: '10px' }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleGenerate(true)}
                      style={{ marginTop: '50px' }}
                      disabled={isGenerating}
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              </div>

              {error && <p className="error-message">{error}</p>}

              <div style={{ textAlign: 'center', marginTop: '60px' }}>
                <button type="submit" style={{ padding: '12px 32px', fontSize: '16px' }} disabled={isSubmitting}>
                  {isSubmitting ? 'Posting…' : 'Post Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {!embedded && <>
        <Footer />
        <Copyright />
      </>}
    </div>
  );
};

export default PostJob;
