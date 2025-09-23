import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import {
  getProfile,
  updateProfile,
  deleteAccount,
  getCategories,
  searchCategories,
  uploadAvatar,
  uploadResume,
} from '../services/api';
import { Profile, Category, JobSeekerProfile, EmployerProfile, Review } from '@types';
import { useRole } from '../context/RoleContext';
import {
  FaUserCircle, FaFilePdf, FaPen, FaCheck, FaTimes,
  FaLinkedin, FaInstagram, FaFacebook, FaWhatsapp, FaTelegramPlane
} from 'react-icons/fa';
import { AxiosError } from 'axios';
import Loader from '../components/Loader';
import '../styles/profile-page.css';
import {
  normalizeTelegram, normalizeWhatsApp,
  normalizeLinkedIn, normalizeInstagram, normalizeFacebook
} from '../utils/socials';


const USERNAME_RGX = /^[a-zA-Z0-9_.-]{3,20}$/; // простая валидация
type JobSeekerExtended = JobSeekerProfile & {
  expected_salary?: number | string | null;
  job_search_status?: 'actively_looking' | 'open_to_offers' | 'hired' | string | null;
  linkedin?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  whatsapp?: string | null;   // NEW
  telegram?: string | null;   // NEW
};

const ProfilePage: React.FC = () => {
  const { profile, refreshProfile } = useRole();
  const [profileData, setProfileData] = useState<Profile | null>(null);
  const originalRef = useRef<Profile | null>(null); // снимок для диффа
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false); // loader for Save

  // username inline edit
  const [usernameEditMode, setUsernameEditMode] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');

  const navigate = useNavigate();

  // --- skills autocomplete
  const [skillInput, setSkillInput] = useState('');
  const [filteredSkills, setFilteredSkills] = useState<Category[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // --- avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  // --- resume
  const resumeRef = useRef<HTMLInputElement>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // --- static sets
  const timezones = Intl.supportedValuesOf('timeZone').sort();
  const currencies = ['USD', 'EUR', 'GBP', 'JPY'];

  // ------- categories load
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await getCategories();
        const sortCategories = (items: Category[]): Category[] => {
          const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
          sorted.forEach(cat => {
            if (cat.subcategories) cat.subcategories = sortCategories(cat.subcategories);
          });
          return sorted;
        };
        setCategories(sortCategories(cats));
      } catch (e) {
        console.error('Error fetching categories:', e);
      }
    };
    fetchCategories();
  }, []);

  // ------- categories search (autocomplete)
  useEffect(() => {
    const searchCategoriesAsync = async () => {
      if (skillInput.trim() === '') {
        setFilteredSkills([]);
        setIsDropdownOpen(false);
        return;
      }
      try {
        const response = await searchCategories(skillInput);
        const sorted = response.sort((a, b) => a.name.localeCompare(b.name));
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

  // ------- profile + categories
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
        const [pData, cats] = await Promise.all([getProfile(), getCategories()]);
        setProfileData(pData);
        originalRef.current = pData; // снимок для сравнения
        setCategories(cats || []);
        setUsernameDraft(pData.username || '');
        if (pData.role === 'jobseeker') {
          setSelectedSkillIds((pData as JobSeekerProfile).skills?.map((s: Category) => s.id) || []);
        }
      } catch (e: any) {
        console.error('Error fetching data:', e);
        setError(e?.response?.data?.message || 'Failed to load profile or categories.');
      } finally {
        setIsLoading(false);
      }
    };

    if (profile) {
      setProfileData(profile);
      originalRef.current = profile;
      setUsernameDraft(profile.username || '');
      fetchData();
    } else {
      fetchData();
    }
  }, [profile]);

  // ------- save profile
  const handleUpdateProfile = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!profileData) return;

    const usernameToSave = (usernameEditMode ? usernameDraft.trim() : (profileData.username || '')).trim();
    if (usernameToSave && !USERNAME_RGX.test(usernameToSave)) {
      setFormError('Username must be 3-20 chars and contain only letters, numbers, ".", "-", "_".');
      return;
    }

    setFormError(null);
    setIsSaving(true); // общий лоадер на кнопку

    try {
      const orig = originalRef.current;

      if (profileData.role === 'jobseeker') {
        // validate salary
        const salaryRaw = (profileData as any).expected_salary;
        let expectedSalaryNum: number | undefined = undefined;
        if (salaryRaw !== '' && salaryRaw != null) {
          const parsed = Number(salaryRaw);
          if (!Number.isFinite(parsed) || parsed < 0) {
            setFormError('Expected salary must be a non-negative number');
            return;
          }
          expectedSalaryNum = Math.round(parsed * 100) / 100;
        }

        const now = profileData as JobSeekerExtended;
const o   = (orig as JobSeekerExtended | null);

const changed = <K extends keyof JobSeekerExtended>(key: K, val: JobSeekerExtended[K]) =>
  o ? o[key] !== val : val !== undefined;

        const skillsIdsNow  = (now.skills || []).map((s: Category) => s.id);
        const skillsIdsOrig = (o?.skills || []).map((s: Category) => s.id);
        const skillsChanged =
          skillsIdsNow.length !== skillsIdsOrig.length ||
          skillsIdsNow.some((id, i) => id !== skillsIdsOrig[i]);

        const patch: any = { role: 'jobseeker' }; // на бэке бывает нужно
        if (changed('username', usernameToSave))             patch.username         = usernameToSave;
        if (changed('timezone', now.timezone))               patch.timezone         = now.timezone;
        if (changed('currency', now.currency))               patch.currency         = now.currency;
        if (changed('expected_salary', expectedSalaryNum))   patch.expected_salary  = expectedSalaryNum;
        if (changed('job_search_status', (now as any).job_search_status || 'open_to_offers'))
                                                             patch.job_search_status = (now as any).job_search_status || 'open_to_offers';
        if (skillsChanged)                                   patch.skillIds         = skillsIdsNow;
        if (changed('experience', now.experience))           patch.experience       = now.experience;
        if (changed('description', now.description))         patch.description      = now.description;
        if (changed('portfolio', now.portfolio))             patch.portfolio        = now.portfolio;
        if (changed('video_intro', now.video_intro))         patch.video_intro      = now.video_intro;
        if (changed('resume', now.resume))                   patch.resume           = now.resume;


        if (changed('linkedin',  now.linkedin ?? null))    patch.linkedin  = now.linkedin  || null;
        if (changed('instagram', now.instagram ?? null))   patch.instagram = now.instagram || null;
        if (changed('facebook',  now.facebook ?? null))    patch.facebook  = now.facebook  || null;
        if (changed('whatsapp',  now.whatsapp ?? null))    patch.whatsapp  = now.whatsapp  || null;   // NEW
        if (changed('telegram',  now.telegram ?? null))    patch.telegram  = now.telegram  || null;   // NEW


        // если нечего менять — просто выходим из режима редактирования
        if (Object.keys(patch).length <= 1) { // только role
          setIsEditing(false);
          setUsernameEditMode(false);
          setIsSaving(false);
          return;
        }

        const updated = await updateProfile(patch);
        setProfileData(updated);
        originalRef.current = updated;
        setUsernameDraft(updated.username || usernameToSave);

        alert('The changes are saved');
      } else if (profileData.role === 'employer') {
        // для работодателя тоже шлём только изменённое
        const now = profileData as EmployerProfile;
        const o   = (orig as EmployerProfile | null);
        const changed = <T,>(k: keyof EmployerProfile, v: T) => o ? (o as any)[k] !== v : v !== undefined;

        const patch: any = { role: 'employer' };
        if (changed('username', usernameToSave))              patch.username     = usernameToSave;
        if (changed('timezone', now.timezone))                patch.timezone     = now.timezone;
        if (changed('currency', now.currency))                patch.currency     = now.currency;
        if (changed('company_name', now.company_name))        patch.company_name = now.company_name;
        if (changed('company_info', now.company_info))        patch.company_info = now.company_info;
        if (changed('referral_link', now.referral_link))      patch.referral_link = now.referral_link;

        if (Object.keys(patch).length <= 1) {
          setIsEditing(false);
          setUsernameEditMode(false);
          setIsSaving(false);
          return;
        }

        const updated = await updateProfile(patch);
        setProfileData(updated);
        originalRef.current = updated;
        setUsernameDraft(updated.username || usernameToSave);
      } else {
        // generic
        const now = profileData as Profile;
        const o   = (orig as Profile | null);
        const changed = <T,>(k: keyof Profile, v: T) => o ? (o as any)[k] !== v : v !== undefined;

        const patch: any = {};
        if (changed('username', usernameToSave)) patch.username = usernameToSave;
        if (changed('timezone', now.timezone))   patch.timezone = now.timezone;
        if (changed('currency', now.currency))   patch.currency = now.currency;

        if (Object.keys(patch).length === 0) {
          setIsEditing(false);
          setUsernameEditMode(false);
          setIsSaving(false);
          return;
        }

        const updated = await updateProfile(patch);
        setProfileData(updated);
        originalRef.current = updated;
        setUsernameDraft(updated.username || usernameToSave);
      }

      setUsernameEditMode(false);
      setIsEditing(false);
      await refreshProfile();
    } catch (e: any) {
      console.error('Error updating profile:', e);
      if (e?.response?.status === 400 && profileData.role === 'jobseeker') {
        setFormError('Invalid value');
      } else {
        setFormError(e?.response?.data?.message || 'Failed to update profile.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ------- resume upload
  const handleUploadResume = async () => {
    if (!resumeFile) return;
    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      const updated = await uploadResume(formData);
      setProfileData(updated);
      originalRef.current = updated;
      setResumeFile(null);
      await refreshProfile();
    } catch (e: any) {
      setFormError(e?.response?.data?.message || 'Failed to upload resume.');
    }
  };

  // ------- avatar upload
  const uploadAvatarFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const updated = await uploadAvatar(formData);
      setProfileData(updated);
      originalRef.current = updated;
      setAvatarFile(null);
      await refreshProfile();
    } catch (e) {
      console.error('Error uploading avatar:', e);
    }
  };

  function canShowReviews(
    p: Profile
  ): p is (EmployerProfile | JobSeekerProfile) & { reviews?: Review[] } {
    return p.role === 'employer' || p.role === 'jobseeker';
  }

  // ------- delete account
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
    } catch (e: any) {
      console.error('Error deleting account:', e);
      setFormError(e?.response?.data?.message || 'Failed to delete account.');
    }
  };

  if (isLoading) return <Loader />;
  if (error) return <div className="pf-shell"><div className="pf-alert pf-err">{error}</div></div>;
  if (!profileData) return <div className="pf-shell"><div className="pf-alert pf-err">Profile data is unavailable.</div></div>;

  return (
    <div>
      <Header />

      <div className="pf-shell">
        <div className="pf-card">
          <div className="pf-header">
            <h1 className="pf-title">My Profile <span className="pf-role">| {profileData.role}</span></h1>
            {!isEditing && (
              <div className="pf-actions-top">
                <button className="pf-button" onClick={() => setIsEditing(true)}>Edit Profile</button>
                {/* <button className="pf-button pf-danger" onClick={handleDeleteAccount}>Delete Account</button> */}
              </div>
            )}
          </div>

          {formError && <div className="pf-alert pf-err">{formError}</div>}

          <div className="pf-grid">
            {/* LEFT: avatar & general */}
            <div className="pf-col pf-left">
              <div
                className="pf-avatar-wrap"
                onClick={() => avatarRef.current?.click()}
                title="Click to upload avatar"
              >
                {profileData.avatar ? (
                  <img
                    src={`https://jobforge.net/backend${profileData.avatar}`}
                    alt="Avatar"
                    className="pf-avatar"
                  />
                ) : (
                  <div className="pf-avatar-placeholder">
                    <FaUserCircle className="pf-avatar-icon" />
                    <span className="pf-avatar-add">+</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  ref={avatarRef}
                  className="pf-file-hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAvatarFile(file);
                      if (!isEditing) {
                        uploadAvatarFile(file);
                      }
                    }
                  }}
                />
              </div>

              {avatarFile && isEditing && (
                <button className="pf-button pf-secondary" onClick={() => uploadAvatarFile(avatarFile)}>
                  Upload Avatar
                </button>
              )}

              <div className="pf-section">
                {!isEditing ? (
                  <div className="pf-kv">
                    <div className="pf-kv-row"><span className="pf-k">Username</span><span className="pf-v">{profileData.username}</span></div>
                    <div className="pf-kv-row"><span className="pf-k">Timezone</span><span className="pf-v">{profileData.timezone || 'Not specified'}</span></div>
                    <div className="pf-kv-row"><span className="pf-k">Currency</span><span className="pf-v">{profileData.currency || 'Not specified'}</span></div>
                    {(profileData as any).expected_salary != null &&
                      (profileData as any).expected_salary !== '' &&
                      Number((profileData as any).expected_salary) !== 0 && (
                        <div className="pf-kv-row">
                          <span className="pf-k">Expected salary</span>
                          <span className="pf-v">
                            {(profileData as any).expected_salary} {profileData.currency || ''}
                          </span>
                        </div>
                      )}
                  </div>
                ) : (
                  <>
                    {/* Username inline edit with small icon */}
                    <div className="pf-row pf-username-row">
                      <label className="pf-label">Username</label>

                      {!usernameEditMode ? (
                        <div className="pf-inline-edit">
                          <span className="pf-inline-value">{profileData.username || '—'}</span>
                          <button
                            type="button"
                            className="pf-icon-btn"
                            title="Edit username"
                            onClick={() => {
                              setUsernameDraft(profileData.username || '');
                              setUsernameEditMode(true);
                            }}
                          >
                            <FaPen />
                          </button>
                        </div>
                      ) : (
                        <div className="pf-inline-edit">
                          <input
                            className="pf-input"
                            type="text"
                            value={usernameDraft}
                            onChange={(e) => setUsernameDraft(e.target.value)}
                            placeholder="Choose a username"
                          />
                          <button
                            type="button"
                            className="pf-icon-btn pf-ok"
                            title="Save username"
                            onClick={() => {
                              if (usernameDraft && !USERNAME_RGX.test(usernameDraft.trim())) {
                                setFormError('Username must be 3-20 chars and contain only letters, numbers, ".", "-", "_".');
                                return;
                              }
                              setProfileData({ ...(profileData as any), username: usernameDraft.trim() } as any);
                              setUsernameEditMode(false);
                            }}
                          >
                            <FaCheck />
                          </button>
                          <button
                            type="button"
                            className="pf-icon-btn pf-danger"
                            title="Cancel"
                            onClick={() => {
                              setUsernameDraft(profileData.username || '');
                              setUsernameEditMode(false);
                            }}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pf-row">
                      <label className="pf-label">Timezone</label>
                      <select
                        value={profileData.timezone || ''}
                        onChange={(e) => setProfileData({ ...(profileData as any), timezone: e.target.value } as any)}
                        className="pf-select"
                      >
                        <option value="" disabled>Select timezone</option>
                        {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                      </select>
                    </div>

                    {/* Currency + Expected salary side-by-side */}
                    <div className="pf-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label className="pf-label">Currency</label>
                        <select
                          value={profileData.currency || ''}
                          onChange={(e) => setProfileData({ ...(profileData as any), currency: e.target.value } as any)}
                          className="pf-select"
                        >
                          <option value="" disabled>Select currency</option>
                          {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="pf-label">Expected salary</label>
                        <input
                          className="pf-input"
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          placeholder="e.g., 4000"
                          value={(profileData as any).expected_salary ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setProfileData({ ...(profileData as any), expected_salary: '' } as any);
                              return;
                            }
                            setProfileData({ ...(profileData as any), expected_salary: raw } as any);
                          }}
                        />
                      </div>
                    </div>
                    <p className="pf-help" style={{ marginTop: 6 }}>
                      Enter your expected salary amount. Currency is selected above. No automatic currency conversion is applied.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT: employer/jobseeker specifics */}
            <div className="pf-col pf-right">
              {profileData.role === 'employer' && (
                <div className="pf-section">
                  {!isEditing ? (
                    <div className="pf-kv">
                      <div className="pf-kv-row"><span className="pf-k">Company Name</span><span className="pf-v">{(profileData as EmployerProfile).company_name || 'Not specified'}</span></div>
                      <div className="pf-kv-row"><span className="pf-k">Company Info</span><span className="pf-v">{(profileData as EmployerProfile).company_info || 'Not specified'}</span></div>
                      <div className="pf-kv-row"><span className="pf-k">Referral Link</span><span className="pf-v">{(profileData as EmployerProfile).referral_link || 'Not specified'}</span></div>
                    </div>
                  ) : (
                    <>
                      <div className="pf-row">
                        <label className="pf-label">Company Name</label>
                        <input
                          className="pf-input"
                          type="text"
                          value={(profileData as EmployerProfile).company_name || ''}
                          onChange={(e) => setProfileData({ ...(profileData as any), company_name: e.target.value } as any)}
                          placeholder="Enter company name"
                        />
                      </div>
                      <div className="pf-row">
                        <label className="pf-label">Company Info</label>
                        <textarea
                          className="pf-textarea"
                          rows={4}
                          value={(profileData as EmployerProfile).company_info || ''}
                          onChange={(e) => setProfileData({ ...(profileData as any), company_info: e.target.value } as any)}
                          placeholder="Enter company information"
                        />
                      </div>
                      <div className="pf-row">
                        <label className="pf-label">Referral Link</label>
                        <input
                          className="pf-input"
                          type="text"
                          value={(profileData as EmployerProfile).referral_link || ''}
                          onChange={(e) => setProfileData({ ...(profileData as any), referral_link: e.target.value } as any)}
                          placeholder="Enter referral link"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {profileData.role === 'jobseeker' && (
                <div className="pf-section">
                  {!isEditing ? (
                    <div className="pf-kv pf-kv-vertical">
                      {/* Job status row */}
                      <div className="pf-kv-row">
                        <span className="pf-k">Job status</span>
                        <span className="pf-v">
                          {(() => {
                            const v = (profileData as any).job_search_status || 'open_to_offers';
                            const label =
                              v === 'actively_looking' ? 'Actively looking' :
                              v === 'hired' ? 'Hired' :
                              'Open to offers';
                            const color =
                              v === 'actively_looking' ? '#14804a' : // success
                              v === 'hired' ? '#6b7280' :            // neutral
                              '#2563eb';                               // info
                            return <span style={{ padding: '2px 8px', borderRadius: 999, background: `${color}20`, color }}>{label}</span>;
                          })()}
                        </span>
                      </div>
                      <div className="pf-kv-row"><span className="pf-k">Skills</span><span className="pf-v">{(profileData as JobSeekerProfile).skills?.map(s => s.name).join(', ') || 'Not specified'}</span></div>
                      <div className="pf-kv-row"><span className="pf-k">Experience</span><span className="pf-v">{(profileData as JobSeekerProfile).experience || 'Not specified'}</span></div>
                      <div className="pf-kv-row"><span className="pf-k">Description</span><span className="pf-v">{(profileData as JobSeekerProfile).description || 'Not specified'}</span></div>

                      {/* Socials */}
{(((profileData as any).linkedin) || ((profileData as any).instagram) || ((profileData as any).facebook) ||
  ((profileData as any).whatsapp) || ((profileData as any).telegram)) && (
  <div className="pf-kv-row pf-socials-row">
    <span className="pf-k">Socials</span>
    <span className="pf-v">
      <div className="pf-socials">
  {(profileData as any).linkedin && (
  <a className="pf-soc pf-linkedin" href={normalizeLinkedIn((profileData as any).linkedin)} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
    <FaLinkedin />
  </a>
)}
{(profileData as any).instagram && (
  <a className="pf-soc pf-instagram" href={normalizeInstagram((profileData as any).instagram)} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
    <FaInstagram />
  </a>
)}
{(profileData as any).facebook && (
  <a className="pf-soc pf-facebook" href={normalizeFacebook((profileData as any).facebook)} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
    <FaFacebook />
  </a>
)}
{(profileData as any).whatsapp && (
  <a className="pf-soc pf-whatsapp" href={normalizeWhatsApp((profileData as any).whatsapp)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
    <FaWhatsapp />
  </a>
)}
{(profileData as any).telegram && (
  <a className="pf-soc pf-telegram" href={normalizeTelegram((profileData as any).telegram)} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
    <FaTelegramPlane />
  </a>
)}

      </div>
    </span>
  </div>
)}


                      <div className="pf-kv-row"><span className="pf-k">Portfolio</span><span className="pf-v">{(profileData as JobSeekerProfile).portfolio || 'Not specified'}</span></div>
                      <div className="pf-kv-row"><span className="pf-k">Video Intro</span><span className="pf-v">{(profileData as JobSeekerProfile).video_intro || 'Not specified'}</span></div>
                      <div className="pf-kv-row">
                        <span className="pf-k">Resume</span>
                        <span className="pf-v">
                          {(profileData as JobSeekerProfile).resume ? (
                            (() => {
                              const resume = (profileData as JobSeekerProfile).resume ?? '';
                              const href = resume.startsWith('http')
                                ? resume
                                : `https://jobforge.net/backend${resume}`;
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="pf-link"
                                >
                                  Download Resume <FaFilePdf />
                                </a>
                              );
                            })()
                          ) : (
                            'Not specified'
                          )}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Skills */}
                      <div className="pf-row">
                        <label className="pf-label">Skills</label>
                        <div className="pf-ac-wrap">
                          <input
                            className="pf-input"
                            type="text"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            placeholder="Type to search skills…"
                            onFocus={() => setIsDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                          />
                          {isDropdownOpen && (
                            <ul className="pf-ac-dropdown">
                              {(skillInput.trim() ? filteredSkills : categories).map(cat => (
                                <React.Fragment key={cat.id}>
                                  <li
                                    className="pf-ac-item"
                                    onMouseDown={() => {
                                      if (!selectedSkillIds.includes(cat.id)) {
                                        const newSkill: Category = {
                                          id: cat.id,
                                          name: cat.name,
                                          parent_id: cat.parent_id || null,
                                          created_at: cat.created_at,
                                          updated_at: cat.updated_at,
                                          subcategories: [],
                                        };
                                        setSelectedSkillIds([...selectedSkillIds, cat.id]);
                                        setProfileData({
                                          ...(profileData as any),
                                          skills: ([...(((profileData as JobSeekerProfile).skills) || []), newSkill]),
                                        } as any);
                                      }
                                      setSkillInput('');
                                      setIsDropdownOpen(false);
                                    }}
                                  >
                                    {cat.name}
                                  </li>

                                  {cat.subcategories?.map(sub => (
                                    <li
                                      key={sub.id}
                                      className="pf-ac-item pf-ac-sub"
                                      onMouseDown={() => {
                                        if (!selectedSkillIds.includes(sub.id)) {
                                          const newSkill: Category = {
                                            id: sub.id,
                                            name: sub.name,
                                            parent_id: sub.parent_id || null,
                                            created_at: sub.created_at,
                                            updated_at: sub.updated_at,
                                            subcategories: [],
                                          };
                                          setSelectedSkillIds([...selectedSkillIds, sub.id]);
                                          setProfileData({
                                            ...(profileData as any),
                                            skills: ([...(((profileData as JobSeekerProfile).skills) || []), newSkill]),
                                          } as any);
                                        }
                                        setSkillInput('');
                                        setIsDropdownOpen(false);
                                      }}
                                    >
                                      {`${cat.name} > ${sub.name}`}
                                    </li>
                                  ))}
                                </React.Fragment>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="pf-tags">
                          {(profileData as JobSeekerProfile).skills?.map(skill => (
                            <span key={skill.id} className="pf-tag">
                              {skill.parent_id
                                ? `${categories.find(c => c.id === skill.parent_id)?.name || 'Category'} > ${skill.name}`
                                : skill.name}
                              <span
                                className="pf-tag-x"
                                onClick={() => {
                                  const updatedSkills = (profileData as JobSeekerProfile).skills?.filter(s => s.id !== skill.id) || [];
                                  const updatedIds = selectedSkillIds.filter(id => id !== skill.id);
                                  setProfileData({ ...(profileData as any), skills: updatedSkills } as any);
                                  setSelectedSkillIds(updatedIds);
                                }}
                              >
                                ×
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pf-row">
                        <label className="pf-label">Job status</label>
                        <select
                          className="pf-select"
                          value={(profileData as any).job_search_status || 'open_to_offers'}
                          onChange={(e) =>
                            setProfileData({ ...(profileData as any), job_search_status: e.target.value } as any)
                          }
                        >
                          <option value="actively_looking">Actively looking</option>
                          <option value="open_to_offers">Open to offers</option>
                          <option value="hired">Hired</option>
                        </select>
                      </div>

                      {/* Experience */}
                      <div className="pf-row">
                        <label className="pf-label">Experience</label>
                        <select
                          className="pf-select"
                          value={(profileData as JobSeekerProfile).experience || ''}
                          onChange={(e) => setProfileData({ ...(profileData as any), experience: e.target.value } as any)}
                        >
                          <option value="" disabled>Select experience level</option>
                          <option value="Less than 1 year">Less than 1 year</option>
                          <option value="1-2 years">1-2 years</option>
                          <option value="2-3 years">2-3 years</option>
                          <option value="3-6 years">3-6 years</option>
                          <option value="6+ years">6+ years</option>
                        </select>
                      </div>

                      {/* Description */}
                      <div className="pf-row">
                        <label className="pf-label">Description</label>
                        <textarea
                          className="pf-textarea"
                          rows={4}
                          value={(profileData as JobSeekerProfile).description || ''}
                          onChange={(e) => setProfileData({ ...(profileData as any), description: e.target.value } as any)}
                          placeholder="Tell a bit about yourself…"
                        />
                      </div>

                      {/* Portfolio */}
                      <div className="pf-row">
                        <label className="pf-label">Portfolio</label>
                        <input
                          className="pf-input"
                          type="text"
                          value={(profileData as JobSeekerProfile).portfolio || ''}
                          onChange={(e) => setProfileData({ ...(profileData as any), portfolio: e.target.value } as any)}
                          placeholder="Enter portfolio URL"
                        />
                      </div>

                      {/* Video Intro */}
                      <div className="pf-row">
                        <label className="pf-label">Video Introduction</label>
                        <input
                          className="pf-input"
                          type="text"
                          value={(profileData as JobSeekerProfile).video_intro || ''}
                          onChange={(e) => setProfileData({ ...(profileData as any), video_intro: e.target.value } as any)}
                          placeholder="Enter video URL"
                        />
                      </div>

                      {/* Resume link + file upload */}
                      <div className="pf-row">
                        <label className="pf-label">Resume Link (optional)</label>
                        <input
                          className="pf-input"
                          type="url"
                          value={(profileData as JobSeekerProfile).resume || ''}
                          onChange={(e) => setProfileData({ ...(profileData as any), resume: e.target.value } as any)}
                          placeholder="https://example.com/resume.pdf"
                        />
                      </div>

                      {/* Socials (optional) */}
                    <div className="pf-row">
  <label className="pf-label">Socials (optional)</label>

  {/* 2 колонки: LinkedIn / Instagram */}
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
    <div>
      <div className="pf-label" style={{ fontWeight: 700, fontSize: 12, opacity: .8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <FaLinkedin /> LinkedIn
      </div>
      <input
        className="pf-input"
        type="url"
        placeholder="https://www.linkedin.com/in/username"
        value={(profileData as any).linkedin || ''}
        onChange={(e) => setProfileData({ ...(profileData as any), linkedin: e.target.value } as any)}
      />
    </div>
    <div>
      <div className="pf-label" style={{ fontWeight: 700, fontSize: 12, opacity: .8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <FaInstagram /> Instagram
      </div>
      <input
        className="pf-input"
        type="url"
        placeholder="https://www.instagram.com/username"
        value={(profileData as any).instagram || ''}
        onChange={(e) => setProfileData({ ...(profileData as any), instagram: e.target.value } as any)}
      />
    </div>
  </div>

  {/* Facebook */}
  <div style={{ marginTop: 12 }}>
    <div className="pf-label" style={{ fontWeight: 700, fontSize: 12, opacity: .8, display: 'flex', alignItems: 'center', gap: 6 }}>
      <FaFacebook /> Facebook
    </div>
    <input
      className="pf-input"
      type="url"
      placeholder="https://www.facebook.com/username"
      value={(profileData as any).facebook || ''}
      onChange={(e) => setProfileData({ ...(profileData as any), facebook: e.target.value } as any)}
    />
  </div>

  {/* NEW: WhatsApp / Telegram */}
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
    <div>
      <div className="pf-label" style={{ fontWeight: 700, fontSize: 12, opacity: .8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <FaWhatsapp /> WhatsApp
      </div>
      <input
        className="pf-input"
        type="text"
        placeholder="+12025550123 or link"
        value={(profileData as any).whatsapp || ''}
        onChange={(e) => setProfileData({ ...(profileData as any), whatsapp: e.target.value } as any)}
      />
    </div>
    <div>
      <div className="pf-label" style={{ fontWeight: 700, fontSize: 12, opacity: .8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <FaTelegramPlane /> Telegram
      </div>
      <input
        className="pf-input"
        type="text"
        placeholder="@username or https://t.me/username"
        value={(profileData as any).telegram || ''}
        onChange={(e) => setProfileData({ ...(profileData as any), telegram: e.target.value } as any)}
      />
    </div>
  </div>
</div>


                      <div className="pf-row">
                        <label className="pf-label">Upload Resume File (PDF, DOC, DOCX)</label>
                        <input
                          ref={resumeRef}
                          className="pf-file-hidden"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setResumeFile(file);
                          }}
                        />
                        <div className="pf-file-inline">
                          <button
                            type="button"
                            className="pf-button pf-secondary"
                            onClick={() => resumeRef.current?.click()}
                          >
                            Choose File
                          </button>
                          {resumeFile && <span className="pf-file-name">Selected: {resumeFile.name}</span>}
                          {resumeFile && (
                            <button
                              type="button"
                              className="pf-button"
                              onClick={handleUploadResume}
                            >
                              Upload Resume
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {isEditing && (
                <div className="pf-actions-bottom">
                  <button className="pf-button" onClick={handleUpdateProfile} disabled={isSaving}>
                    {isSaving ? 'Saving…' : 'Save Profile'}
                  </button>
                  <button
                    className="pf-button pf-secondary"
                    onClick={() => {
                      if (!isSaving) {
                        setIsEditing(false);
                        setUsernameEditMode(false);
                        setUsernameDraft(profileData.username || '');
                        // откатываем визуальные изменения к оригиналу
                        if (originalRef.current) setProfileData(originalRef.current);
                      }
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {profileData && canShowReviews(profileData) && (
          <div className="pf-card pf-card-reviews">
            <h2 className="pf-subtitle">Reviews</h2>

            {(profileData.reviews?.length ?? 0) > 0 ? (
              <ul className="pf-reviews-list">
                {profileData.reviews!.map((review: Review) => (
                  <li key={review.id} className="pf-review">
                    <div className="pf-review-row">
                      <span className="pf-k">Rating</span>
                      <span className="pf-v">{review.rating}</span>
                    </div>
                    <div className="pf-review-row">
                      <span className="pf-k">Comment</span>
                      <span className="pf-v">{review.comment}</span>
                    </div>
                    <div className="pf-review-row">
                      <span className="pf-k">Reviewer</span>
                      <span className="pf-v">{review.reviewer?.username || 'Anonymous'}</span>
                    </div>
                    <div className="pf-review-row">
                      <span className="pf-k">Date</span>
                      <span className="pf-v">
  {new Date(review.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',   // "Aug"
    day: '2-digit'    // "12"
  })}
</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="pf-muted">No reviews yet.</div>
            )}

            <div className="pf-reviews-link">
              <strong>Reviews:</strong>{' '}
              <Link className="pf-link" to={`/reviews/${profileData.id}`}>
                View all reviews
              </Link>
            </div>
          </div>
        )}
      </div>

      <Footer />
      <Copyright />
    </div>
  );
};

export default ProfilePage;
