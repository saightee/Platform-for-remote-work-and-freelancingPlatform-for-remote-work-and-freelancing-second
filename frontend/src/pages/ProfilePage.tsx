import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';



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

import { Profile, Category, JobSeekerProfile, EmployerProfile, Review, JobExperienceItem,
  EducationItem, } from '@types';
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


const USERNAME_RGX = /^[a-zA-Z0-9 ._-]{3,20}$/; // простая валидация

const BIO_MIN = 200;
const BIO_MAX = 750;

const bioPlainText = (raw?: string | null): string => {
  return (raw || '')
    .replace(/<[^>]+>/g, '') // вырезаем HTML теги, если вдруг есть
    .replace(/\s+/g, ' ')
    .trim();
};

type JobSeekerExtended = JobSeekerProfile & {
  // сохраняем возможность строки из инпута
  expected_salary?: number | string | null;
  expected_salary_max?: number | string | null;
  expected_salary_type?: 'per month' | 'per day' | null;
  preferred_job_types?: ('Full-time' | 'Part-time' | 'Project-based')[] | null;
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
  portfolio?: string[] | null;
  portfolio_files?: string[];
  current_position?: string | null;       
  education?: string | null;             
  job_experience_items?: JobExperienceItem[]; 
  education_items?: EducationItem[]; 
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
  const [jobExperienceItems, setJobExperienceItems] = useState<JobExperienceItem[]>([]);
  const [educationItems, setEducationItems] = useState<EducationItem[]>([]);
  // username inline edit
  const [usernameEditMode, setUsernameEditMode] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [newPortfolioLink, setNewPortfolioLink] = useState('');


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
          const js = pData as JobSeekerExtended;
          setSelectedSkillIds(js.skills?.map((s: Category) => s.id) || []);
          setJobExperienceItems(js.job_experience_items || []);
          setEducationItems(js.education_items || []);
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
           setFormError(
            'Username must be 3–20 characters and can contain letters, numbers, spaces, ".", "-", "_".',
          );
      return;
    }

    setFormError(null);
    setIsSaving(true); // общий лоадер на кнопку

    try {
      const orig = originalRef.current;

        if (profileData.role === 'jobseeker') {
        // validate salary (min / max / type)
        const salaryMinRaw = (profileData as any).expected_salary;
        const salaryMaxRaw = (profileData as any).expected_salary_max;
        const salaryTypeRaw = (profileData as any).expected_salary_type;

        let expectedSalaryMinNum: number | null = null;
        let expectedSalaryMaxNum: number | null = null;

        if (salaryMinRaw !== '' && salaryMinRaw != null) {
          const parsed = Number(salaryMinRaw);
          if (!Number.isFinite(parsed) || parsed < 0) {
            setFormError('Expected salary must be a non-negative number');
            return;
          }
          expectedSalaryMinNum = Math.round(parsed * 100) / 100;
        }

        if (salaryMaxRaw !== '' && salaryMaxRaw != null) {
          const parsedMax = Number(salaryMaxRaw);
          if (!Number.isFinite(parsedMax) || parsedMax < 0) {
            setFormError('Expected salary must be a non-negative number');
            return;
          }
          expectedSalaryMaxNum = Math.round(parsedMax * 100) / 100;
        }

        if (
          expectedSalaryMinNum != null &&
          expectedSalaryMaxNum != null &&
          expectedSalaryMaxNum < expectedSalaryMinNum
        ) {
          setFormError(
            'Maximum expected salary must be greater than or equal to minimum expected salary.',
          );
          return;
        }

        const normalizedSalaryType =
          salaryTypeRaw === 'per month' || salaryTypeRaw === 'per day'
            ? salaryTypeRaw
            : null;
        (profileData as any).expected_salary_type = normalizedSalaryType;

        // validate structured job experience
        const hasInvalidJobItem = jobExperienceItems.some((item) => {
          const hasAny =
            (item.title && item.title.trim() !== '') ||
            (item.company && item.company.trim() !== '') ||
            item.start_year ||
            item.end_year ||
            (item.description && item.description.trim() !== '');
          const hasRequired =
            item.title &&
            item.title.trim() !== '' &&
            item.company &&
            item.company.trim() !== '' &&
            item.start_year;
          return hasAny && !hasRequired;
        });

        if (hasInvalidJobItem) {
          setFormError(
            'Please fill title, company and start year for each job experience item or remove incomplete rows.',
          );
          return;
        }

        // validate structured education
        const hasInvalidEducationItem = educationItems.some((item) => {
          const hasAny =
            (item.degree && item.degree.trim() !== '') ||
            (item.institution && item.institution.trim() !== '') ||
            item.start_year ||
            item.end_year;
          const hasRequired =
            item.degree &&
            item.degree.trim() !== '' &&
            item.institution &&
            item.institution.trim() !== '' &&
            item.start_year;
          return hasAny && !hasRequired;
        });

        if (hasInvalidEducationItem) {
          setFormError(
            'Please fill degree, institution and start year for each education item or remove incomplete rows.',
          );
          return;
        }

        if (!profileData.timezone) {
          setFormError('Please select a timezone.');
          setIsSaving(false);
          return;
        }

const now = profileData as JobSeekerExtended;
const o   = (orig as JobSeekerExtended | null);


// перенесём нормализованные значения зарплаты в now
(now as any).expected_salary      = expectedSalaryMinNum;
(now as any).expected_salary_max  = expectedSalaryMaxNum;
(now as any).expected_salary_type = normalizedSalaryType;

const normCurrentPosition = ((now as any).current_position || '').trim();
if (normCurrentPosition.length > 200) {
  setFormError('Current position must be at most 200 characters.');
  return;
}
(now as any).current_position = normCurrentPosition || null;

// BIO: 200–750 ????????, ??????? ?? plain text
// ???? ???? ? description ?????? ????? HTML
const bioSrc = ((now as any).description || '').toString();
const bioDiv = document.createElement('div');
bioDiv.innerHTML = bioSrc;
const bioText = (bioDiv.textContent || '').trim();

if (bioText.length < BIO_MIN) {
  setFormError(`Bio must be at least ${BIO_MIN} characters.`);
  return;
}
if (bioText.length > BIO_MAX) {
  setFormError(`Bio must be at most ${BIO_MAX} characters.`);
  return;
}

// ? ??????? ??????? ?????? ??? ?????? ????? 
(now as any).description = bioText;

// Normalize and validate portfolio links
const rawPortfolio = (now as any).portfolio;
let normPortfolio: string[] = Array.isArray(rawPortfolio)
  ? rawPortfolio
  : rawPortfolio
  ? [String(rawPortfolio)]
  : [];


normPortfolio = normPortfolio
  .map((u) => (u || '').trim())
  .filter(Boolean);

if (normPortfolio.length > 10) {
  setFormError('You can add up to 10 portfolio links.');
  setIsSaving(false);
  return;
}

for (const url of normPortfolio) {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
  } catch {
    setFormError('One of portfolio links is invalid. Please use full URL starting with http:// or https://');
    setIsSaving(false);
    return;
  }
}

(now as any).portfolio = normPortfolio.length ? normPortfolio : null;


const changed = <K extends keyof JobSeekerExtended>(key: K, val: JobSeekerExtended[K]) =>
  o ? o[key] !== val : val !== undefined;

        const skillsIdsNow  = (now.skills || []).map((s: Category) => s.id);
        const skillsIdsOrig = (o?.skills || []).map((s: Category) => s.id);
        const skillsChanged =
          skillsIdsNow.length !== skillsIdsOrig.length ||
          skillsIdsNow.some((id, i) => id !== skillsIdsOrig[i]);

        const patch: any = { role: 'jobseeker' }; // ?? ???? ?????? ?????
        if (changed('username', usernameToSave))             patch.username         = usernameToSave;
        if (changed('timezone', now.timezone))               patch.timezone         = now.timezone;
        if (changed('currency', now.currency))               patch.currency         = now.currency;

        // expected salary: min / max / type
        const expectedSalaryMinNorm =
          typeof expectedSalaryMinNum === 'number' ? expectedSalaryMinNum : null;
        const expectedSalaryMaxNorm =
          typeof expectedSalaryMaxNum === 'number' ? expectedSalaryMaxNum : null;

        if (changed('expected_salary', expectedSalaryMinNorm as any)) {
          patch.expected_salary = expectedSalaryMinNorm;
        }
        if (changed('expected_salary_max', expectedSalaryMaxNorm as any)) {
          patch.expected_salary_max = expectedSalaryMaxNorm;
        }
        if (
          changed(
            'expected_salary_type',
            ((now as any).expected_salary_type ?? null) as any,
          )
        ) {
          patch.expected_salary_type =
            (now as any).expected_salary_type ?? null;
        }

        if (changed('job_search_status', (now as any).job_search_status || 'open_to_offers'))
                                                             patch.job_search_status = (now as any).job_search_status || 'open_to_offers';
        if (skillsChanged)                                   patch.skillIds         = skillsIdsNow;
        if (changed('experience', now.experience))           patch.experience       = now.experience;
        if (changed('current_position', now.current_position ?? null)) {
            patch.current_position = now.current_position || null;
          }
        if (changed('portfolio', now.portfolio))             patch.portfolio        = now.portfolio;


        const toRichHtml = (t?: string | null): string | null => {
          const v = (t || '').trim();
          if (!v) return null;

          // ???? ??? ??? HTML (????????? ?? Quill ??? ?????? ??????) — ????????? ??? ????
          const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(v);
          if (looksLikeHtml) return v;

          // ??????? ?????: ?????? ????? ?????? ??????, ???????? ? <br/>
          const parts = v
            .split(/\n{2,}/)
            .map((s) => s.trim())
            .filter(Boolean);

          return parts
            .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
            .join('');
        };

        if (changed('description', now.description)) {
          const rich = toRichHtml((now as any).description as string | undefined);
          patch.description = rich ?? null;
        }


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

        // preferred_job_types
        const origPreferred =
          Array.isArray((o as any)?.preferred_job_types)
            ? (o as any).preferred_job_types
            : [];
        const nowPreferred =
          Array.isArray((now as any).preferred_job_types)
            ? (now as any).preferred_job_types
            : [];
        const preferredChanged =
          origPreferred.length !== nowPreferred.length ||
          origPreferred.some((v: any, i: number) => v !== nowPreferred[i]);

        if (preferredChanged) {
          patch.preferred_job_types =
            nowPreferred.length > 0 ? nowPreferred : null;
        }

        if (changed('date_of_birth', now.date_of_birth ?? null))         patch.date_of_birth    = now.date_of_birth ?? null;

               if (changed('linkedin',  now.linkedin ?? null))    patch.linkedin  = now.linkedin  || null;
        if (changed('instagram', now.instagram ?? null))   patch.instagram = now.instagram || null;
        if (changed('facebook',  now.facebook ?? null))    patch.facebook  = now.facebook  || null;
        if (changed('whatsapp',  now.whatsapp ?? null))    patch.whatsapp  = now.whatsapp  || null;   // NEW
        if (changed('telegram',  now.telegram ?? null))    patch.telegram  = now.telegram  || null;   // NEW

        // --- job_experience_items / education_items ---

        const normalizeJobItem = (item: JobExperienceItem): JobExperienceItem => ({
          title: (item.title || '').trim(),
          company: (item.company || '').trim(),
          start_year: item.start_year,
          end_year: item.end_year,
          description:
            item.description && item.description.trim() !== ''
              ? item.description.trim()
              : null,
        });

        const normalizeEducationItem = (item: EducationItem): EducationItem => ({
          degree: (item.degree || '').trim(),
          institution: (item.institution || '').trim(),
          start_year: item.start_year,
          end_year: item.end_year,
        });

        const normalizedJobItems = jobExperienceItems
          .map(normalizeJobItem)
          .filter(
            (item) =>
              item.title &&
              item.company &&
              typeof item.start_year === 'number',
          );

        const normalizedEducationItems = educationItems
          .map(normalizeEducationItem)
          .filter(
            (item) =>
              item.degree &&
              item.institution &&
              typeof item.start_year === 'number',
          );

        const origJobItems =
          (o?.job_experience_items as JobExperienceItem[] | undefined) || [];
        const origEducationItems =
          (o?.education_items as EducationItem[] | undefined) || [];

        if (
          JSON.stringify(origJobItems) !== JSON.stringify(normalizedJobItems)
        ) {
          patch.job_experience_items = normalizedJobItems;
        }

        if (
          JSON.stringify(origEducationItems) !==
          JSON.stringify(normalizedEducationItems)
        ) {
          patch.education_items = normalizedEducationItems;
        }

        // ???? ?????? ?????? — ?????? ??????? ?? ?????? ??????????????
        if (Object.keys(patch).length <= 1) { // ?????? role
          setIsEditing(false);
          setUsernameEditMode(false);
          setIsSaving(false);
          return;
        }
        console.log('PATCH >>>', patch);
        const updated = await updateProfile(patch);
        setProfileData(updated);
        originalRef.current = updated;
        setUsernameDraft(updated.username || usernameToSave);

        if (updated.role === 'jobseeker') {
          const updatedJs = updated as JobSeekerExtended;
          setJobExperienceItems(updatedJs.job_experience_items || []);
          setEducationItems(updatedJs.education_items || []);
        }

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

const isJobseeker = profileData.role === 'jobseeker';

  const bioText = isJobseeker
    ? bioPlainText((profileData as any).description as string | undefined)
    : '';

  const bioLength = isJobseeker ? bioText.length : 0;
  const bioTooShort =
    isJobseeker && isEditing && bioLength > 0 && bioLength < BIO_MIN;
  const bioTooLong =
    isJobseeker && isEditing && bioLength > BIO_MAX;


  // --- gallery images (only portfolio images) ---
  const portfolioFilesRaw: string[] =
    profileData.role === 'jobseeker' &&
    Array.isArray((profileData as any).portfolio_files)
      ? ((profileData as any).portfolio_files as string[])
      : [];

  const toFullUrl = (u: string) =>
    u.startsWith('http') ? u : `${brandOrigin()}/backend${u}`;

  const galleryImages: string[] = portfolioFilesRaw
    .filter((u) => isImageUrl(u))
    .map(toFullUrl);

  // карта "url -> индекс" для открытия нужной картинки
  const galleryIndexByUrl = new Map<string, number>();
  galleryImages.forEach((src, idx) => {
    galleryIndexByUrl.set(src, idx);
  });

  const portfolioLinks: string[] =
  profileData.role === 'jobseeker'
    ? Array.isArray((profileData as any).portfolio)
      ? (profileData as any).portfolio
      : ( (profileData as any).portfolio
          ? [String((profileData as any).portfolio)]
          : []
        )
    : [];

const addPortfolioLink = () => {
  const v = newPortfolioLink.trim();
  if (!v) return;

  try {
    // базовая проверка URL
    // eslint-disable-next-line no-new
    new URL(v);
  } catch {
    setFormError('Portfolio URL seems invalid. Please use full link starting with http:// or https://');
    return;
  }

  setFormError(null);

  setProfileData(prev => {
    if (!prev || prev.role !== 'jobseeker') return prev;
    const raw = (prev as any).portfolio;
    let current: string[] = Array.isArray(raw)
      ? [...raw]
      : raw
      ? [String(raw)]
      : [];

    if (current.length >= 10) {
      return prev;
    }

    if (!current.includes(v)) {
      current = [...current, v];
    }

    return {
      ...(prev as any),
      portfolio: current,
    } as any;
  });

  setNewPortfolioLink('');
};

const removePortfolioLinkAt = (idx: number) => {
  setProfileData(prev => {
    if (!prev || prev.role !== 'jobseeker') return prev;
    const raw = (prev as any).portfolio;
    let current: string[] = Array.isArray(raw)
      ? [...raw]
      : raw
      ? [String(raw)]
      : [];

    current = current.filter((_, i) => i !== idx);

    return {
      ...(prev as any),
      portfolio: current.length ? current : null,
    } as any;
  });
};


  const openGalleryAt = (idx: number) => {
    if (!galleryImages.length) return;
    const safeIndex = (idx + galleryImages.length) % galleryImages.length;
    setGalleryIndex(safeIndex);
    setGalleryOpen(true);
  };

  const handleAvatarClick = () => {
    // В режиме редактирования — открываем выбор файла
    if (isEditing) {
      avatarRef.current?.click();
    }
    // В режиме просмотра — ничего не делаем
  };

  const portfolioFiles = profileData.role === 'jobseeker'
    ? portfolioFilesRaw.map((u) => {
        const full = toFullUrl(u);
        const isImg = isImageUrl(u);
        const filename = u.split('/').pop() || 'File';
        return { raw: u, src: full, isImg, filename };
      })
    : [];

  return (
    <div>
     

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
                  isEditing
                    ? 'Click to upload avatar'
                    : undefined
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

        
            </div>

            {/* RIGHT COLUMN */}
            <div className="pf-col pf-right">
              {/* EMPLOYER LAYOUT (оставляем примерно как было) */}
              {profileData.role === 'employer' && (
                <div className="pf-section">
                  {!isEditing ? (
                    <div className="pf-kv">
                      
                      <div className="pf-kv-row">
                        <span className="pf-k">Company Info</span>
                        <span className="pf-v">
                          {(profileData as EmployerProfile).company_info ||
                            'Not specified'}
                        </span>
                      </div>
                      
                    </div>
                  ) : (
                    <>
                     
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

                      {/* Preferred job types */}
                      {Array.isArray((profileData as any).preferred_job_types) &&
                        (profileData as any).preferred_job_types.length > 0 && (
                          <div className="pf-kv-row">
                            <span className="pf-k">Preferred job type</span>
                            <span className="pf-v">
                              {(profileData as any).preferred_job_types.join(', ')}
                            </span>
                          </div>
                        )}

                      <div className="pf-kv-row">
                               <span className="pf-k">Current position</span>
                               <span className="pf-v">
                                 {(profileData as any).current_position || 'Not specified'}
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
                      {(() => {
                        const js: any = profileData;
                        const min = js.expected_salary;
                        const max = js.expected_salary_max;
                        const type = js.expected_salary_type;
                        const hasMin =
                          min != null &&
                          min !== '' &&
                          Number(min) !== 0;
                        const hasMax =
                          max != null &&
                          max !== '' &&
                          Number(max) !== 0;

                        if (!hasMin && !hasMax) return null;

                        const currency = profileData.currency || '';
                        const minNum = hasMin ? Number(min) : null;
                        const maxNum = hasMax ? Number(max) : null;

                        let text = '';
                        if (hasMin && hasMax) {
                          text = `${minNum} - ${maxNum}`;
                        } else if (hasMin) {
                          text = `${minNum}`;
                        } else if (hasMax) {
                          text = `${maxNum}`;
                        }

                        if (currency) {
                          text = `${text} ${currency}`;
                        }

                        if (type === 'per month' || type === 'per day') {
                          text = `${text} ${type}`;
                        }

                        return (
                          <div className="pf-kv-row">
                            <span className="pf-k">Expected salary</span>
                            <span className="pf-v">{text}</span>
                          </div>
                        );
                      })()}

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

{/* Portfolio links */}
<div className="pf-row">
  <label className="pf-label">Portfolio links (optional, up to 10)</label>
  <div className="pf-tags-input">
    <div className="pf-tags-input-main">
      <input
        className="pf-input"
        type="url"
        value={newPortfolioLink}
        onChange={(e) => setNewPortfolioLink(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addPortfolioLink();
          }
        }}
        placeholder="https://github.com/…, https://dribbble.com/…"
      />
      <button
        type="button"
        className="pf-button pf-secondary"
        onClick={addPortfolioLink}
        disabled={!newPortfolioLink.trim() || portfolioLinks.length >= 10}
      >
        Add link
      </button>
    </div>

    {portfolioLinks.length > 0 && (
      <div className="pf-tags">
        {portfolioLinks.map((url, idx) => (
          <span key={idx} className="pf-tag">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="pf-link"
            >
              {url}
            </a>
            <span
              className="pf-tag-x"
              onClick={() => removePortfolioLinkAt(idx)}
            >
              ×
            </span>
          </span>
        ))}
      </div>
    )}
  </div>
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
                    
                    <div className="pf-summary-edit">
                     
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

                      {/* Preferred job type */}
                      <div className="pf-row">
                        <label className="pf-label">Preferred job type</label>
                        <div>
                          {(['Full-time', 'Part-time', 'Project-based'] as const).map((jt) => {
                            const list: string[] = Array.isArray((profileData as any).preferred_job_types)
                              ? (profileData as any).preferred_job_types
                              : [];
                            const checked = list.includes(jt);
                            return (
                              <label
                                key={jt}
                                style={{ display: 'inline-flex', alignItems: 'center', marginRight: 12 }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const prevList: string[] = Array.isArray((profileData as any).preferred_job_types)
                                      ? [...(profileData as any).preferred_job_types]
                                      : [];
                                    let next: string[];
                                    if (e.target.checked) {
                                      next = prevList.includes(jt) ? prevList : [...prevList, jt];
                                    } else {
                                      next = prevList.filter((x) => x !== jt);
                                    }
                                    setProfileData(
                                      {
                                        ...(profileData as any),
                                        preferred_job_types: next.length ? next : undefined,
                                      } as any,
                                    );
                                  }}
                                />
                                <span style={{ marginLeft: 4 }}>{jt}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                    {/* Current position */}
                     <div className="pf-row">
                       <label className="pf-label">Current position</label>
                       <input
                         className="pf-input"
                         type="text"
                         maxLength={200}
                         value={(profileData as any).current_position || ''}
                         onChange={(e) =>
                           setProfileData(
                             {
                               ...(profileData as any),
                               current_position: e.target.value,
                             } as any,
                           )
                         }
                         placeholder="e.g. Senior Backend Developer"
                       />
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
                          <label className="pf-label">Expected salary (min)</label>
                          <input
                            className="pf-input"
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            placeholder="e.g. 4000"
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

                      {/* Expected salary max + type */}
                      <div className="pf-row pf-row-two">
                        <div>
                          <label className="pf-label">Expected salary (max)</label>
                          <input
                            className="pf-input"
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            placeholder="e.g. 6000"
                            value={
                              (profileData as any).expected_salary_max ?? ''
                            }
                            onChange={(e) => {
                              const raw = e.target.value;
                            if (raw === '') {
                              setProfileData(
                                {
                                  ...(profileData as any),
                                  expected_salary_max: '',
                                } as any,
                              );
                              return;
                            }
                            setProfileData(
                              {
                                ...(profileData as any),
                                expected_salary_max: raw,
                              } as any,
                            );

                            }}
                          />
                        </div>

                        <div>
                          <label className="pf-label">Salary type</label>
                          <select
                            className="pf-select"
                            value={(profileData as any).expected_salary_type || ''}
                            onChange={(e) =>
                            setProfileData(
                              {
                                ...(profileData as any),
                                expected_salary_type: e.target.value || undefined,
                              } as any,
                            )
                          }

                          >
                            <option value="" disabled>
                              Select type
                            </option>
                            <option value="per month">per month</option>
                            <option value="per day">per day</option>
                          </select>
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
        <label className="pf-label pf-label-section">
          Bio <span className="pf-label-opt">(200–750 characters)</span>
        </label>

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
          <>
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

            {/* Счётчик символов */}
            <div
              className={`pf-counter ${
                bioTooShort || bioTooLong ? 'is-over' : ''
              }`}
            >
              {bioLength} / {BIO_MAX} characters
            </div>

            {/* Подсказки под счётчиком */}
            {bioTooShort && (
              <div className="pf-hint pf-hint--err">
                Minimum {BIO_MIN} characters required.
              </div>
            )}

            {bioTooLong && (
              <div className="pf-hint pf-hint--err">
                Maximum {BIO_MAX} characters exceeded.
              </div>
            )}
          </>
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
                    jobExperienceItems.length > 0 ? (
                      <div className="pf-richtext">
                        {jobExperienceItems.map((item, index) => (
                          <div key={index} className="pf-experience-item">
                            <div className="pf-experience-header">
                              <div className="pf-experience-title">
                                {item.title}
                                {item.company && (
                                  <span className="pf-experience-company">
                                    {' '}
                                    at {item.company}
                                  </span>
                                )}
                              </div>
                            {(item.start_year || item.end_year) && (
                                <div className="pf-experience-dates">
                                  {item.start_year || '—'} {' — '} {item.end_year ?? 'Present'}
                                </div>
                              )}

                            </div>
                            {item.description && (
                              <div className="pf-experience-description">
                                {item.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="pf-muted">Not specified</div>
                    )
                  ) : (
                    <div className="pf-experience-edit-list">
                      {jobExperienceItems.length === 0 && (
                        <div className="pf-muted" style={{ marginBottom: '8px' }}>
                          You have not added any job experience yet.
                        </div>
                      )}

                      {jobExperienceItems.map((item, index) => (
                        <div key={index} className="pf-experience-edit-item">
                          <div className="pf-row pf-row-stack">
                            <div className="pf-col">
                              <label className="pf-label">Title</label>
                              <input
                                className="pf-input"
                                type="text"
                                value={item.title}
                                onChange={(e) =>
                                  setJobExperienceItems((prev) =>
                                    prev.map((it, i) =>
                                      i === index
                                        ? { ...it, title: e.target.value }
                                        : it,
                                    ),
                                  )
                                }
                                placeholder="Senior Backend Developer"
                              />
                            </div>
                            <div className="pf-col">
                              <label className="pf-label">Company</label>
                              <input
                                className="pf-input"
                                type="text"
                                value={item.company}
                                onChange={(e) =>
                                  setJobExperienceItems((prev) =>
                                    prev.map((it, i) =>
                                      i === index
                                        ? { ...it, company: e.target.value }
                                        : it,
                                    ),
                                  )
                                }
                                placeholder="Acme Inc"
                              />
                            </div>
                          </div>

                          <div className="pf-row pf-row-stack">
                            <div className="pf-col">
                              <label className="pf-label">Start year</label>
                              <input
                                className="pf-input"
                                type="number"
                                value={item.start_year}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const year = val === '' ? item.start_year : parseInt(val, 10);
                                  setJobExperienceItems((prev) =>
                                    prev.map((it, i) =>
                                      i === index ? { ...it, start_year: year } : it,
                                    ),
                                  );
                                }}
                              />
                            </div>
                            <div className="pf-col">
                              <label className="pf-label">End year</label>
                              <input
                                className="pf-input"
                                type="number"
                                value={item.end_year ?? ''}
                                placeholder="Present"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const year = val === '' ? null : parseInt(val, 10);
                                  setJobExperienceItems((prev) =>
                                    prev.map((it, i) =>
                                      i === index ? { ...it, end_year: year } : it,
                                    ),
                                  );
                                }}
                              />
                            </div>
                          </div>

                          <div className="pf-row">
                            <div className="pf-col">
                              <label className="pf-label">Description</label>
                              <textarea
                                className="pf-textarea"
                                rows={3}
                                value={item.description ?? ''}
                                onChange={(e) =>
                                  setJobExperienceItems((prev) =>
                                    prev.map((it, i) =>
                                      i === index
                                        ? { ...it, description: e.target.value }
                                        : it,
                                    ),
                                  )
                                }
                                placeholder="Short description of your responsibilities and achievements"
                              />
                            </div>
                          </div>

                          <div className="pf-row">
                            <button
                              type="button"
                              className="pf-btn pf-btn-link pf-btn-small"
                              onClick={() =>
                                setJobExperienceItems((prev) =>
                                  prev.filter((_, i) => i !== index),
                                )
                              }
                            >
                              Remove item
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="pf-btn pf-btn-link"
                        onClick={() =>
                          setJobExperienceItems((prev) => [
                            ...prev,
                            {
                              title: '',
                              company: '',
                              start_year: new Date().getFullYear(),
                              end_year: null,
                              description: '',
                            },
                          ])
                        }
                      >
                        Add job experience
                      </button>
                    </div>
                  )}
                </div>
              </div>


                            {/* EDUCATION */}
              <div className="pf-section-wide">
                <div className="pf-row">
                  <label className="pf-label pf-label-section">
                    Education
                  </label>
                  {!isEditing ? (
                    educationItems.length > 0 ? (
                      <div className="pf-richtext">
                        {educationItems.map((item, index) => (
                          <div key={index} className="pf-education-item">
                            <div className="pf-education-header">
                              <div className="pf-education-title">
                                {item.degree}
                              </div>
                              <div className="pf-education-institution">
                                {item.institution}
                              </div>
                                {(item.start_year || item.end_year) && (
                                  <div className="pf-education-dates">
                                    {item.start_year || '—'} {' — '} {item.end_year ?? 'Present'}
                                  </div>
                                )}

                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="pf-muted">Not specified</div>
                    )
                  ) : (
                    <div className="pf-education-edit-list">
                      {educationItems.length === 0 && (
                        <div className="pf-muted" style={{ marginBottom: '8px' }}>
                          You have not added any education yet.
                        </div>
                      )}

                      {educationItems.map((item, index) => (
                        <div key={index} className="pf-education-edit-item">
                          <div className="pf-row pf-row-stack">
                            <div className="pf-col">
                              <label className="pf-label">Degree</label>
                              <input
                                className="pf-input"
                                type="text"
                                value={item.degree}
                                onChange={(e) =>
                                  setEducationItems((prev) =>
                                    prev.map((it, i) =>
                                      i === index
                                        ? { ...it, degree: e.target.value }
                                        : it,
                                    ),
                                  )
                                }
                                placeholder="BSc in Computer Science"
                              />
                            </div>
                            <div className="pf-col">
                              <label className="pf-label">Institution</label>
                              <input
                                className="pf-input"
                                type="text"
                                value={item.institution}
                                onChange={(e) =>
                                  setEducationItems((prev) =>
                                    prev.map((it, i) =>
                                      i === index
                                        ? { ...it, institution: e.target.value }
                                        : it,
                                    ),
                                  )
                                }
                                placeholder="University of Helsinki"
                              />
                            </div>
                          </div>

                          <div className="pf-row pf-row-stack">
                            <div className="pf-col">
                              <label className="pf-label">Start year</label>
                              <input
                                className="pf-input"
                                type="number"
                                value={item.start_year}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const year = val === '' ? item.start_year : parseInt(val, 10);
                                  setEducationItems((prev) =>
                                    prev.map((it, i) =>
                                      i === index ? { ...it, start_year: year } : it,
                                    ),
                                  );
                                }}
                              />
                            </div>
                            <div className="pf-col">
                              <label className="pf-label">End year</label>
                              <input
                                className="pf-input"
                                type="number"
                                value={item.end_year ?? ''}
                                placeholder="Present"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const year = val === '' ? null : parseInt(val, 10);
                                  setEducationItems((prev) =>
                                    prev.map((it, i) =>
                                      i === index ? { ...it, end_year: year } : it,
                                    ),
                                  );
                                }}
                              />
                            </div>
                          </div>

                          <div className="pf-row">
                            <button
                              type="button"
                              className="pf-btn pf-btn-link pf-btn-small"
                              onClick={() =>
                                setEducationItems((prev) =>
                                  prev.filter((_, i) => i !== index),
                                )
                              }
                            >
                              Remove item
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="pf-btn pf-btn-link"
                        onClick={() =>
                          setEducationItems((prev) => [
                            ...prev,
                            {
                              degree: '',
                              institution: '',
                              start_year: new Date().getFullYear(),
                              end_year: null,
                            },
                          ])
                        }
                      >
                        Add education
                      </button>
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
                   {portfolioFiles.length ? (
  <div className="pf-portfolio-grid">
    {portfolioFiles.map((file, i) => (
      <div key={i} className="pf-portfolio-item">
        {file.isImg ? (
          // БОЛЬШЕ НЕ КНОПКА, БЕЗ onClick
          <div className="pf-portfolio-thumb">
            <img
              src={file.src}
              alt={file.filename}
              className="pf-portfolio-img"
            />
          </div>
        ) : (
          <a
            href={file.src}
            target="_blank"
            rel="noopener noreferrer"
            className="pf-portfolio-doc"
          >
            <span className="pf-portfolio-doc-icon">
              <FaFilePdf />
            </span>
            <span className="pf-portfolio-doc-name">
              {file.filename}
            </span>
          </a>
        )}

        {isEditing && (
          <button
            type="button"
            className="pf-portfolio-remove"
            onClick={() => {
              const list = portfolioFilesRaw.filter(
                (_u, idx) => idx !== i,
              );
              setProfileData(
                {
                  ...(profileData as any),
                  portfolio_files: list,
                } as any,
              );
            }}
          >
            ×
          </button>
        )}
      </div>
    ))}
  </div>
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

   


     
    </div>
  );
};

export default ProfilePage;
