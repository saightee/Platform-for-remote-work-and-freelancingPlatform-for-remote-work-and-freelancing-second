import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  getProfile,
  updateProfile,
  deleteAccount,
  getCategories,
  searchCategories,
  uploadAvatar,
  uploadResume,
  uploadPortfolioFiles,
  
} from '../services/api';

// import {
//   getProfile,
//   updateProfile,
//   deleteAccount,
//   getCategories,
//   searchCategories,
//   uploadAvatar,
//   uploadResume,
//   uploadPortfolioFiles,
//   isDevProfilePage,
// } from '../services/api.profile-dev';

import { Profile, Category, JobSeekerProfile, EmployerProfile, Review } from '@types';
import { useRole } from '../context/RoleContext';
import {
  FaUserCircle, FaFilePdf, FaPen, FaCheck, FaTimes,
  FaLinkedin, FaInstagram, FaFacebook, FaWhatsapp, FaTelegramPlane, FaLanguage, FaMapMarkerAlt, FaBirthdayCake, 
} from 'react-icons/fa';
import { AxiosError } from 'axios';
import Loader from '../components/Loader';
import '../styles/profile-page.css';
import '../styles/photoGallery.css';
import {
  normalizeTelegram, normalizeWhatsApp,
  normalizeLinkedIn, normalizeInstagram, normalizeFacebook
} from '../utils/socials';
import { brandOrigin } from '../brand';
import TagsInput from '../components/TagsInput';
import CountrySelect from '../components/inputs/CountrySelect';
import LanguagesInput from '../components/inputs/LanguagesInput';
import '../styles/country-langs.css';
import DOMPurify from 'dompurify';


const USERNAME_RGX = /^[a-zA-Z0-9_.-]{3,20}$/; // простая валидация
type JobSeekerExtended = JobSeekerProfile & {
  // сохраняем возможность строки из инпута
  expected_salary?: number | string | null;

  // дублируем совместимый тип
  job_search_status?: 'actively_looking' | 'open_to_offers' | 'hired' | string | null;
  date_of_birth?: string | null;
  // явно описываем поля, чтобы не было any
  country?: string | null;
  languages?: string[];

  linkedin?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  whatsapp?: string | null;
  telegram?: string | null;
  portfolio_files?: string[];
};

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
  const [jobExperienceHtml, setJobExperienceHtml] = useState<string>('');
  // username inline edit
  const [usernameEditMode, setUsernameEditMode] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

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

  const portfolioRef = useRef<HTMLInputElement>(null);
  const [portfolioUploadFiles, setPortfolioUploadFiles] = useState<FileList | null>(null);
  const isImageUrl = (u?: string) => !!u && /\.(jpe?g|png|webp)$/i.test(u);

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
  // useEffect(() => {
  //   const searchCategoriesAsync = async () => {
  //     if (skillInput.trim() === '') {
  //       setFilteredSkills([]);
  //       setIsDropdownOpen(false);
  //       return;
  //     }
  //     try {
  //       const response = await searchCategories(skillInput);
  //       const sorted = response.sort((a, b) => a.name.localeCompare(b.name));
  //       setFilteredSkills(sorted);
  //       setIsDropdownOpen(true);
  //     } catch (error) {
  //       const axiosError = error as AxiosError<{ message?: string }>;
  //       console.error('Error searching categories:', axiosError.response?.data?.message || axiosError.message);
  //       setFilteredSkills([]);
  //       setIsDropdownOpen(false);
  //     }
  //   };
  //   const d = setTimeout(searchCategoriesAsync, 300);
  //   return () => clearTimeout(d);
  // }, [skillInput]);

  useEffect(() => {
  const searchCategoriesAsync = async () => {
    if (skillInput.trim() === '') {
      setFilteredSkills([]);
      setIsDropdownOpen(false);
      return;
    }
    try {
      const response = await searchCategories(skillInput);
      const sorted = (response as Category[]).sort(
        (a: Category, b: Category) => a.name.localeCompare(b.name)
      );
      setFilteredSkills(sorted);
      setIsDropdownOpen(true);
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error(
        'Error searching categories:',
        axiosError.response?.data?.message || axiosError.message
      );
      setFilteredSkills([]);
      setIsDropdownOpen(false);
    }
  };
  const d = setTimeout(searchCategoriesAsync, 300);
  return () => clearTimeout(d);
}, [skillInput]);



  useEffect(() => {
    const token = localStorage.getItem('token');

    
    if (!token) {
      setError('You must be logged in to view this page.');
      setIsLoading(false);
      return;
    }


  //     useEffect(() => {
  //   const token = localStorage.getItem('token');

    
  //  if (!token && !isDevProfilePage) {
  //   setError('You must be logged in to view this page.');
  //   setIsLoading(false);
  //   return;
  // }


    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [pData, cats] = await Promise.all([getProfile(), getCategories()]);
        setProfileData(pData);
        originalRef.current = pData;
        setCategories(cats || []);
        setUsernameDraft(pData.username || '');
        if (pData.role === 'jobseeker') {
          setSelectedSkillIds((pData as JobSeekerProfile).skills?.map((s: Category) => s.id) || []);
          setJobExperienceHtml(((pData as any).job_experience as string) || '');
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

  //     const fetchData = async () => {
  //     try {
  //       setIsLoading(true);
  //       setError(null);
  //       const [pData, cats] = await Promise.all([getProfile(), getCategories()]);
  //       setProfileData(pData);
  //       originalRef.current = pData;
  //       setCategories(cats || []);
  //       setUsernameDraft(pData.username || '');
  //       if (pData.role === 'jobseeker') {
  //         setSelectedSkillIds((pData as JobSeekerProfile).skills?.map((s: Category) => s.id) || []);
  //         setJobExperienceHtml(((pData as any).job_experience as string) || '');
  //       }
  //     } catch (e: any) {
  //       console.error('Error fetching data:', e);
  //       setError(e?.response?.data?.message || 'Failed to load profile or categories.');
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  //   if (profile && !isDevProfilePage) {
  //     setProfileData(profile);
  //     originalRef.current = profile;
  //     setUsernameDraft(profile.username || '');
  //     fetchData();
  //   } else {
  //     fetchData();
  //   }
  // }, [profile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0] || null;
  if (!file) return;
  setAvatarFile(file);
};

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


       

        const toRichHtml = (t?: string | null): string | null => {
  const v = (t || '').trim();
  if (!v) return null;
  // разбиваем по пустым строкам и заворачиваем в <p>
  const parts = v.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  return parts.map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');

  if (changed('description', now.description)) {
  const rich = toRichHtml((now as any).description as string | undefined);
  patch.description = rich ?? null;
}
};

        if (changed('portfolio', now.portfolio))             patch.portfolio        = now.portfolio;

        if (Array.isArray((now as any).portfolio_files)) {
          const origList = Array.isArray((o as any)?.portfolio_files) ? (o as any).portfolio_files : [];
          const same =
            origList.length === (now as any).portfolio_files.length &&
            origList.every((v: string, i: number) => v === (now as any).portfolio_files[i]);
          if (!same) patch.portfolio_files = (now as any).portfolio_files;
        }

        if (changed('video_intro', now.video_intro))         patch.video_intro      = now.video_intro;
        if (changed('resume', now.resume))                   patch.resume           = now.resume;
        if (changed('country', now.country ?? undefined))    patch.country   = now.country ?? undefined;
        if (Array.isArray(now.languages))                    patch.languages = now.languages!;

        if (changed('date_of_birth', now.date_of_birth ?? null))         patch.date_of_birth    = now.date_of_birth ?? null;

        if (changed('linkedin',  now.linkedin ?? null))    patch.linkedin  = now.linkedin  || null;
        if (changed('instagram', now.instagram ?? null))   patch.instagram = now.instagram || null;
        if (changed('facebook',  now.facebook ?? null))    patch.facebook  = now.facebook  || null;
        if (changed('whatsapp',  now.whatsapp ?? null))    patch.whatsapp  = now.whatsapp  || null;   // NEW
        if (changed('telegram',  now.telegram ?? null))    patch.telegram  = now.telegram  || null;   // NEW

        const prevJobExp = (o?.job_experience ?? '') || '';
        const nextJobExp = jobExperienceHtml || '';
        if (prevJobExp !== nextJobExp) {
          patch.job_experience = nextJobExp.trim() === '' ? null : nextJobExp;
        }
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
         if (Array.isArray((now as any).languages))            patch.languages    = (now as any).languages;
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
  // generic (admin / moderator / affiliate ...)
  const now = profileData as Profile;
  const o   = (orig as Profile | null);

  type GenericKey = 'username' | 'timezone' | 'currency';
  const changed = (k: GenericKey, v: any) =>
    o ? (o as any)[k] !== v : v !== undefined;

  const patch: any = {};
  if (changed('username', usernameToSave))          patch.username = usernameToSave;
  if (changed('timezone', (now as any).timezone))   patch.timezone = (now as any).timezone;
  if (changed('currency', (now as any).currency))   patch.currency = (now as any).currency;


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

  // NEW: upload portfolio files via POST /profile/upload-portfolio
  const handleUploadPortfolio = async () => {
    if (!portfolioUploadFiles || !portfolioUploadFiles.length) return;
    try {
      const fd = new FormData();
      Array.from(portfolioUploadFiles).forEach(f => fd.append('portfolio_files', f));
      const updated = await uploadPortfolioFiles(fd);
      setProfileData(updated);
      originalRef.current = updated;
      setPortfolioUploadFiles(null);
      await refreshProfile();
    } catch (e: any) {
      setFormError(e?.response?.data?.message || 'Failed to upload portfolio files.');
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
  if (error)
    return (
      <div className="pf-shell">
        <div className="pf-alert pf-err">{error}</div>
      </div>
    );
  if (!profileData)
    return (
      <div className="pf-shell">
        <div className="pf-alert pf-err">Profile data is unavailable.</div>
      </div>
    );

  // --- gallery images (avatar + portfolio images) ---
  const galleryImages: string[] = (() => {
    const urls: string[] = [];

    if (profileData.avatar) {
      const a = profileData.avatar as string;
      urls.push(a.startsWith('http') ? a : `${brandOrigin()}/backend${a}`);
    }

    if (
      profileData.role === 'jobseeker' &&
      Array.isArray((profileData as any).portfolio_files)
    ) {
      (profileData as any).portfolio_files
        .filter((u: string) => isImageUrl(u))
        .forEach((u: string) => {
          urls.push(u.startsWith('http') ? u : `${brandOrigin()}/backend${u}`);
        });
    }

    return urls;
  })();

  const openGalleryAt = (idx: number) => {
    if (!galleryImages.length) return;
    const safeIndex = (idx + galleryImages.length) % galleryImages.length;
    setGalleryIndex(safeIndex);
    setGalleryOpen(true);
  };

  const handleAvatarClick = () => {
    if (!profileData?.avatar || isEditing) {
      avatarRef.current?.click();
      return;
    }
    openGalleryAt(0);
  };

  return (
    <div>
      <Header />

      <div className="pf-shell">
        <div className="pf-card">
          {/* HEADER */}
          <div className="pf-header">
            <h5 className="pf-title">
              {profileData.username}{' '}
              <span className="pf-role">| {profileData.role}</span>
            </h5>

            {!isEditing && (
              <div className="pf-actions-top">
                <button
                  className="pf-button"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>
                {/* <button className="pf-button pf-danger" onClick={handleDeleteAccount}>Delete Account</button> */}
              </div>
            )}
          </div>

          {formError && <div className="pf-alert pf-err">{formError}</div>}

          {/* TOP GRID: LEFT (avatar + basics) / RIGHT (summary) */}
          <div className="pf-grid">
            {/* LEFT COLUMN */}
            <div className="pf-col pf-left">
              {/* Avatar */}
              <div
                className="pf-avatar-wrap"
                onClick={handleAvatarClick}
                title={
                  profileData.avatar && !isEditing
                    ? 'Click to view photos'
                    : 'Click to upload avatar'
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleAvatarClick();
                  }
                }}
              >
                {profileData.avatar ? (
                  (() => {
                    const a = profileData.avatar || '';
                    const avatarSrc = a.startsWith('http')
                      ? a
                      : `${brandOrigin()}/backend${a}`;
                    return (
                      <img src={avatarSrc} alt="Avatar" className="pf-avatar" />
                    );
                  })()
                ) : (
                  <div className="pf-avatar-placeholder">
                    <FaUserCircle className="pf-avatar-icon" />
                    <span className="pf-avatar-add">+</span>
                  </div>
                )}
                <input
                  ref={avatarRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
              </div>

              {avatarFile && isEditing && (
                <button
                  className="pf-button pf-secondary"
                  onClick={() => uploadAvatarFile(avatarFile)}
                >
                  Upload Avatar
                </button>
              )}

              {/* Левая колонка: Username (в режиме редактирования), DOB, Country, Languages */}
              {profileData.role === 'jobseeker' && (
                <div className="pf-section">
                  {!isEditing ? (
                    <div className="pf-kv">
                      {/* DOB */}
                      {(profileData as any).date_of_birth && (
                        <div className="pf-kv-row">
                          <span className="pf-k">Age</span>
                          <span className="pf-v">
                            {(() => {
                              const dob = (profileData as any)
                                .date_of_birth as string;
                              const age = calcAge(dob);
                              return age != null
                                // ? `${dob} (${age} y.o.)`
                                ? `${age}`
                                : dob;
                            })()} 
                          </span>
                        </div>
                      )}

                      {/* Country */}
                      <div className="pf-kv-row">
                        <span className="pf-k">Country</span>
                        <span className="pf-v">
                          {(profileData as any).country_name ||
                            (profileData as any).country ||
                            'Not specified'}
                        </span>
                      </div>

                      {/* Languages */}
                      {Array.isArray((profileData as any).languages) &&
                        (profileData as any).languages.length > 0 && (
                          <div className="pf-kv-row">
                            <span className="pf-k">Languages</span>
                            <span className="pf-v">
                              {(profileData as any).languages.join(', ')}
                            </span>
                          </div>
                        )}
                    </div>
                  ) : (
                    <>
                      {/* Username inline edit */}
                      <div className="pf-row pf-username-row">
                        <label className="pf-label">Username</label>

                        {!usernameEditMode ? (
                          <div className="pf-inline-edit">
                            <span className="pf-inline-value">
                              {profileData.username || '—'}
                            </span>
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
                              onChange={(e) =>
                                setUsernameDraft(e.target.value)
                              }
                              placeholder="Choose a username"
                            />
                            <button
                              type="button"
                              className="pf-icon-btn pf-ok"
                              title="Save username"
                              onClick={() => {
                                if (
                                  usernameDraft &&
                                  !USERNAME_RGX.test(
                                    usernameDraft.trim(),
                                  )
                                ) {
                                  setFormError(
                                    'Username must be 3-20 chars and contain only letters, numbers, ".", "-", "_".',
                                  );
                                  return;
                                }
                                setProfileData({
                                  ...(profileData as any),
                                  username: usernameDraft.trim(),
                                } as any);
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
                                setUsernameDraft(
                                  profileData.username || '',
                                );
                                setUsernameEditMode(false);
                              }}
                            >
                              <FaTimes />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* DOB */}
                      <div className="pf-row">
                        <label className="pf-label">Age</label>
                        <input
                          className="pf-input"
                          type="date"
                          value={(profileData as any).date_of_birth || ''}
                          onChange={(e) =>
                            setProfileData(
                              {
                                ...(profileData as any),
                                date_of_birth: e.target.value,
                              } as any,
                            )
                          }
                          max={new Date().toISOString().slice(0, 10)}
                        />
                      </div>

                      {/* Country */}
                      <div className="pf-row">
                        
                        <CountrySelect
                          value={(profileData as any).country ?? undefined}
                          onChange={(code) =>
                            setProfileData(
                              {
                                ...(profileData as any),
                                country: code,
                              } as any,
                            )
                          }
                        />
                      </div>

                      {/* Languages */}
                      <div className="pf-row">
                        <LanguagesInput
                          value={
                            Array.isArray((profileData as any).languages)
                              ? (profileData as any).languages
                              : []
                          }
                          onChange={(langs) =>
                            setProfileData(
                              {
                                ...(profileData as any),
                                languages: langs,
                              } as any,
                            )
                          }
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Карточка мини-галереи из портфолио (thumbs под аватаром) */}
              {profileData.role === 'jobseeker' &&
                Array.isArray((profileData as any).portfolio_files) &&
                (profileData as any).portfolio_files.some(isImageUrl) && (
                  <div className="pf-carousel" style={{ marginTop: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        overflowX: 'auto',
                        paddingBottom: 4,
                      }}
                    >
                      {(profileData as any).portfolio_files
                        .filter(isImageUrl)
                        .map((u: string, i: number) => {
                          const src = u.startsWith('http')
                            ? u
                            : `${brandOrigin()}/backend${u}`;
                          const baseIndex = profileData.avatar ? 1 : 0;
                          const galleryIdx = baseIndex + i;

                          return (
                            <button
                              key={u + i}
                              type="button"
                              className="pf-gallery-thumb"
                              onClick={() => openGalleryAt(galleryIdx)}
                              style={{
                                width: 96,
                                height: 96,
                                borderRadius: 12,
                                overflow: 'hidden',
                                flex: '0 0 auto',
                                padding: 0,
                                border: 'none',
                                background: 'transparent',
                              }}
                            >
                              <img
                                src={src}
                                alt={`Photo ${i + 1}`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  objectPosition: 'center',
                                }}
                                loading="lazy"
                              />
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="pf-col pf-right">
              {/* EMPLOYER LAYOUT (оставляем примерно как было) */}
              {profileData.role === 'employer' && (
                <div className="pf-section">
                  {!isEditing ? (
                    <div className="pf-kv">
                      <div className="pf-kv-row">
                        <span className="pf-k">Company Name</span>
                        <span className="pf-v">
                          {(profileData as EmployerProfile).company_name ||
                            'Not specified'}
                        </span>
                      </div>
                      <div className="pf-kv-row">
                        <span className="pf-k">Company Info</span>
                        <span className="pf-v">
                          {(profileData as EmployerProfile).company_info ||
                            'Not specified'}
                        </span>
                      </div>
                      <div className="pf-kv-row">
                        <span className="pf-k">Referral Link</span>
                        <span className="pf-v">
                          {(profileData as EmployerProfile).referral_link ||
                            'Not specified'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="pf-row">
                        <label className="pf-label">Company Name</label>
                        <input
                          className="pf-input"
                          type="text"
                          value={
                            (profileData as EmployerProfile).company_name ||
                            ''
                          }
                          onChange={(e) =>
                            setProfileData(
                              {
                                ...(profileData as any),
                                company_name: e.target.value,
                              } as any,
                            )
                          }
                          placeholder="Enter company name"
                        />
                      </div>
                      <div className="pf-row">
                        <label className="pf-label">Company Info</label>
                        <textarea
                          className="pf-textarea"
                          rows={4}
                          value={
                            (profileData as EmployerProfile).company_info ||
                            ''
                          }
                          onChange={(e) =>
                            setProfileData(
                              {
                                ...(profileData as any),
                                company_info: e.target.value,
                              } as any,
                            )
                          }
                          placeholder="Enter company information"
                        />
                      </div>
                      <div className="pf-row">
                        <label className="pf-label">Referral Link</label>
                        <input
                          className="pf-input"
                          type="text"
                          value={
                            (profileData as EmployerProfile).referral_link ||
                            ''
                          }
                          onChange={(e) =>
                            setProfileData(
                              {
                                ...(profileData as any),
                                referral_link: e.target.value,
                              } as any,
                            )
                          }
                          placeholder="Enter referral link"
                        />
                      </div>
                    </>
                  )}

                  {/* Timezone / Currency для работодателя */}
                  <div className="pf-row">
                    <label className="pf-label">Timezone</label>
                    {!isEditing ? (
                      <div className="pf-v">
                        {profileData.timezone || 'Not specified'}
                      </div>
                    ) : (
                      <select
                        value={profileData.timezone || ''}
                        onChange={(e) =>
                          setProfileData(
                            {
                              ...(profileData as any),
                              timezone: e.target.value,
                            } as any,
                          )
                        }
                        className="pf-select"
                      >
                        <option value="" disabled>
                          Select timezone
                        </option>
                        {timezones.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="pf-row">
                    <label className="pf-label">Currency</label>
                    {!isEditing ? (
                      <div className="pf-v">
                        {profileData.currency || 'Not specified'}
                      </div>
                    ) : (
                      <select
                        value={profileData.currency || ''}
                        onChange={(e) =>
                          setProfileData(
                            {
                              ...(profileData as any),
                              currency: e.target.value,
                            } as any,
                          )
                        }
                        className="pf-select"
                      >
                        <option value="" disabled>
                          Select currency
                        </option>
                        {currencies.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {/* JOBSEEKER SUMMARY RIGHT */}
              {profileData.role === 'jobseeker' && (
                <div className="pf-section pf-summary">
                  {/* VIEW MODE */}
                  {!isEditing ? (
                    <div className="pf-kv pf-kv-vertical">
                      {/* Job status */}
                      <div className="pf-kv-row">
                        <span className="pf-k">Job status</span>
                        <span className="pf-v">
                          {(() => {
                            const v =
                              (profileData as any).job_search_status ||
                              'open_to_offers';
                            const label =
                              v === 'actively_looking'
                                ? 'Actively looking'
                                : v === 'hired'
                                ? 'Hired'
                                : 'Open to offers';
                            const color =
                              v === 'actively_looking'
                                ? '#14804a'
                                : v === 'hired'
                                ? '#6b7280'
                                : '#2563eb';
                            return (
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 10,
                                  background: `${color}20`,
                                  color,
                                }}
                              >
                                {label}
                              </span>
                            );
                          })()}
                        </span>
                      </div>

                      {/* Skills */}
                      <div className="pf-kv-row">
                        <span className="pf-k">Skills</span>
                        <span className="pf-v">
                          {(profileData as JobSeekerProfile).skills
                            ?.map((s) => s.name)
                            .join(', ') || 'Not specified'}
                        </span>
                      </div>

                      {/* Expected salary */}
                      {(profileData as any).expected_salary != null &&
                        (profileData as any).expected_salary !== '' &&
                        Number((profileData as any).expected_salary) !== 0 && (
                          <div className="pf-kv-row">
                            <span className="pf-k">Expected salary</span>
                            <span className="pf-v">
                              {(profileData as any).expected_salary}{' '}
                              {profileData.currency || ''}
                            </span>
                          </div>
                        )}

                      {/* Timezone */}
                      <div className="pf-kv-row">
                        <span className="pf-k">Timezone</span>
                        <span className="pf-v">
                          {profileData.timezone || 'Not specified'}
                        </span>
                      </div>

                      {/* Video intro */}
                      <div className="pf-kv-row">
                        <span className="pf-k">Video intro</span>
                        <span className="pf-v">
                          {(profileData as JobSeekerProfile).video_intro ||
                            'Not specified'}
                        </span>
                      </div>

                      {/* Resume */}
                      <div className="pf-kv-row">
                        <span className="pf-k">Resume</span>
                        <span className="pf-v">
                          {(profileData as JobSeekerProfile).resume ? (
                            (() => {
                              const resume =
                                (profileData as JobSeekerProfile).resume ??
                                '';
                              const href = resume.startsWith('http')
                                ? resume
                                : `${brandOrigin()}/backend${resume}`;
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

                      {/* Portfolio link */}
                      <div className="pf-kv-row">
                        <span className="pf-k">Portfolio link</span>
                        <span className="pf-v">
                          {(profileData as JobSeekerProfile).portfolio ||
                            'Not specified'}
                        </span>
                      </div>

                      {/* Socials icons */}
                      {(((profileData as any).linkedin ||
                        (profileData as any).instagram ||
                        (profileData as any).facebook ||
                        (profileData as any).whatsapp ||
                        (profileData as any).telegram) && (
                        <div className="pf-kv-row pf-socials-row">
                          <span className="pf-k">Socials</span>
                          <span className="pf-v">
                            <div className="pf-socials">
                              {(profileData as any).linkedin && (
                                <a
                                  className="pf-soc pf-linkedin"
                                  href={normalizeLinkedIn(
                                    (profileData as any).linkedin,
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label="LinkedIn"
                                >
                                  <FaLinkedin />
                                </a>
                              )}
                              {(profileData as any).instagram && (
                                <a
                                  className="pf-soc pf-instagram"
                                  href={normalizeInstagram(
                                    (profileData as any).instagram,
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label="Instagram"
                                >
                                  <FaInstagram />
                                </a>
                              )}
                              {(profileData as any).facebook && (
                                <a
                                  className="pf-soc pf-facebook"
                                  href={normalizeFacebook(
                                    (profileData as any).facebook,
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label="Facebook"
                                >
                                  <FaFacebook />
                                </a>
                              )}
                              {(profileData as any).whatsapp && (
                                <a
                                  className="pf-soc pf-whatsapp"
                                  href={normalizeWhatsApp(
                                    (profileData as any).whatsapp,
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label="WhatsApp"
                                >
                                  <FaWhatsapp />
                                </a>
                              )}
                              {(profileData as any).telegram && (
                                <a
                                  className="pf-soc pf-telegram"
                                  href={normalizeTelegram(
                                    (profileData as any).telegram,
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label="Telegram"
                                >
                                  <FaTelegramPlane />
                                </a>
                              )}
                            </div>
                          </span>
                        </div>
                      )) ||
                        null}
                    </div>
                  ) : (
                    /* EDIT MODE SUMMARY */
                    <div className="pf-summary-edit">
                      {/* Job status */}
                      <div className="pf-row">
                        <label className="pf-label">Job status</label>
                        <select
                          className="pf-select"
                          value={
                            (profileData as any).job_search_status ||
                            'open_to_offers'
                          }
                          onChange={(e) =>
                            setProfileData(
                              {
                                ...(profileData as any),
                                job_search_status: e.target.value,
                              } as any,
                            )
                          }
                        >
                          <option value="actively_looking">
                            Actively looking
                          </option>
                          <option value="open_to_offers">
                            Open to offers
                          </option>
                          <option value="hired">Hired</option>
                        </select>
                      </div>

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
        {(skillInput.trim() ? filteredSkills : categories).map(
          (cat: Category) => (
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
                      skills: ([
                        ...(((profileData as JobSeekerProfile).skills) || []),
                        newSkill,
                      ]),
                    } as any);
                  }
                  setSkillInput('');
                  setIsDropdownOpen(false);
                }}
              >
                {cat.name}
              </li>

              {cat.subcategories?.map((sub: Category) => (
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
                        skills: ([
                          ...(((profileData as JobSeekerProfile).skills) || []),
                          newSkill,
                        ]),
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
          ),
        )}
      </ul>
    )}
  </div>

  <div className="pf-tags">
    {(profileData as JobSeekerProfile).skills?.map((skill: Category) => (
      <span key={skill.id} className="pf-tag">
        {skill.parent_id
          ? `${
              categories.find((c) => c.id === skill.parent_id)?.name ||
              'Category'
            } > ${skill.name}`
          : skill.name}
        <span
          className="pf-tag-x"
          onClick={() => {
            const updatedSkills =
              (profileData as JobSeekerProfile).skills?.filter(
                (s) => s.id !== skill.id,
              ) || [];
            const updatedIds = selectedSkillIds.filter(
              (id) => id !== skill.id,
            );
            setProfileData({
              ...(profileData as any),
              skills: updatedSkills,
            } as any);
            setSelectedSkillIds(updatedIds);
          }}
        >
          ×
        </span>
      </span>
    ))}
  </div>
</div>


                      {/* Currency + Expected salary */}
                      <div className="pf-row pf-row-two">
                        <div>
                          <label className="pf-label">Currency</label>
                          <select
                            value={profileData.currency || ''}
                            onChange={(e) =>
                              setProfileData(
                                {
                                  ...(profileData as any),
                                  currency: e.target.value,
                                } as any,
                              )
                            }
                            className="pf-select"
                          >
                            <option value="" disabled>
                              Select currency
                            </option>
                            {currencies.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
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
                            value={
                              (profileData as any).expected_salary ?? ''
                            }
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                setProfileData(
                                  {
                                    ...(profileData as any),
                                    expected_salary: '',
                                  } as any,
                                );
                                return;
                              }
                              setProfileData(
                                {
                                  ...(profileData as any),
                                  expected_salary: raw,
                                } as any,
                              );
                            }}
                          />
                        </div>
                      </div>

                      {/* Timezone */}
                      <div className="pf-row">
                        <label className="pf-label">Timezone</label>
                        <select
                          value={profileData.timezone || ''}
                          onChange={(e) =>
                            setProfileData(
                              {
                                ...(profileData as any),
                                timezone: e.target.value,
                              } as any,
                            )
                          }
                          className="pf-select"
                        >
                          <option value="" disabled>
                            Select timezone
                          </option>
                          {timezones.map((tz) => (
                            <option key={tz} value={tz}>
                              {tz}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Video intro */}
                      <div className="pf-row">
                        <label className="pf-label">Video Introduction</label>
                        <input
                          className="pf-input"
                          type="text"
                          value={
                            (profileData as JobSeekerProfile).video_intro ||
                            ''
                          }
                          onChange={(e) =>
                            setProfileData(
                              {
                                ...(profileData as any),
                                video_intro: e.target.value,
                              } as any,
                            )
                          }
                          placeholder="Enter video URL"
                        />
                      </div>

                      {/* Resume link + upload */}
                      <div className="pf-row">
                        <label className="pf-label">
                          Resume Link (optional)
                        </label>
                        <input
                          className="pf-input"
                          type="url"
                          value={
                            (profileData as JobSeekerProfile).resume || ''
                          }
                          onChange={(e) =>
                            setProfileData(
                              {
                                ...(profileData as any),
                                resume: e.target.value,
                              } as any,
                            )
                          }
                          placeholder="https://example.com/resume.pdf"
                        />
                      </div>

                      <div className="pf-row">
                        <label className="pf-label">
                          Upload Resume File (PDF, DOC, DOCX)
                        </label>
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
                          {resumeFile && (
                            <span className="pf-file-name">
                              Selected: {resumeFile.name}
                            </span>
                          )}
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

                      {/* Portfolio link (URL) */}
                      <div className="pf-row">
                        <label className="pf-label">Portfolio link</label>
                        <input
                          className="pf-input"
                          type="text"
                          value={
                            (profileData as JobSeekerProfile).portfolio ||
                            ''
                          }
                          onChange={(e) =>
                            setProfileData(
                              {
                                ...(profileData as any),
                                portfolio: e.target.value,
                              } as any,
                            )
                          }
                          placeholder="Enter portfolio URL"
                        />
                      </div>

                      {/* Socials (edit) */}
                      <div className="pf-row">
                        <label className="pf-label">Socials (optional)</label>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 12,
                          }}
                        >
                          <div>
                            <div className="pf-label" style={{ fontSize: 12 }}>
                              <FaLinkedin /> LinkedIn
                            </div>
                            <input
                              className="pf-input"
                              type="url"
                              placeholder="https://www.linkedin.com/in/username"
                              value={(profileData as any).linkedin || ''}
                              onChange={(e) =>
                                setProfileData(
                                  {
                                    ...(profileData as any),
                                    linkedin: e.target.value,
                                  } as any,
                                )
                              }
                            />
                          </div>
                          <div>
                            <div className="pf-label" style={{ fontSize: 12 }}>
                              <FaInstagram /> Instagram
                            </div>
                            <input
                              className="pf-input"
                              type="url"
                              placeholder="https://www.instagram.com/username"
                              value={(profileData as any).instagram || ''}
                              onChange={(e) =>
                                setProfileData(
                                  {
                                    ...(profileData as any),
                                    instagram: e.target.value,
                                  } as any,
                                )
                              }
                            />
                          </div>
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <div className="pf-label" style={{ fontSize: 12 }}>
                            <FaFacebook /> Facebook
                          </div>
                          <input
                            className="pf-input"
                            type="url"
                            placeholder="https://www.facebook.com/username"
                            value={(profileData as any).facebook || ''}
                            onChange={(e) =>
                              setProfileData(
                                {
                                  ...(profileData as any),
                                  facebook: e.target.value,
                                } as any,
                              )
                            }
                          />
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 12,
                            marginTop: 12,
                          }}
                        >
                          <div>
                            <div
                              className="pf-label"
                              style={{ fontSize: 12 }}
                            >
                              <FaWhatsapp /> WhatsApp
                            </div>
                            <input
                              className="pf-input"
                              type="text"
                              placeholder="+12025550123 or link"
                              value={(profileData as any).whatsapp || ''}
                              onChange={(e) =>
                                setProfileData(
                                  {
                                    ...(profileData as any),
                                    whatsapp: e.target.value,
                                  } as any,
                                )
                              }
                            />
                          </div>
                          <div>
                            <div
                              className="pf-label"
                              style={{ fontSize: 12 }}
                            >
                              <FaTelegramPlane /> Telegram
                            </div>
                            <input
                              className="pf-input"
                              type="text"
                              placeholder="@username or https://t.me/username"
                              value={(profileData as any).telegram || ''}
                              onChange={(e) =>
                                setProfileData(
                                  {
                                    ...(profileData as any),
                                    telegram: e.target.value,
                                  } as any,
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* WIDE SECTIONS: BIO / JOB EXPERIENCE / PORTFOLIO (FILES) */}
          {profileData.role === 'jobseeker' && (
            <>
              {/* BIO */}
              <div className="pf-section-wide">
                <div className="pf-row">
                  <label className="pf-label pf-label-section">Bio</label>
                  {!isEditing ? (
                    (profileData as JobSeekerProfile).description ? (
                      <div
                        className="pf-richtext"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(
                            (profileData as JobSeekerProfile)
                              .description as string,
                          ),
                        }}
                      />
                    ) : (
                      <div className="pf-muted">Not specified</div>
                    )
                  ) : (
                    <textarea
                      className="pf-textarea"
                      rows={4}
                      value={
                        (profileData as JobSeekerProfile).description || ''
                      }
                      onChange={(e) =>
                        setProfileData(
                          {
                            ...(profileData as any),
                            description: e.target.value,
                          } as any,
                        )
                      }
                      placeholder="Tell a bit about yourself…"
                    />
                  )}
                </div>
              </div>

              {/* JOB EXPERIENCE */}
              <div className="pf-section-wide">
                <div className="pf-row">
                  <label className="pf-label pf-label-section">
                    Job experience
                  </label>
                  {!isEditing ? (
                    ((profileData as any).job_experience && (
                      <div
                        className="pf-richtext"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(
                            (profileData as any)
                              .job_experience as string,
                          ),
                        }}
                      />
                    )) || <div className="pf-muted">Not specified</div>
                  ) : (
                    <div className="pf-quill">
                      <ReactQuill
                        theme="snow"
                        value={jobExperienceHtml}
                        onChange={setJobExperienceHtml}
                        placeholder="This section can be auto-filled later."
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* PORTFOLIO FILES */}
              <div className="pf-section-wide">
                <div className="pf-row">
                  <label className="pf-label pf-label-section">
                    Portfolio
                  </label>

                  <div className="pf-row">
                    <label className="pf-label">Portfolio files</label>
                    {Array.isArray((profileData as any).portfolio_files) &&
                    (profileData as any).portfolio_files.length ? (
                      <ul className="pf-files-grid">
                        {(profileData as any).portfolio_files.map(
                          (u: string, i: number) => (
                            <li key={i} className="pf-file-pill">
                              <a
                                className="pf-link"
                                href={u}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {u}
                              </a>
                              {isEditing && (
                                <button
                                  type="button"
                                  className="pf-button pf-secondary"
                                  onClick={() => {
                                    const list = (
                                      (profileData as any)
                                        .portfolio_files || []
                                    ).filter(
                                      (_: string, idx: number) =>
                                        idx !== i,
                                    );
                                    setProfileData(
                                      {
                                        ...(profileData as any),
                                        portfolio_files: list,
                                      } as any,
                                    );
                                  }}
                                >
                                  Remove
                                </button>
                              )}
                            </li>
                          ),
                        )}
                      </ul>
                    ) : (
                      <div className="pf-muted">No files yet.</div>
                    )}
                 
                  </div>

                  {isEditing && (
                    <div className="pf-row">
                      <label className="pf-label">Upload more files</label>
                      <input
                        ref={portfolioRef}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/jpg,image/png,image/webp"
                        className="pf-file-hidden"
                        onChange={(e) =>
                          setPortfolioUploadFiles(e.target.files)
                        }
                      />
                      <div className="pf-file-inline">
                        <button
                          type="button"
                          className="pf-button pf-secondary"
                          onClick={() => portfolioRef.current?.click()}
                        >
                          Choose Files
                        </button>
                        {portfolioUploadFiles && (
                          <span className="pf-file-name">
                            Selected:{' '}
                            {Array.from(portfolioUploadFiles).length}
                          </span>
                        )}
                        {portfolioUploadFiles && (
                          <button
                            type="button"
                            className="pf-button"
                            onClick={handleUploadPortfolio}
                          >
                            Upload Files
                          </button>
                        )}
                      </div>
                      <div className="pf-note">
                        Up to 10 in total in your profile.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ACTION BUTTONS (общие для всех секций) */}
          {isEditing && (
            <div className="pf-actions-bottom">
              <button
                className="pf-button"
                onClick={handleUpdateProfile}
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : 'Save Profile'}
              </button>
              <button
                className="pf-button pf-secondary"
                onClick={() => {
                  if (!isSaving) {
                    setIsEditing(false);
                    setUsernameEditMode(false);
                    setUsernameDraft(profileData.username || '');
                    if (originalRef.current) setProfileData(originalRef.current);
                    setJobExperienceHtml(
                      ((originalRef.current as any)
                        .job_experience as string) || '',
                    );
                  }
                }}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* REVIEWS CARD */}
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
                      <span className="pf-v">
                        {review.reviewer?.username || 'Anonymous'}
                      </span>
                    </div>
                    <div className="pf-review-row">
                      <span className="pf-k">Date</span>
                      <span className="pf-v">
                        {new Date(review.created_at).toLocaleDateString(
                          undefined,
                          {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                          },
                        )}
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

      {/* GALLERY OVERLAY */}
      {galleryOpen && galleryImages.length > 0 && (
        <div
          className="img-gallery-overlay"
          onClick={() => setGalleryOpen(false)}
        >
          <div
            className="img-gallery"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="img-gallery__close"
              onClick={() => setGalleryOpen(false)}
              aria-label="Close gallery"
            >
              ×
            </button>

            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  className="img-gallery__arrow img-gallery__arrow--prev"
                  onClick={() =>
                    setGalleryIndex(
                      (galleryIndex - 1 + galleryImages.length) %
                        galleryImages.length,
                    )
                  }
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="img-gallery__arrow img-gallery__arrow--next"
                  onClick={() =>
                    setGalleryIndex(
                      (galleryIndex + 1) % galleryImages.length,
                    )
                  }
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            )}

            <div className="img-gallery__main">
              <img
                src={galleryImages[galleryIndex]}
                alt="Profile photo"
                className="img-gallery__main-img"
              />
            </div>

            {galleryImages.length > 1 && (
              <div className="img-gallery__thumbs">
                {galleryImages.map((src, idx) => (
                  <button
                    key={src + idx}
                    type="button"
                    className={
                      'img-gallery__thumb' +
                      (idx === galleryIndex
                        ? ' img-gallery__thumb--active'
                        : '')
                    }
                    onClick={() => setGalleryIndex(idx)}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
      <Copyright />
    </div>
  );
};

export default ProfilePage;

