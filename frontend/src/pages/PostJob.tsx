import { useState, useEffect, FormEvent } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { createJobPost, getCategories, searchCategories, generateDescription } from '../services/api';
import { Category, JobPost, SalaryType } from '@types';
import { useRole } from '../context/RoleContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Loader from '../components/Loader';
import { useRef } from 'react';

const PostJob: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useRole();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [filteredSkills, setFilteredSkills] = useState<Category[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
const [categoryIds, setCategoryIds] = useState<string[]>([]);
const [salaryType, setSalaryType] = useState<SalaryType>('per hour');
const [isSubmitting, setIsSubmitting] = useState(false);
 
  const [location, setLocation] = useState(''); // Uncommented and used for Work Mode
  
  const [selectedSkills, setSelectedSkills] = useState<Category[]>([]);
  const [jobType, setJobType] = useState<JobPost['job_type'] | undefined>(undefined);
  const [aiBrief, setAiBrief] = useState(''); // Новое: brief для AI
  const [isEdited, setIsEdited] = useState(false);
  const [requestTimes, setRequestTimes] = useState<number[]>([]);
  const [salary, setSalary] = useState<number | null>(null);
  
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [excludedCountries, setExcludedCountries] = useState<string[]>([]); // New: selected exclusions
const [countryInput, setCountryInput] = useState(''); // New: search input
const [filteredCountries, setFilteredCountries] = useState<string[]>([]); // New: filtered by input
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
    const filtered = allCountries.filter(country => 
      country.toLowerCase().includes(countryInput.toLowerCase()) && !excludedCountries.includes(country)
    );
    setFilteredCountries(filtered);
  } else {
    setFilteredCountries([]);
  }
}, [countryInput, excludedCountries, profile, skillInput]);

const addCountry = (country: string) => {
  if (!excludedCountries.includes(country)) {
    setExcludedCountries([...excludedCountries, country]);
  }
  setCountryInput('');
  setFilteredCountries([]);
};

const removeCountry = (country: string) => {
  setExcludedCountries(excludedCountries.filter(c => c !== country));
};

const quillRef = useRef<any>(null); // Добавлено: ref для Quill

const handleGenerate = async (isRegenerate = false) => {
  if (!aiBrief.trim()) {
    setError('Brief description is required for generation.');
    return;
  }
  const now = Date.now() / 1000;
  const recentRequests = requestTimes.filter(t => now - t < 60);
  if (recentRequests.length >= 5) {
    setError('Rate limit exceeded: 5 generations per minute.');
    return;
  }
  setRequestTimes([...recentRequests, now]);
  try {
    setError(null);
    setIsGenerating(true);
    const res = await generateDescription({
      aiBrief,
      title, 
      location, 
      salary: salary !== null ? salary : undefined, 
      salary_type: salaryType, 
      job_type: jobType ?? undefined,
    });
    const html = typeof res === 'string' ? res : res.description || ''; // Добавлено: обработка если res object
    console.log('Generated description:', html);
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      editor.setContents(editor.clipboard.convert(html)); // Добавлено: set через Quill API, без триггера onChange
    }
    setDescription(html); // Сохраняем в state для persist
    setIsEdited(false);
  } catch (err: any) {
    setError(err.response?.data?.message || 'Failed to generate description.');
  } finally {
    setIsGenerating(false);
  }
};

useEffect(() => {
  if (salaryType === 'negotiable') {
    setSalary(null);
  }
}, [salaryType]);

  
useEffect(() => {
  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const data = await getCategories();
      // Рекурсивная сортировка по алфавиту
      const sortCategories = (categories: Category[]): Category[] => {
        const sorted = categories.sort((a, b) => a.name.localeCompare(b.name));
        sorted.forEach(cat => {
          if (cat.subcategories) {
            cat.subcategories = sortCategories(cat.subcategories);
          }
        });
        return sorted;
      };
      setCategories(sortCategories(data));
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setError(err.response?.data?.message || 'Failed to load categories.');
    } finally {
      setIsLoading(false);
    }
  };
  if (profile?.role === 'employer') {
    fetchCategories();
  } else {
    setIsLoading(false);
  }
}, [profile]);

useEffect(() => {
  const search = async () => {
    if (skillInput.trim()) {
      const res = await searchCategories(skillInput);
      // Сортировка filtered
      const sortedFiltered = res.sort((a, b) => a.name.localeCompare(b.name));
      setFilteredSkills(sortedFiltered);
      setIsDropdownOpen(true);
    } else {
      setFilteredSkills([]); 
      setIsDropdownOpen(false);
    }
  };
  const debounce = setTimeout(search, 300);
  return () => clearTimeout(debounce);
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
    setIsSubmitting(true); // ← показываем лоадер

    if (salaryType !== 'negotiable') {
      if (salary === null || salary <= 0) {
        setError('Salary is required (>0) unless salary type is negotiable.');
        setIsSubmitting(false);
        return;
      }
    }

    const jobData: Partial<JobPost> & { aiBrief?: string } = {
      title,
      location,
      salary: salaryType === 'negotiable' ? null : (salary ?? null),
      salary_type: salaryType,
      excluded_locations: excludedCountries,
      status: 'Active',
      job_type: jobType,
      category_id: categoryId || undefined,
    };

    if (isEdited || !aiBrief.trim()) {
      jobData.description = description;
    } else {
      jobData.aiBrief = aiBrief;
    }

    await createJobPost(jobData);

    // навигируемся — компонент размонтируется и лоадер исчезнет
    navigate('/employer-dashboard');
  } catch (err: any) {
    setError(err.response?.data?.message || 'Failed to create job post.');
  } finally {
    // на случай если навигации не произошло (ошибка) — убираем лоадер
    setIsSubmitting(false);
  }
};

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className={`loading-overlay ${isSubmitting ? 'visible' : ''}`}>
  {isSubmitting && <Loader />}</div>
        <div className="container">
          <h2>Post a Job</h2>
          <Loader />
        </div>
        <Footer />
        <Copyright />
      </div>
    );
  }

  if (!profile || profile.role !== 'employer') {
    return (
      <div>
        <Header />
        <div className="container">
          <h2>Post a Job</h2>
          <p>This page is only available for Employers.</p>
        </div>
        <Footer />
        <Copyright />
      </div>
    );
  }

  const descriptionLength = description.replace(/<[^>]+>/g, '').length;
  const isDescriptionValid = descriptionLength >= 150;

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

  return (
  <div>
    <Header />
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
                  <select value={location} onChange={(e) => setLocation(e.target.value)}>
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
      value={salaryType === 'negotiable' ? '' : (salary !== null ? salary : '')}
      onChange={(e) => setSalary(e.target.value ? Number(e.target.value) : null)}
      placeholder={salaryType === 'negotiable' ? 'Negotiable' : 'Enter salary'}
      min="0"
      disabled={salaryType === 'negotiable'}          // ← отключаем при negotiable
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
                      const value = e.target.value as 'Full-time' | 'Part-time' | 'Project-based' | '';
                      setJobType(value === '' ? undefined : value);
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
    setCategoryId(category.id);    // ← ставим одиночный category_id
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
    setCategoryId(sub.id);         // ← субкатегория как category_id
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
    const skill = findCategoryById(categoryId, categories) || findCategoryById(categoryId, filteredSkills);
    const parent = skill?.parent_id ? findCategoryById(skill.parent_id, categories) : undefined;
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
                    placeholder="Briefly describe the job and requirements (e.g., Python developer with 3 years experience for web app. Skills: Django, SQL. Duties: backend development.)"
                    rows={4}
                  />
                <button type="button" onClick={() => handleGenerate()} style={{ marginTop: '10px' }} disabled={isSubmitting || isGenerating}>
  Generate Description
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
  onChange={(value, delta, source, editor) => {  
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
  <button type="button" onClick={() => handleGenerate(true)} style={{ marginTop: '50px' }} disabled={isGenerating}>
    Regenerate
  </button>
</div>
</div>
            </div>
            {error && <p className="error-message">{error}</p>}
            <div style={{ textAlign: 'center', marginTop: '60px' }}>
             <button
  type="submit"
  style={{ padding: '12px 32px', fontSize: '16px' }}
  disabled={isSubmitting}
>
  {isSubmitting ? 'Posting…' : 'Post Job'}
</button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <Footer />
    <Copyright />
  </div>
);
};

export default PostJob;