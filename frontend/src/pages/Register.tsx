import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { register, login, getCategories, searchCategories, updateProfile, uploadIdentityDocument } from '../services/api';
import { Category, JobSeekerProfile } from '@types'; // Добавил JobSeekerProfile
import { useRole } from '../context/RoleContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Register: React.FC = () => {
  const { role } = useParams<{ role: 'employer' | 'jobseeker' }>();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { refreshProfile } = useRole();
  const [experience, setExperience] = useState(''); // New for jobseeker
  const [selectedSkills, setSelectedSkills] = useState<Category[]>([]); // New for jobseeker
  const [skillInput, setSkillInput] = useState(''); // New
  const [filteredSkills, setFilteredSkills] = useState<Category[]>([]); // New
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // New
  const [resumeFile, setResumeFile] = useState<File | null>(null); // New for jobseeker
  const [categories, setCategories] = useState<Category[]>([]); // New

  useEffect(() => {
    if (!role || !['employer', 'jobseeker'].includes(role)) {
      navigate('/role-selection');
    }
    if (role === 'jobseeker') {
      const fetchCategories = async () => {
        try {
          const cats = await getCategories();
          setCategories(cats);
        } catch (error) {
          console.error('Error fetching categories in Register:', error);
        }
      };
      fetchCategories();
    }
  }, [role, navigate]);

  useEffect(() => {
    if (role === 'jobseeker' && skillInput.trim()) {
      const search = async () => {
        try {
          const res = await searchCategories(skillInput);
          setFilteredSkills(res);
          setIsDropdownOpen(true);
        } catch (error) {
          console.error('Error searching skills in Register:', error);
          setFilteredSkills([]);
          setIsDropdownOpen(false);
        }
      };
      const debounce = setTimeout(search, 300);
      return () => clearTimeout(debounce);
    } else {
      setFilteredSkills([]);
      setIsDropdownOpen(false);
    }
  }, [skillInput, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match!');
      return;
    }
    try {
      setErrorMessage(null);
      await register({ username, email, password, role });
      // Auto login after register
      const loginRes = await login({ email, password });
      localStorage.setItem('token', loginRes.accessToken);
      await refreshProfile();
      if (role === 'jobseeker') {
        // Update profile with jobseeker-specific fields
        await updateProfile({
          experience,
          skillIds: selectedSkills.map(s => s.id),
        } as Partial<JobSeekerProfile>); // Cast to Partial<JobSeekerProfile> to fix TS error
        if (resumeFile) {
          const formData = new FormData();
          formData.append('document', resumeFile);
          await uploadIdentityDocument(formData);
        }
      }
      navigate('/');
    } catch (error: any) {
      console.error('Register error:', error);
      const errorMsg =
        error.response?.status === 403 && error.response?.data?.message === 'Registration is not allowed from your country'
          ? 'Registration is not allowed from your country.'
          : error.response?.data?.message || 'Registration failed. Please try again.';
      setErrorMessage(errorMsg);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  if (!role) return null;

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>Sign Up</h2>
        {errorMessage && <p style={{ color: 'red', textAlign: 'center' }}>{errorMessage}</p>}
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              required
            />
          </div>
          <div className="form-group password-container">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="new-password"
                required
              />
              <span className="password-toggle-icon" onClick={togglePasswordVisibility}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>
          <div className="form-group password-container">
            <label>Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                autoComplete="new-password"
                required
              />
              <span className="password-toggle-icon" onClick={toggleConfirmPasswordVisibility}>
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>
          {role === 'jobseeker' && (
            <>
              <div className="form-group">
                <label>Experience</label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="category-select"
                >
                  <option value="" disabled>Select experience level</option>
                  <option value="Less than 1 year">Less than 1 year</option>
                  <option value="1-2 years">1-2 years</option>
                  <option value="2-3 years">2-3 years</option>
                  <option value="3-6 years">3-6 years</option>
                  <option value="6+ years">6+ years</option>
                </select>
              </div>
              <div className="form-group">
                <label>Talents/Skills:</label>
                <div className="autocomplete-wrapper">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Type to search skills..."
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
                            if (!selectedSkills.find(s => s.id === skill.id)) {
                              setSelectedSkills([...selectedSkills, skill]);
                            }
                            setSkillInput('');
                            setIsDropdownOpen(false);
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
                  {selectedSkills.map((skill) => (
                    <span key={skill.id} className="category-tag">
                      {skill.name}
                      <span
                        className="remove-tag"
                        onClick={() => {
                          setSelectedSkills(selectedSkills.filter((s) => s.id !== skill.id));
                        }}
                      >
                        ×
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Resume:</label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                />
              </div>
            </>
          )}
          <button type="submit">Sign Up as {role === 'employer' ? 'Employer' : 'Jobseeker'}</button>
          <div className="form-links">
            <p>
              Already have an account? <Link to="/login">Login</Link>
            </p>
            <p>
              <Link to="/">Go to Home</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;