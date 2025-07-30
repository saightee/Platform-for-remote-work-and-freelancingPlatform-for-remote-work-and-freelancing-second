import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getProfile, updateProfile, uploadIdentityDocument, deleteAccount, getCategories, searchCategories, uploadAvatar, uploadResume } from '../services/api';
import { Profile, Category, JobSeekerProfile, EmployerProfile, Review } from '@types';
import { useRole } from '../context/RoleContext';
import Copyright from '../components/Copyright';
import { FaUserCircle, FaFilePdf } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { AxiosError } from 'axios';
import Loader from '../components/Loader';

const ProfilePage: React.FC = () => {
  const { profile, refreshProfile } = useRole();
  const [profileData, setProfileData] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const navigate = useNavigate();
  const [skillInput, setSkillInput] = useState('');
  const [filteredSkills, setFilteredSkills] = useState<Category[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const timezones = Intl.supportedValuesOf('timeZone').sort();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const currencies = ['USD', 'EUR', 'GBP', 'JPY'];
  const resumeRef = useRef<HTMLInputElement>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const searchCategoriesAsync = async () => {
      if (skillInput.trim() === '') {
        setFilteredSkills([]);
        setIsDropdownOpen(false);
        return;
      }
      try {
        const response = await searchCategories(skillInput);
        setFilteredSkills(response);
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to view this page.');
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [profileData, categoriesData] = await Promise.all([
          getProfile(),
          getCategories(),
        ]);
        setProfileData(profileData);
        setCategories(categoriesData || []);
        if (profileData.role === 'jobseeker') {
          setSelectedSkillIds(
            (profileData as JobSeekerProfile).skills?.map((skill: Category) => skill.id) || []
          );
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setError(error.response?.data?.message || 'Failed to load profile or categories.');
      } finally {
        setIsLoading(false);
      }
    };

    if (profile) {
      setProfileData(profile);
      fetchData();
    } else {
      fetchData();
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!profileData) return;
    try {
      setFormError(null);
      if (profileData.role === 'jobseeker') {
        const updatedData = {
          username: profileData.username,
          email: profileData.email,
          timezone: profileData.timezone,
          currency: profileData.currency,
          skillIds: profileData.skills?.map((skill) => skill.id) || [],
          experience: (profileData as JobSeekerProfile).experience,
          description: (profileData as JobSeekerProfile).description,
          portfolio: (profileData as JobSeekerProfile).portfolio,
          video_intro: (profileData as JobSeekerProfile).video_intro,
          resume: (profileData as JobSeekerProfile).resume,
        };
        const updatedProfile = await updateProfile(updatedData);
        setProfileData(updatedProfile);
      } else if (profileData.role === 'employer') {
        const updatedData: Partial<EmployerProfile> = {
          username: profileData.username,
          email: profileData.email,
          timezone: profileData.timezone,
          currency: profileData.currency,
          company_name: (profileData as EmployerProfile).company_name,
          company_info: (profileData as EmployerProfile).company_info,
          referral_link: (profileData as EmployerProfile).referral_link,
        };
        const updatedProfile = await updateProfile(updatedData);
        setProfileData(updatedProfile);
      } else {
        const updatedData: Partial<Profile> = {
          username: profileData.username,
          email: profileData.email,
          timezone: profileData.timezone,
          currency: profileData.currency,
        };
        const updatedProfile = await updateProfile(updatedData);
        setProfileData(updatedProfile);
      }
      setIsEditing(false);
      await refreshProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setFormError(error.response?.data?.message || 'Failed to update profile.');
    }
  };

  const handleUploadResume = async () => {
    if (!resumeFile) return;
    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      const updated = await uploadResume(formData);
      setProfileData(updated);
      setResumeFile(null);
      await refreshProfile();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to upload resume.');
    }
  };

  const uploadAvatarFile = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    const updated = await uploadAvatar(formData);
    setProfileData(updated);
    setAvatarFile(null);
    await refreshProfile();
  } catch (err) {
    console.error('Error uploading avatar:', err);
  }
};

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    try {
      setFormError(null);
      await deleteAccount();
      localStorage.removeItem('token');
      setProfileData(null);
      navigate('/');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setFormError(error.response?.data?.message || 'Failed to delete account.');
    }
  };

  if (isLoading) return <Loader />;
  if (error) return <div>{error}</div>;
  if (!profileData) return <div>Profile data is unavailable.</div>;

  return (
    <div>
      <Header />
      <div className="container profile-container">
        <h2>My Profile | {profileData.role}</h2>
        {formError && <p className="error-message">{formError}</p>}
        <div className="profile-content">
          <div className="profile-top-row">
            <div className="profile-left-column">
<div 
  className="profile-avatar-section"
  onClick={() => avatarRef.current?.click()}
>
  {profileData.avatar ? (
    <img src={`https://jobforge.net/backend${profileData.avatar}`} alt="Avatar" className="profile-avatar" />
  ) : (
    <div className="default-avatar">
      <FaUserCircle className="profile-avatar-icon" />
      <span className="add-avatar">+</span>
    </div>
  )}
  <input
    type="file"
    accept="image/jpeg,image/jpg,image/png"
    ref={avatarRef}
    style={{ display: 'none' }}
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) {
        setAvatarFile(file);
        // Автоматический upload если не в edit mode
        if (!isEditing) {
          uploadAvatarFile(file);
        }
      }
    }}
  />
</div>
{avatarFile && isEditing && ( // Кнопка только в edit
  <button onClick={() => uploadAvatarFile(avatarFile)} className="action-button">
    Upload Avatar
  </button>
)}
              {isEditing ? (
                <>
                  <div className="form-group">
                    <label>Username:</label>
                    <input
                      type="text"
                      value={profileData.username || ''}
                      onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="form-group">
                    <label>Timezone:</label>
                    <select
                      value={profileData.timezone || ''}
                      onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                      className="category-select"
                    >
                      <option value="" disabled>Select timezone</option>
                      {timezones.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Currency:</label>
                    <select
                      value={profileData.currency || ''}
                      onChange={(e) => setProfileData({ ...profileData, currency: e.target.value })}
                      className="category-select"
                    >
                      <option value="" disabled>Select currency</option>
                      {currencies.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <p><strong>Username:</strong> {profileData.username}</p>
                  <p><strong>Timezone:</strong> {profileData.timezone || 'Not specified'}</p>
                  <p><strong>Currency:</strong> {profileData.currency || 'Not specified'}</p>
                </>
              )}
            </div>
            <div className="profile-right-column">
              {profileData.role === 'employer' && (
                <>
                  {isEditing ? (
                    <>
                      <div className="form-group">
                        <label>Company Name:</label>
                        <input
                          type="text"
                          value={(profileData as EmployerProfile).company_name || ''}
                          onChange={(e) => setProfileData({ ...profileData, company_name: e.target.value })}
                          placeholder="Enter company name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Company Info:</label>
                        <textarea
                          value={(profileData as EmployerProfile).company_info || ''}
                          onChange={(e) => setProfileData({ ...profileData, company_info: e.target.value })}
                          placeholder="Enter company information"
                          rows={4}
                        />
                      </div>
                      <div className="form-group">
                        <label>Referral Link:</label>
                        <input
                          type="text"
                          value={(profileData as EmployerProfile).referral_link || ''}
                          onChange={(e) => setProfileData({ ...profileData, referral_link: e.target.value })}
                          placeholder="Enter referral link"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <p><strong>Company Name:</strong> {(profileData as EmployerProfile).company_name || 'Not specified'}</p>
                      <p><strong>Company Info:</strong> {(profileData as EmployerProfile).company_info || 'Not specified'}</p>
                      <p><strong>Referral Link:</strong> {(profileData as EmployerProfile).referral_link || 'Not specified'}</p>
                    </>
                  )}
                </>
              )}
              {profileData.role === 'jobseeker' && (
                <>
                  {isEditing ? (
                    <>
                      <div className="form-group">
                        <label>Skills:</label>
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
                                    if (!selectedSkillIds.includes(skill.id)) {
                                      const newSkill: Category = {
                                        id: skill.id,
                                        name: skill.name,
                                        parent_id: skill.parent_id || null,
                                        created_at: skill.created_at,
                                        updated_at: skill.updated_at,
                                        subcategories: [],
                                      };
                                      setSelectedSkillIds([...selectedSkillIds, skill.id]);
                                      setProfileData({
                                        ...profileData,
                                        skills: [...(profileData.skills || []), newSkill],
                                      });
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
                          {profileData.skills?.map((skill) => (
                            <span key={skill.id} className="category-tag">
                              {skill.name}
                              <span
                                className="remove-tag"
                                onClick={() => {
                                  const updatedSkills = profileData.skills?.filter((s) => s.id !== skill.id) || [];
                                  const updatedSkillIds = selectedSkillIds.filter((id) => id !== skill.id);
                                  setProfileData({ ...profileData, skills: updatedSkills });
                                  setSelectedSkillIds(updatedSkillIds);
                                }}
                              >
                                ×
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Experience:</label>
                        <select
                          value={(profileData as JobSeekerProfile).experience || ''}
                          onChange={(e) => setProfileData({ ...profileData, experience: e.target.value })}
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
                        <label>Description:</label>
                        <textarea
                          value={(profileData as JobSeekerProfile).description || ''}
                          onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                          placeholder="Enter your description"
                          rows={4}
                        />
                      </div>
                      <div className="form-group">
                        <label>Portfolio:</label>
                        <input
                          type="text"
                          value={(profileData as JobSeekerProfile).portfolio || ''}
                          onChange={(e) => setProfileData({ ...profileData, portfolio: e.target.value })}
                          placeholder="Enter portfolio URL"
                        />
                      </div>
                      <div className="form-group">
                        <label>Video Introduction:</label>
                        <input
                          type="text"
                          value={(profileData as JobSeekerProfile).video_intro || ''}
                          onChange={(e) => setProfileData({ ...profileData, video_intro: e.target.value })}
                          placeholder="Enter video intro URL"
                        />
                      </div>
                      <div className="form-group"> {/* Добавлено: resume link + upload */}
                        <label>Resume Link (optional):</label>
                        <input
                          type="url"
                          value={(profileData as JobSeekerProfile).resume || ''}
                          onChange={(e) => setProfileData({ ...profileData, resume: e.target.value })}
                          placeholder="https://example.com/resume.pdf"
                        />
                      </div>
                      <div className="form-group">
                        <label>Upload Resume File (PDF, DOC, DOCX):</label>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          ref={resumeRef}
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setResumeFile(file);
                          }}
                        />
                        <button type="button" onClick={() => resumeRef.current?.click()}>
                          Choose File
                        </button>
                        {resumeFile && <p>Selected: {resumeFile.name}</p>}
                        {resumeFile && (
                          <button type="button" onClick={handleUploadResume}>
                            Upload Resume
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p>
                        <strong>Skills:</strong>{' '}
                        {(profileData as JobSeekerProfile).skills?.map((skill) => skill.name).join(', ') || 'Not specified'}
                      </p>
                      <p><strong>Experience:</strong> {(profileData as JobSeekerProfile).experience || 'Not specified'}</p>
                      <p><strong>Description:</strong> {(profileData as JobSeekerProfile).description || 'Not specified'}</p>
                      <p><strong>Portfolio:</strong> {(profileData as JobSeekerProfile).portfolio || 'Not specified'}</p>
                      <p><strong>Video Introduction:</strong> {(profileData as JobSeekerProfile).video_intro || 'Not specified'}</p>
                      <p><strong>Resume:</strong> {(profileData as JobSeekerProfile).resume ? (
                        <a
                          href={(profileData as JobSeekerProfile).resume?.startsWith('http') 
                            ? (profileData as JobSeekerProfile).resume 
                            : `https://jobforge.net/backend${(profileData as JobSeekerProfile).resume}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Download Resume <FaFilePdf />
                        </a>
                      ) : 'Not specified'}</p>
                    </>
                  )}
                </>
              )}
            </div>
            {isEditing && (
              <div className="action-buttons">
                <button onClick={handleUpdateProfile} className="action-button success">
                  Save Profile
                </button>
                <button onClick={() => setIsEditing(false)} className="action-button">
                  Cancel
                </button>
              </div>
            )}
   {(profileData.role === 'employer' || profileData.role === 'jobseeker') && (
  <div className="profile-reviews-full-width">
    <h3>Reviews</h3>
    {profileData.reviews?.length ? (
      <ul>
        {profileData.reviews.map((review: Review) => ( // Добавлена типизация для review
          <li key={review.id}>
            <p><strong>Rating:</strong> {review.rating}</p>
            <p><strong>Comment:</strong> {review.comment}</p>
            <p><strong>Reviewer:</strong> {review.reviewer?.username || 'Anonymous'}</p>
            <p><strong>Date:</strong> {review.created_at}</p>
          </li>
        ))}
      </ul>
    ) : (
      <p>No reviews yet.</p>
    )}
    <p><strong>Reviews:</strong> <Link to={`/reviews/${profileData.id}`}>View all reviews</Link></p>
  </div>
)}
          </div>
          {!isEditing && (
            <div className="profile-buttons">
              <button onClick={() => setIsEditing(true)} className="action-button">
                Edit Profile
              </button>
              <button onClick={handleDeleteAccount} className="action-button danger">
                Delete Account
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default ProfilePage;