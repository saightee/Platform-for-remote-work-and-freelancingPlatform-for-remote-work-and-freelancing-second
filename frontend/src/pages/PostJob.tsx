import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { createJobPost, getCategories, searchCategories, generateDescription } from '../services/api';
import { Category, JobPost } from '@types';
import { useRole } from '../context/RoleContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Loader from '../components/Loader';

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
  const [salaryType, setSalaryType] = useState('per hour');
  const [location, setLocation] = useState(''); // Uncommented and used for Work Mode
  const [selectedSkills, setSelectedSkills] = useState<Category[]>([]);
 
  const [aiBrief, setAiBrief] = useState(''); // Новое: brief для AI
  const [isEdited, setIsEdited] = useState(false);
  const [requestTimes, setRequestTimes] = useState<number[]>([]);
  const [salary, setSalary] = useState<number | null>(null);
  const [jobType, setJobType] = useState<JobPost['job_type']>(null);
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(true);
      const res = await generateDescription(aiBrief);
      setDescription(res);
      setIsEdited(false); // Reset edited flag
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate description.');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
const fetchCategories = async () => {
  try {
    setIsLoading(true);
    const data = await getCategories();
    const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
    setCategories(sortedData);
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
        setFilteredSkills(res);
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
      const jobData: Partial<JobPost> & { aiBrief?: string } = {
        title,
        location,
        salary: salary !== null ? salary : null,
        salary_type: salaryType,
        excluded_locations: excludedCountries,
        status: 'Active',
        job_type: jobType,
        category_ids: categoryIds || undefined,
      };
      if (isEdited || !aiBrief.trim()) {
        jobData.description = description;
      } else {
        jobData.aiBrief = aiBrief;
      }
      await createJobPost(jobData);
      navigate('/my-job-posts');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create job post.');
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header />
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
                      value={salary !== null ? salary : ''}
                      onChange={(e) => setSalary(e.target.value ? Number(e.target.value) : null)}
                      placeholder="Enter salary"
                      min="0"
                    />
                    <select value={salaryType} onChange={(e) => setSalaryType(e.target.value)}>
                      <option>per hour</option>
                      <option>per month</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Job Type</label>
                  <select
                    value={jobType || ''}
                    onChange={(e) => {
                      const value = e.target.value as 'Full-time' | 'Part-time' | 'Project-based' | '';
                      setJobType(value === '' ? null : value);
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
                      onFocus={() => skillInput.trim() && setIsDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                    />
                    {isDropdownOpen && filteredSkills.length > 0 && (
                      <ul className="autocomplete-dropdown">
                        {filteredSkills.map((skill) => (
                          <li
                            key={skill.id}
                            className="autocomplete-item"
                            onMouseDown={() => {
                              if (!selectedCategories.includes(skill.id)) {
                                setSelectedCategories([...selectedCategories, skill.id]);
                                setCategoryIds([...categoryIds, skill.id]);
                                setSkillInput('');
                                setIsDropdownOpen(false);
                              }
                            }}
                          >
                            {skill.parent_id
                              ? `${categories.find((cat) => cat.id === skill.parent_id)?.name || 'Category'} > ${skill.name}`
                              : skill.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="category-tags">
                    {selectedCategories.map((categoryId) => {
                      const skill = categories.find((cat) => cat.id === categoryId) || filteredSkills.find((cat) => cat.id === categoryId);
                      return (
                        <span key={categoryId} className="category-tag">
                          {skill
                            ? (skill.parent_id
                                ? `${categories.find((cat) => cat.id === skill.parent_id)?.name || 'Category'} > ${skill.name}`
                                : skill.name)
                            : 'Unknown Category'}
                          <span
                            className="remove-tag"
                            onClick={() => {
                              setSelectedCategories(selectedCategories.filter((id) => id !== categoryId));
                              setCategoryIds(categoryIds.filter((id) => id !== categoryId));
                            }}
                          >
                            ×
                          </span>
                        </span>
                      );
                    })}
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
                  <button type="button" onClick={() => handleGenerate()} style={{ marginTop: '10px' }}>
                    Generate Description
                  </button>
                </div>
              </div>
              <div className="form-column right-column">
                <div className="description-editor">
                  <h3>Job Description (editable)</h3>
                  <ReactQuill
                    value={description}
                    onChange={(value) => {
                      setDescription(value);
                      if (!isEdited) setIsEdited(true);
                    }}
                    placeholder="Generated description will appear here"
                    style={{ height: '380px', marginBottom: '10px' }}
                  />
                  <button type="button" onClick={() => handleGenerate(true)} style={{ marginTop: '50px' }}>
                    Regenerate
                  </button>
                </div>
              </div>
            </div>
            {error && <p className="error-message">{error}</p>}
            <div style={{ textAlign: 'center', marginTop: '60px' }}>
              <button type="submit" style={{ padding: '12px 32px', fontSize: '16px' }}>
                Post Job
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