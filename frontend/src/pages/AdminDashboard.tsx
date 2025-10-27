import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { startOfWeek, endOfWeek, subDays, format, formatDistanceToNow } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz'; // Для времени по Маниле
import { FaHome, FaSignOutAlt, FaUser, FaSearch, FaArrowUp, FaArrowDown, FaCopy } from 'react-icons/fa'; // Иконки
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // Диаграммы
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Для навигации и Link
import { jwtDecode } from 'jwt-decode'; // Для декодирования токена
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { useRole } from '../context/RoleContext';
import Loader from '../components/Loader';
import sanitizeHtml from 'sanitize-html';
import '../styles/admin-settings.css';
import '../styles/post-job.css';
import { toast } from '../utils/toast';
import AdminChatTab from '../components/AdminChatTab';
import ExportUsersPopover from '../components/ExportUsersPopover';
import {
  getAllUsers, getUserById, updateUser, deleteUser, resetUserPassword,
  getAllJobPosts, updateJobPostAdmin, deleteJobPostAdmin, approveJobPost, flagJobPost,
  setJobPostApplicationLimitAdmin, deleteReview, getAnalytics,
  getRegistrationStats, getGeographicDistribution, getTopEmployers, getTopJobseekers,
  verifyIdentity, setGlobalApplicationLimit, getGlobalApplicationLimit,
  addBlockedCountry, removeBlockedCountry, getBlockedCountries, getTechFeedback,
  blockUser, unblockUser, getUserRiskScore, exportUsersToCSV, getUserOnlineStatus,
  getCategories, createCategory, getOnlineUsers, getRecentRegistrations, getJobPostsWithApplications,
  getTopJobseekersByViews, getTopEmployersByPosts, getGrowthTrends, getComplaints, 
  resolveComplaint, getChatHistory, notifyCandidates, getApplicationsForJobPost, getJobApplicationById, getJobPost, getUserProfileById,
  logout, getAdminCategories, deletePlatformFeedback, JobPostWithApplications, getPlatformFeedback, deleteCategory, rejectJobPost, getEmailStatsForJob, getAllEmailStats, createReferralLink, getReferralLinks, getReferralLinksByJob, updateReferralLink, deleteReferralLink,  publishPlatformFeedback, unpublishPlatformFeedback, getChatNotificationSettings,
  updateChatNotificationSettings,
  notifyReferralApplicants, getRecentRegistrationsToday, getBrandsAnalytics, getAdminReviews, approveReview, rejectReview, createSiteReferralLink, getSiteReferralLinks, updateSiteReferralLink, deleteSiteReferralLink, getAdminRegistrationAvatarRequired,
  setAdminRegistrationAvatarRequired, 
} from '../services/api';
import { User, JobPost, Review, Feedback, BlockedCountry, Category, PaginatedResponse, JobApplicationDetails, JobSeekerProfile, PlatformFeedbackAdminItem, PlatformFeedbackList, ChatNotificationsSettings } from '@types';
import { AxiosError } from 'axios';
import '../styles/referral-links.css';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import type { SiteReferralLink } from '../services/api';

// import {
//   mockUsers, mockJobPosts, mockJobPostsWithApps, mockReviews, mockFeedback,
//   mockBlockedCountries, mockCategories, mockAnalytics, mockRegistrationStats,
//   mockGeographicDistribution, mockFreelancerSignups, mockBusinessSignups,
//   mockTopEmployers, mockTopJobseekers, mockTopJobseekersByViews,
//   mockTopEmployersByPosts, mockGrowthTrends, mockComplaints, mockChatHistory,
//   mockOnlineUsers, mockRecentRegistrations, mockJobApplications
// } from '../mocks';



interface OnlineUsers {
  jobseekers: number;
  employers: number;
}

interface RecentRegistrations {
  date?: string;
  tzOffset?: number;
  jobseekers_total?: number;
  employers_total?: number;
  jobseekers: Array<{
    id: string;
    email: string;
    username: string;
    role: string;
    created_at: string;
    referral_from_signup: string | null;
    referral_link_description: string | null;
    referral_job: { id: string; title: string } | null;
    referral_job_description: string | null;
  }>;
  employers: Array<{
    id: string;
    email: string;
    username: string;
    role: string;
    created_at: string;
    referral_from_signup: string | null;
    referral_link_description: string | null;
    referral_job: { id: string; title: string } | null;
    referral_job_description: string | null;
  }>;
}



interface DecodedToken {
  email: string;
  sub: string;
  role: 'employer' | 'jobseeker' | 'admin' | 'moderator';
  username?: string;
  iat: number;
  exp: number;
}

type AdminRecentUser = {
  id: string;
  email: string;
  username: string;
  role: string;
  created_at: string;

  referral_from_signup?: string | null;
  referral_link_description?: string | null;
  referral_job?: { id: string; title: string } | null;
  referral_job_description?: string | null;
};

type AdminRecentRegistrationsDTO = {
  date?: string;
  tzOffset?: number;
  jobseekers_total?: number;
  employers_total?: number;
  jobseekers: AdminRecentUser[];
  employers: AdminRecentUser[];
};


interface Complaint { 
  id: string;
  complainant_id: string;
  complainant: { id: string; username: string; email: string; role: string };
  job_post_id?: string;
  job_post?: { id: string; title: string; description: string };
  profile_id?: string;
  reason: string;
  status: 'Pending' | 'Resolved' | 'Rejected';
  created_at: string;
  resolution_comment?: string;
  resolver?: { username: string }; 
}

interface EnrichedComplaint extends Complaint {
  targetUsername: string;
}
const shortenReferralUrl = (url: string, max = 45) => {
  if (!url) return '';
  if (url.length <= max) return url;
  try {
    const u = new URL(url);
    // показываем origin + первые ~20 символов пути, затем …
    const path = u.pathname || '/';
    const slice = path.slice(0, 20).replace(/\/$/, '');
    return `${u.origin}${slice}...`;
  } catch {
    return `${url.slice(0, max)}...`;
  }
};


const AdminDashboard: React.FC = () => {
  const { currentRole, socket } = useRole();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [showDocumentModal, setShowDocumentModal] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userTotal, setUserTotal] = useState<number>(0);
  const [jobStatusFilter, setJobStatusFilter] = useState<'All' | 'Active' | 'Draft' | 'Closed'>('All');
  const [selectedInterval, setSelectedInterval] = useState<'day' | 'week' | 'month'>('month');
  // BRAND ANALYTICS
const [brandsLoading, setBrandsLoading] = useState(false);
const [brandsError, setBrandsError] = useState<string | null>(null);
const [brandsRange, setBrandsRange] = useState<{ startDate?: string; endDate?: string }>({});
const [brandsData, setBrandsData] = useState<{
  range: { startDate: string; endDate: string };
  byBrand: Array<{ brand: string; total: number; employers: number; jobseekers: number }>;
  overall: { total: number; employers: number; jobseekers: number };
} | null>(null);
// Под-вкладка внутри Feedback: 'tech' | 'platform'
const [fbSubtab, setFbSubtab] = useState<'tech' | 'platform'>('tech');

// Tech feedback pagination
const [tfPage, setTfPage] = useState(1);
const [tfLimit, setTfLimit] = useState(40);
const [tfTotal, setTfTotal] = useState(0);
const tfTotalPages = Math.max(1, Math.ceil(tfTotal / tfLimit));

// Platform feedback pagination
const [pfPage, setPfPage] = useState(1);
const [pfLimit, setPfLimit] = useState(40);
const [pfTotal, setPfTotal] = useState(0);
const pfTotalPages = Math.max(1, Math.ceil(pfTotal / pfLimit));

// данные
const [techFeedback, setTechFeedback] = useState<any[]>([]);
const [techLoading, setTechLoading] = useState(false);

// для модалки деталей тех.фидбека
const [techDetails, setTechDetails] = useState<any | null>(null);
const [regAvatarRequired, setRegAvatarRequired] = useState<boolean | null>(null);
const [savingRegAvatar, setSavingRegAvatar] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Resolved' | 'Rejected'>('All');
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [jobPostsWithApps, setJobPostsWithApps] = useState<JobPostWithApplications[]>([]);
  const [jobApplications, setJobApplications] = useState<JobApplicationDetails[]>([]);
  const [selectedJobPostId, setSelectedJobPostId] = useState<string>('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewPage, setReviewPage] = useState(1);
const [reviewLimit, setReviewLimit] = useState(10);
const [reviewStatus, setReviewStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
const [reviewsTotal, setReviewsTotal] = useState(0);
const reviewTotalPages = Math.max(1, Math.ceil(reviewsTotal / reviewLimit));
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [blockedCountries, setBlockedCountries] = useState<BlockedCountry[]>([]);
  const [newCountryCode, setNewCountryCode] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showJobModal, setShowJobModal] = useState<string | null>(null);
  const [newMainCategoryName, setNewMainCategoryName] = useState('');
const [newSubCategoryName, setNewSubCategoryName] = useState('');
const [newParentCategoryId, setNewParentCategoryId] = useState<string>('');
  const [pendingReviewFilter, setPendingReviewFilter] = useState<'All' | 'true' | 'false'>('All');
  const [issues, setIssues] = useState<Feedback[]>([]);
  const [growthPage, setGrowthPage] = useState(1);
const [autoRefresh, setAutoRefresh] = useState(false);
const [notifyAudience, setNotifyAudience] = useState<'all' | 'referral'>('all');
const [notifyTitleFilter, setNotifyTitleFilter] = useState<string>(''); // опционально
const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});
const toggleJob = (jobId: string) =>
  setExpandedJobs(prev => ({ ...prev, [jobId]: !prev[jobId] }));

const copy = async (text: string) => {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove();
  }
};
// onClick={() => copy(link.shortLink || link.fullLink)}

const [growthLimit] = useState(10); // Лимит на страницу
const [stories, setStories] = useState<PlatformFeedbackAdminItem[]>([]);

  const [analytics, setAnalytics] = useState<{
    totalUsers: number;
    employers: number;
    jobSeekers: number;
    totalJobPosts: number;
    activeJobPosts: number;
    totalApplications: number;
    totalReviews: number;
  } | null>(null);
  const [registrationStats, setRegistrationStats] = useState<{ period: string; count: number }[]>([]);
  const [geographicDistribution, setGeographicDistribution] = useState<{ country: string; count: number; percentage: string }[]>([]);
  const [freelancerSignups, setFreelancerSignups] = useState<{ country: string; count: number }[]>([]);
  const [businessSignups, setBusinessSignups] = useState<{ country: string; count: number }[]>([]);
  const [topEmployers, setTopEmployers] = useState<{ employer_id: string; username: string; job_count: number }[]>([]);
  const [topJobseekers, setTopJobseekers] = useState<{ job_seeker_id: string; username: string; application_count: number }[]>([]);
  const [topJobseekersByViews, setTopJobseekersByViews] = useState<{ userId: string; username: string; email: string; profileViews: number }[]>([]);
  const [topEmployersByPosts, setTopEmployersByPosts] = useState<{ userId: string; username: string; email: string; jobCount: number }[]>([]);
const [chatNotif, setChatNotif] = useState<ChatNotificationsSettings | null>(null);
const [chatNotifLoading, setChatNotifLoading] = useState(false);
const [chatNotifSaving, setChatNotifSaving] = useState(false);
const [chatNotifWarning, setChatNotifWarning] = useState<string | null>(null);
// === Export CSV filters ===
type RoleAll = 'All' | 'jobseeker' | 'employer' | 'admin' | 'moderator';
type StatusAll = 'All' | 'active' | 'blocked';
type OrderAll = 'ASC' | 'DESC';
type SortByAll = 'created_at' | 'last_login_at';
type JobSearchAll = 'All' | 'actively_looking' | 'open_to_offers' | 'hired';

const LS_EXPORT_KEY = 'admin_export_filters_v1';

const [exportBusy, setExportBusy] = useState(false);
const [exportFilters, setExportFilters] = useState<{
  role: RoleAll;
  status: StatusAll;
  q: string;
  email: string;
  username: string;
  country: string;          // '' | 'unknown' | 'US' ...
  provider: string;         // '' | 'none' | 'google' ...
  referralSource: string;
  isEmailVerified: boolean | '';
  identityVerified: boolean | '';
  hasAvatar: boolean | '';
  hasResume: boolean | '';
  jobSearchStatus: JobSearchAll;
  companyName: string;
  riskMin: string;          // храним строками, потом приводим
  riskMax: string;
  createdFrom: string;      // yyyy-mm-dd
  createdTo: string;
  lastLoginFrom: string;
  lastLoginTo: string;
  sortBy: SortByAll;
  order: OrderAll;
}>({
  role: 'All',
  status: 'All',
  q: '',
  email: '',
  username: '',
  country: '',
  provider: '',
  referralSource: '',
  isEmailVerified: '',
  identityVerified: '',
  hasAvatar: '',
  hasResume: '',
  jobSearchStatus: 'All',
  companyName: '',
  riskMin: '',
  riskMax: '',
  createdFrom: '',
  createdTo: '',
  lastLoginFrom: '',
  lastLoginTo: '',
  sortBy: 'created_at',
  order: 'DESC',
});

// загрузка из LS
useEffect(() => {
  try {
    const raw = localStorage.getItem(LS_EXPORT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      setExportFilters((prev) => ({ ...prev, ...parsed }));
    }
  } catch {}
}, []);

// сохранение в LS
useEffect(() => {
  try {
    localStorage.setItem(LS_EXPORT_KEY, JSON.stringify(exportFilters));
  } catch {}
}, [exportFilters]);

// хелпер для сборки параметров в API
const buildExportParams = (): import('../services/api').AdminUserExportParams => {
  const f = exportFilters;

  const toBool = (v: boolean | '') => (v === '' ? undefined : !!v);
  const toNum = (v: string) => (v.trim() === '' ? undefined : Number(v));
  const toStr = (v: string) => (v.trim() === '' ? undefined : v.trim());

  return {
    role: f.role === 'All' ? undefined : (f.role as any),
    status: f.status === 'All' ? undefined : (f.status as any),
    q: toStr(f.q),
    email: toStr(f.email),
    username: toStr(f.username),
    country: toStr(f.country),             // 'unknown' => бэк воспримет как NULL
    provider: toStr(f.provider),           // 'none' => бэк воспримет как NULL
    referralSource: toStr(f.referralSource),
    isEmailVerified: toBool(f.isEmailVerified),
    identityVerified: toBool(f.identityVerified),
    hasAvatar: toBool(f.hasAvatar),
    hasResume: toBool(f.hasResume),
    jobSearchStatus: f.jobSearchStatus === 'All' ? undefined : (f.jobSearchStatus as any),
    companyName: toStr(f.companyName),
    riskMin: toNum(f.riskMin),
    riskMax: toNum(f.riskMax),
    createdFrom: toStr(f.createdFrom),
    createdTo: toStr(f.createdTo),
    lastLoginFrom: toStr(f.lastLoginFrom),
    lastLoginTo: toStr(f.lastLoginTo),
    sortBy: f.sortBy,
    order: f.order,
  };
};

// onChange хелперы
const setFilter = <K extends keyof typeof exportFilters>(key: K, val: (typeof exportFilters)[K]) =>
  setExportFilters(prev => ({ ...prev, [key]: val }));

  const [growthTrends, setGrowthTrends] = useState<{
    registrations: { period: string; count: number }[];
    jobPosts: { period: string; count: number }[];
  }>({ registrations: [], jobPosts: [] });
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [chatHistory, setChatHistory] = useState<{
    total: number;
    data: {
      id: string;
      job_application_id: string;
      sender_id: string;
      sender: { id: string; username: string; email: string; role: string };
      recipient_id: string;
      recipient: { id: string; username: string; email: string; role: string };
      content: string;
      created_at: string;
      is_read: boolean;
    }[];
  }>({ total: 0, data: [] });

  
  const [selectedJobApplicationId, setSelectedJobApplicationId] = useState<string>('');
  const [chatPage, setChatPage] = useState(1);
  const [chatLimit] = useState(10);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUsers | null>(null);
  const [recentRegistrations, setRecentRegistrations] = useState<AdminRecentRegistrationsDTO>({
  date: '',
  tzOffset: -new Date().getTimezoneOffset(),
  jobseekers_total: 0,
  employers_total: 0,
  jobseekers: [],
  employers: [],
});

  const [globalLimit, setGlobalLimit] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchJobId, setSearchJobId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [riskScoreData, setRiskScoreData] = useState<{ userId: string; riskScore: number; details: { duplicateIp: boolean; proxyDetected: boolean; duplicateFingerprint: boolean } } | null>(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [onlineStatuses, setOnlineStatuses] = useState<{ [key: string]: boolean }>({});
  const [fetchErrors, setFetchErrors] = useState<{ [key: string]: string }>({});
  const [showNotifyModal, setShowNotifyModal] = useState(false);
const [notifyJobPostId, setNotifyJobPostId] = useState<string>('');
  const notifyJob = jobPosts.find(p => p.id === notifyJobPostId);
const [userPage, setUserPage] = useState(1);
const [userLimit] = useState(30);
const [isUsersLoading, setIsUsersLoading] = useState(false);
const [jobPostPage, setJobPostPage] = useState(1);
const [jobPostLimit] = useState(50);
const [jobPostsWithAppsPage, setJobPostsWithAppsPage] = useState(1);
const [jobPostsWithAppsLimit] = useState(10);
const [sortColumn, setSortColumn] = useState<'id' | 'applicationCount' | 'created_at' | null>('created_at'); 
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Изменено: дефолт 'desc' для новых сверху
const [userSortColumn, setUserSortColumn] =
  useState<'id' | 'role' | 'is_blocked' | 'brand' | null>(null);
const [userSortDirection, setUserSortDirection] = useState<'asc' | 'desc'>('asc');
const [complaintSortColumn, setComplaintSortColumn] = useState<'created_at' | 'status' | null>(null);
const [complaintSortDirection, setComplaintSortDirection] = useState<'asc' | 'desc'>('asc');
const [issuesSortColumn, setIssuesSortColumn] = useState<'created_at' | null>('created_at'); 
const [issuesSortDirection, setIssuesSortDirection] = useState<'asc' | 'desc'>('desc'); 
const [storiesSortColumn, setStoriesSortColumn] = useState<'created_at' | null>('created_at'); 
const [storiesSortDirection, setStoriesSortDirection] = useState<'asc' | 'desc'>('desc'); 
const [notificationStats, setNotificationStats] = useState<{ [postId: string]: { sent: number, opened: number, clicked: number } }>({});
const [allEmailStats, setAllEmailStats] = useState<{ sent: number, opened: number, clicked: number, details: { job_post_id: string; email: string; username: string; opened: boolean; clicked: boolean; sent_at: string; opened_at: string | null; clicked_at: string | null; }[] } | null>(null);
const [filterJobPostId, setFilterJobPostId] = useState('');
const [filterTitle, setFilterTitle] = useState('');
const [filterEmployerId, setFilterEmployerId] = useState('');
const [filterEmployerEmail, setFilterEmployerEmail] = useState('');
const [filterEmployerUsername, setFilterEmployerUsername] = useState('');
const [freelancerSignupsToday, setFreelancerSignupsToday] = useState<{ country: string; count: number }[]>([]);
  const [freelancerSignupsYesterday, setFreelancerSignupsYesterday] = useState<{ country: string; count: number }[]>([]);
  const [freelancerSignupsWeek, setFreelancerSignupsWeek] = useState<{ country: string; count: number }[]>([]);
  const [freelancerSignupsMonth, setFreelancerSignupsMonth] = useState<{ country: string; count: number }[]>([]);
  const [businessSignupsToday, setBusinessSignupsToday] = useState<{ country: string; count: number }[]>([]);
  const [businessSignupsYesterday, setBusinessSignupsYesterday] = useState<{ country: string; count: number }[]>([]);
  const [businessSignupsWeek, setBusinessSignupsWeek] = useState<{ country: string; count: number }[]>([]);
const [businessSignupsMonth, setBusinessSignupsMonth] = useState<{ country: string; count: number }[]>([]);
// Complaints pagination
const [complaintsPage, setComplaintsPage] = useState(1);
const [complaintsLimit, setComplaintsLimit] = useState(20);

const [notifyLimit, setNotifyLimit] = useState<string>('10');
const [notifyOrderBy, setNotifyOrderBy] = useState<'beginning' | 'end' | 'random'>('beginning');
const [username, setUsername] = useState<string>('Admin');
  const [onlineEmployers, setOnlineEmployers] = useState<number | null>(null);
  const [onlineFreelancers, setOnlineFreelancers] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');      // NEW
const [jobPostSearchQuery, setJobPostSearchQuery] = useState<string>(''); // NEW
  const [currentTime, setCurrentTime] = useState(new Date());
  const [storyDetails, setStoryDetails] = useState<PlatformFeedbackAdminItem | null>(null);
const [rejectModal, setRejectModal] = useState<{ id: string | null; title?: string }>({ id: null, title: '' });
const [rejectReason, setRejectReason] = useState('');
const [editJobModal, setEditJobModal] = useState<{ id: string; data: Partial<JobPost> & { category_ids?: string[] } } | null>(null);
const [skillInput, setSkillInput] = useState('');
const [isDropdownOpen, setIsDropdownOpen] = useState(false);

const openRejectModal = (id: string, title?: string) => {
  setRejectModal({ id, title });
  setRejectReason('');
};
const closeRejectModal = () => {
  setRejectModal({ id: null, title: '' });
  setRejectReason('');
};

  const [showProfileModal, setShowProfileModal] = useState<string | null>(null); // Добавлено: state для модалки Profile
const [selectedProfile, setSelectedProfile] = useState<JobSeekerProfile | null>(null);
const renderDateCell = (iso?: string | null) => {
  if (!iso) return 'no info';
  const d = new Date(iso);
  const full = format(d, 'PP p'); // локальный формат проекта
  const human = formatDistanceToNow(d, { addSuffix: true }); // “5 minutes ago”
  return <span title={human}>{full}</span>; // человекочитаемое во всплывающей подсказке
};

const getBrand = (u: User) =>
  (u as any)?.brand ?? (u as any)?.siteBrand ?? '—';

const toU = <T,>(v: T | null | undefined): T | undefined =>
  v === null ? undefined : v;

// +++ helpers for categories (используем уже загруженный categories)
const flattenCategories = (cats: Category[]): Category[] =>
  cats.flatMap((c) => [c, ...(c.subcategories ? flattenCategories(c.subcategories) : [])]);

const flattenedCategories = React.useMemo(
  () => flattenCategories(categories),
  [categories]
);

const filteredCats = React.useMemo(() => {
  const all = flattenedCategories;
  const q = skillInput.trim().toLowerCase();
  if (!q) return all.slice(0, 30);
  return all.filter(c => c.name.toLowerCase().includes(q)).slice(0, 30);
}, [flattenedCategories, skillInput]);

const addCat = (id: string) => {
  if (!editJobModal) return;
  const cur = editJobModal.data.category_ids ?? [];
  if (cur.includes(id)) return;
  setEditJobModal({ ...editJobModal, data: { ...editJobModal.data, category_ids: [...cur, id] } });
  setSkillInput('');
  setIsDropdownOpen(false);
};

const removeCat = (id: string) => {
  if (!editJobModal) return;
  const cur = editJobModal.data.category_ids ?? [];
  setEditJobModal({ ...editJobModal, data: { ...editJobModal.data, category_ids: cur.filter(x => x !== id) } });
};

// const filteredCats = (() => {
//   const all = flattenCategories(categories);
//   const q = skillInput.trim().toLowerCase();
//   if (!q) return all.slice(0, 30);
//   return all.filter(c => c.name.toLowerCase().includes(q)).slice(0, 30);
// })();


const [referralFilterJobId, setReferralFilterJobId] = useState(''); // Добавлено: filter by jobId
const [referralFilterJobTitle, setReferralFilterJobTitle] = useState(''); // Добавлено: filter by title
const [expandedReferral, setExpandedReferral] = useState<string | null>(null); // Добавлено: для expandable registrations
const [showReferralModal, setShowReferralModal] = useState<{
  fullLink: string;
  clicks: number;
  registrations: number;
  /** NEW */
  registrationsVerified?: number;
} | null>(null);
const [enrichedComplaints, setEnrichedComplaints] = useState<EnrichedComplaint[]>([]);
const [resolveModal, setResolveModal] = useState<{ id: string; status: 'Resolved' | 'Rejected'; comment: string } | null>(null);

  const navigate = useNavigate();
const location = useLocation();
const handleSort = (column: 'id' | 'applicationCount' | 'created_at') => {
  if (sortColumn === column) {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  } else {
    setSortColumn(column);
    setSortDirection('asc');
  }
};




const [showEmailStatsModal, setShowEmailStatsModal] = useState<{
  jobPostId: string;
  jobTitle?: string;  
  loading: boolean;
  data: {
    sent: number;
    opened: number;
    clicked: number;
    details: {
      email: string;
      username: string;
      opened: boolean;
      clicked: boolean;
      sent_at: string;
      opened_at: string | null;
      clicked_at: string | null;
      job_post_id?: string;
    }[];
  } | null;
} | null>(null);


const openEmailStats = async (jobPostId: string) => {
  // пробуем локально найти заголовок
  const localTitle =
    jobPosts.find(p => p.id === jobPostId)?.title ||
    jobPostsWithApps.find(p => p.id === jobPostId)?.title;

  setShowEmailStatsModal({ jobPostId, jobTitle: localTitle, loading: true, data: null });

  try {
    // если локально не нашли — подтянем пост (тихо, без фейла UI)
    let ensuredTitle = localTitle;
    if (!ensuredTitle) {
      try {
        const jp = await getJobPost(jobPostId);
        ensuredTitle = jp?.title || undefined;
        setShowEmailStatsModal(prev => prev ? { ...prev, jobTitle: ensuredTitle } : prev);
      } catch {/* no-op */}
    }

    const data = await getEmailStatsForJob(jobPostId);
    setShowEmailStatsModal(prev => prev && prev.jobPostId === jobPostId ? {
      ...prev,
      loading: false,
      data: {
        ...data,
        details: data.details.map(d => ({ ...d, job_post_id: jobPostId })),
      }
    } : prev);
  } catch (e) {
    toast.error('Failed to load email stats');
    setShowEmailStatsModal(null);
  }
};



const submitResolveComplaint = async () => {
  if (!resolveModal) return;
  try {
    await resolveComplaint(resolveModal.id, { status: resolveModal.status, comment: resolveModal.comment || undefined });
    const updatedComplaints = await getComplaints<Complaint>();
setComplaints(updatedComplaints || []);
    setResolveModal(null);
    toast.success('Complaint resolved successfully!');
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error resolving complaint:', axiosError);
    toast.error(axiosError.response?.data?.message || 'Failed to resolve complaint.');
  }
};

const [referralLinks, setReferralLinks] = useState<{
  id: string;
  jobPostId: string;
  fullLink: string;
  description?: string | null;
  clicks: number;
  registrations: number;
  /** NEW: число с верифицированным e-mail */
  registrationsVerified?: number;
  registrationsDetails?: { user: { id: string; username: string; email: string; role: string; created_at: string } }[];
  job_post?: { id: string; title: string };
}[]>([]);

// Подменю внутри раздела "Referral Links"
const [refSubTab, setRefSubTab] = useState<'job' | 'site'>('job');
// NEW: раскрытие групп по вакансиям на вкладке Job
// Разворачивание групп по Job Post
const [jobExpanded, setJobExpanded] = useState<Record<string, boolean>>({});
const toggleJobGroup = (jobId: string) =>
  setJobExpanded(prev => ({ ...prev, [jobId]: !prev[jobId] }));



// --- Site referrals (глобальные) ---
const [siteReferrals, setSiteReferrals] = useState<SiteReferralLink[]>([]); // NEW
const [siteQ, setSiteQ] = useState('');                                     // NEW: поиск q
const [siteCreatedByAdminId, setSiteCreatedByAdminId] = useState('');       // NEW: фильтр автора
const [siteExpandedAdmin, setSiteExpandedAdmin] = useState<Record<string, boolean>>({}); // NEW: раскрытие групп
const [siteExpandedLinkId, setSiteExpandedLinkId] = useState<string | null>(null);       // NEW: раскрытие регистраций

// Форма создания глобальной ссылки
const [creatingSite, setCreatingSite] = useState(false);        // NEW
const [newSiteDescription, setNewSiteDescription] = useState('');// NEW
const [newSiteLandingPath, setNewSiteLandingPath] = useState('');// NEW

// Модалка после создания (показать shortLink и копирование)
const [showSiteCreatedModal, setShowSiteCreatedModal] = useState<{ // NEW
  shortLink: string;
  description?: string | null;
  landingPath?: string | null;
} | null>(null);

// Для быстрого "Only me" в фильтре
const [adminId, setAdminId] = useState<string | null>(null);    // NEW

const setSearch = (sp: URLSearchParams) =>
  navigate({ search: `?${sp.toString()}` }, { replace: true });

const [createReferralForJobId, setCreateReferralForJobId] = useState<string | null>(null);
const [newReferralDescription, setNewReferralDescription] = useState<string>('');

const openCreateReferralModal = (jobId: string) => {
  setCreateReferralForJobId(jobId);
  setNewReferralDescription('');
};

const submitCreateReferral = async () => {
  if (!createReferralForJobId) return;
  try {
    const payload = newReferralDescription.trim() ? { description: newReferralDescription.trim() } : {};
    const data = await createReferralLink(createReferralForJobId, payload);
setShowReferralModal({
  fullLink: data.fullLink,
  clicks: data.clicks,
  registrations: data.registrations,
  registrationsVerified: (data as any).registrationsVerified ?? 0,
});
    // Обновляем список (с учётом фильтров страницы)
    const updated = await getReferralLinks({});
    setReferralLinks(updated || []);
    setCreateReferralForJobId(null);
    setNewReferralDescription('');
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error creating referral:', axiosError);
    alert(axiosError.response?.data?.message || 'Failed to create referral link.');
  }
};

// Редактирование описания
const handleEditReferral = async (linkId: string, current?: string | null) => {
  const next = window.prompt('Edit description (optional):', current || '');
  if (next === null) return;
  try {
    await updateReferralLink(linkId, { description: next });
    const updated = await getReferralLinks({ jobId: referralFilterJobId.trim() || undefined, jobTitle: referralFilterJobTitle.trim() || undefined });
    setReferralLinks(updated || []);
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error updating referral:', axiosError);
    toast.error(axiosError.response?.data?.message || 'Failed to update referral link.');
  }
};


// Удаление ссылки
const handleDeleteReferral = async (linkId: string) => {
  if (!window.confirm('Delete this referral link?')) return;
  try {
    await deleteReferralLink(linkId);
    const updated = await getReferralLinks({ jobId: referralFilterJobId.trim() || undefined, jobTitle: referralFilterJobTitle.trim() || undefined });
    setReferralLinks(updated || []);
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error deleting referral:', axiosError);
    toast.error(axiosError.response?.data?.message || 'Failed to delete referral link.');
  }
};

// «Всегда новая» — вместо переиспользования
const handleReferralForPost = (id: string) => {
  openCreateReferralModal(id);
};

// === Site referrals: загрузка списка ===
const fetchSiteReferrals = React.useCallback(async () => {
  try {
    const data = await getSiteReferralLinks({
      q: siteQ.trim() || undefined,
      createdByAdminId: siteCreatedByAdminId.trim() || undefined,
    });
    setSiteReferrals(data || []);
    // не трогаем развороты, чтобы пользователь не терял состояние при повторном поиске
  } catch (e: any) {
    console.error('Failed to load site referrals', e?.response?.data?.message || e?.message);
    setSiteReferrals([]);
    alert(e?.response?.data?.message || 'Failed to load site referrals.');
  }
}, [siteQ, siteCreatedByAdminId]);

// === Site referrals: создание ===
const handleCreateSiteReferral = async () => {
  try {
    setCreatingSite(true);
    const payload: any = {};
    if (newSiteDescription.trim()) payload.description = newSiteDescription.trim();
    if (newSiteLandingPath.trim()) payload.landingPath = newSiteLandingPath.trim();

    const created = await createSiteReferralLink(payload);

    setShowSiteCreatedModal({
      shortLink: created.shortLink,
      description: created.description ?? undefined,
      landingPath: created.landingPath ?? undefined,
    });

    // Обновляем список
    await fetchSiteReferrals();

    // NEW: автоматически раскрываем группу автора, чтобы новая ссылка была сразу видна
    const myAdminId =
      created.createdByAdmin?.id ||
      created.createdByAdminId ||
      adminId ||
      null;
    if (myAdminId) {
      setSiteExpandedAdmin(prev => ({ ...prev, [myAdminId]: true }));
    }

    setNewSiteDescription('');
    setNewSiteLandingPath('');
  } catch (e: any) {
    console.error('Failed to create site referral', e?.response?.data?.message || e?.message);
    toast.error(e?.response?.data?.message || 'Failed to create site referral link.');
  } finally {
    setCreatingSite(false);
  }
};


// === Site referrals: редактирование описания ===
const handleEditSiteReferral = async (id: string, current?: string | null) => {
  const next = window.prompt('Edit description (optional):', current || '');
  if (next === null) return;
  try {
    const { description } = await updateSiteReferralLink(id, { description: next || undefined });
    // точечно обновим строку без перезагрузки
    setSiteReferrals(prev => prev.map(l => l.id === id ? { ...l, description } : l));
  } catch (e: any) {
    console.error('Failed to update site referral', e?.response?.data?.message || e?.message);
    toast.error(e?.response?.data?.message || 'Failed to update site referral.');
  }
};

// === Site referrals: удаление ===
const handleDeleteSiteReferral = async (id: string) => {
  if (!window.confirm('Delete this referral link?')) return;
  try {
    await deleteSiteReferralLink(id);
    setSiteReferrals(prev => prev.filter(l => l.id !== id));
  } catch (e: any) {
    console.error('Failed to delete site referral', e?.response?.data?.message || e?.message);
    toast.error(e?.response?.data?.message || 'Failed to delete site referral.');
  }
};

// === Вспомогательное: свернуть/развернуть группу по админу ===
const toggleSiteGroup = (aid: string) =>
  setSiteExpandedAdmin(prev => ({ ...prev, [aid]: !prev[aid] }));



// helpers
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const updateCN = (updater: (p: ChatNotificationsSettings) => ChatNotificationsSettings) =>
  setChatNotif(prev => (prev ? updater(prev) : prev));

const loadChatNotif = async () => {
  setChatNotifLoading(true);
  try {
    const data = await getChatNotificationSettings();
    setChatNotif(normalizeCN(data));
  } catch (e) {
    setFetchErrors(prev => ({ ...prev, chatNotif: 'Failed to load chat notification settings.' }));
    setChatNotif(normalizeCN({}));
  } finally {
    setChatNotifLoading(false);
  }
};

useEffect(() => {
  const sp = new URLSearchParams(location.search);

  const tab = sp.get('fb_tab');
  setFbSubtab(tab === 'platform' ? 'platform' : 'tech');

  if (sp.has('tf_page')) {
    const tp = parseInt(sp.get('tf_page')!, 10);
    if (Number.isFinite(tp) && tp > 0) setTfPage(tp);
  }
  if (sp.has('tf_limit')) {
    const tl = parseInt(sp.get('tf_limit')!, 10);
    if (Number.isFinite(tl)) setTfLimit(clamp(tl, 1, 100));
  }

  if (sp.has('pf_page')) {
    const pp = parseInt(sp.get('pf_page')!, 10);
    if (Number.isFinite(pp) && pp > 0) setPfPage(pp);
  }
  if (sp.has('pf_limit')) {
    const pl = parseInt(sp.get('pf_limit')!, 10);
    if (Number.isFinite(pl)) setPfLimit(clamp(pl, 1, 100));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

useEffect(() => {
  if (activeTab === 'Referral Links' && refSubTab === 'site') {
    // первая загрузка без фильтров
    fetchSiteReferrals();
  }
}, [activeTab, refSubTab, fetchSiteReferrals]);

useEffect(() => {
  if (activeTab !== 'Settings') return;
  (async () => {
    try {
      const { required } = await getAdminRegistrationAvatarRequired();
      setRegAvatarRequired(!!required);
    } catch {
      setRegAvatarRequired(false); // дефолт — не блокировать, если запрос упал
    }
  })();
}, [activeTab]);


useEffect(() => {
  const sp = new URLSearchParams(location.search);
  sp.set('fb_tab', fbSubtab);
  sp.set('tf_page', String(tfPage));
  sp.set('tf_limit', String(tfLimit));
  sp.set('pf_page', String(pfPage));
  sp.set('pf_limit', String(pfLimit));
  setSearch(sp);
}, [fbSubtab, tfPage, tfLimit, pfPage, pfLimit, location.search, navigate]);

useEffect(() => {
  const sp = new URLSearchParams(location.search);
  const p = parseInt(sp.get('c_page') || '1', 10);
  const l = parseInt(sp.get('c_limit') || '20', 10);
  if (!Number.isNaN(p) && p > 0) setComplaintsPage(p);
  if (!Number.isNaN(l)) setComplaintsLimit(Math.min(Math.max(1, l), 100));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

useEffect(() => {
  const sp = new URLSearchParams(location.search);
  sp.set('c_page', String(complaintsPage));
  sp.set('c_limit', String(complaintsLimit));
  setSearch(sp);
}, [complaintsPage, complaintsLimit, navigate, location.search]);

useEffect(() => {
  setComplaintsPage(1);
}, [statusFilter, complaintSortColumn, complaintSortDirection]);


const loadTech = useCallback(async () => {
  setTechLoading(true);
  try {
    const res = await getTechFeedback({ page: tfPage, limit: tfLimit });
    setTechFeedback(res.data || []);
    setTfTotal(res.total || 0);
  } catch {
    setTechFeedback([]);
    setTfTotal(0);
  } finally {
    setTechLoading(false);
  }
}, [tfPage, tfLimit]);

const loadPlatform = useCallback(async () => {
  try {
    const res = await getPlatformFeedback({ page: pfPage, limit: pfLimit });
    setStories(res.data || []); // stories у вас уже есть в state
    setPfTotal(res.total || 0);
  } catch {
    setStories([]);
    setPfTotal(0);
  }
}, [pfPage, pfLimit]);

useEffect(() => {
  if (activeTab !== 'Feedback') return;
  if (fbSubtab === 'tech') loadTech();
  if (fbSubtab === 'platform') loadPlatform();
}, [activeTab, fbSubtab, loadTech, loadPlatform]);


useEffect(() => {
  if (activeTab === 'Settings') loadChatNotif();
}, [activeTab]);

useEffect(() => {
  if (!chatNotif) return;
  const { immediate, delayedIfUnread, after24hIfUnread } = chatNotif.onEmployerMessage as any;
  if (
    chatNotif.enabled &&
    !immediate &&
    !delayedIfUnread?.enabled &&
    !after24hIfUnread?.enabled
  ) {
    setChatNotifWarning('Warning: nothing will be sent with current settings.');
  } else {
    setChatNotifWarning(null);
  }
}, [chatNotif]);


// save handler
const saveChatNotif = async () => {
  if (!chatNotif) return;
  setChatNotifSaving(true);
  try {
    const payload = {
      ...chatNotif,
      onEmployerMessage: {
        ...chatNotif.onEmployerMessage,
        after24hIfUnread: chatNotif.onEmployerMessage.after24hIfUnread
          ? {
              enabled: !!chatNotif.onEmployerMessage.after24hIfUnread.enabled,
              hours: clamp(Number(chatNotif.onEmployerMessage.after24hIfUnread.hours) || 24, 1, 168),
            }
          : { enabled: false, hours: 24 },
      },
    };
    const saved = await updateChatNotificationSettings(payload as ChatNotificationsSettings);
    setChatNotif(normalizeCN(saved || {}));
    toast.success('Chat notification settings saved.');
  } catch (e: any) {
    const msg = e?.response?.data?.message || 'Failed to save chat notifications.';
    toast.error(msg);
  } finally {
    setChatNotifSaving(false);
  }
};

// AdminDashboard.tsx
// парсинг query при первом рендере
useEffect(() => {
  const sp = new URLSearchParams(location.search);
  const p = parseInt(sp.get('r_page') || '1', 10);
  const l = parseInt(sp.get('r_limit') || '10', 10);
  const s = (sp.get('r_status') || 'All') as 'All' | 'Pending' | 'Approved' | 'Rejected';
  if (!Number.isNaN(p)) setReviewPage(Math.max(1, p));
  if (!Number.isNaN(l)) setReviewLimit(Math.min(Math.max(1, l), 100));
  if (['All','Pending','Approved','Rejected'].includes(s)) setReviewStatus(s);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// запись query при изменениях
useEffect(() => {
  const sp = new URLSearchParams(location.search);
  sp.set('r_page', String(reviewPage));
  sp.set('r_limit', String(reviewLimit));
  sp.set('r_status', reviewStatus);
  setSearch(sp);
}, [reviewPage, reviewLimit, reviewStatus, navigate, location.search]);

// загрузчик конкретно для Reviews
const loadReviews = useCallback(async () => {
  const params: { page: number; limit: number; status?: 'Pending'|'Approved'|'Rejected' } = {
    page: reviewPage,
    limit: reviewLimit,
  };
  if (reviewStatus !== 'All') params.status = reviewStatus;
  try {
    const res = await getAdminReviews(params);
    const normalized = (res.data ?? []).map((r: any) => ({
      ...r,
    job_application_id: r.job_application_id ?? undefined,}));
    setReviews(normalized as Review[]);
    setReviewsTotal(res.total ?? 0);
  } catch (e) {
    setReviews([]);
    setReviewsTotal(0);
  }
}, [reviewPage, reviewLimit, reviewStatus]);

// подгружаем когда активна вкладка и/или меняются параметры
useEffect(() => {
  if (activeTab === 'Reviews') loadReviews();
}, [activeTab, loadReviews]);


useEffect(() => {
  const enrichComplaints = async () => {
    const enriched = await Promise.all(complaints.map(async (complaint) => {
      let targetUsername = 'N/A';
      if (complaint.job_post_id) {
        const jobPost = await getJobPost(complaint.job_post_id).catch(() => null);
        targetUsername = jobPost?.employer?.username || 'N/A';
      } else if (complaint.profile_id) {
        const profileData = await getUserProfileById(complaint.profile_id).catch(() => null);
        targetUsername = profileData?.username || 'N/A';
      }
      return { ...complaint, targetUsername };
    }));
    setEnrichedComplaints(enriched);
  };
  enrichComplaints();
}, [complaints]);

useEffect(() => {
  if (currentRole !== 'admin') return;
  (async () => {
    try {
      const stats = await getRegistrationStats({
        startDate: '2023-01-01',
        endDate: new Date().toISOString().split('T')[0],
        interval: selectedInterval,
      });
      setRegistrationStats(stats || []);
      setFetchErrors(prev => ({ ...prev, getRegistrationStats: '' }));
    } catch {
      setFetchErrors(prev => ({ ...prev, getRegistrationStats: 'Failed to load registration stats.' }));
    }
  })();
}, [selectedInterval, currentRole]);


useEffect(() => {
  if (showProfileModal) {
    const fetchProfile = async () => {
      try {
        const profileData = await getUserProfileById(showProfileModal);
        setSelectedProfile(profileData);
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error('Error fetching profile:', axiosError);
        alert(axiosError.response?.data?.message || 'Failed to fetch profile.');
      }
    };
    fetchProfile();
  }
}, [showProfileModal]);

useEffect(() => {
  if (showNotifyModal) {
    console.log('Rendering modal'); // Добавлено: лог для проверки рендера модалки (без JSX)
  }
}, [showNotifyModal]);


useEffect(() => {
  if (location.state?.jobPostId) setFilterJobPostId(location.state.jobPostId);
}, [location.state]);

const sortedJobPostsWithApps = React.useMemo(() => {
  const arr = [...jobPostsWithApps];
  if (!sortColumn) return arr;
  const direction = sortDirection === 'asc' ? 1 : -1;
  return arr.sort((a, b) => {
    if (sortColumn === 'id') return a.id.localeCompare(b.id) * direction;
    if (sortColumn === 'applicationCount') return (a.applicationCount - b.applicationCount) * direction;
    if (sortColumn === 'created_at') return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
    return 0;
  });
}, [jobPostsWithApps, sortColumn, sortDirection]);

const handleUserSort = (column: 'id' | 'role' | 'is_blocked' | 'brand') => {
  if (userSortColumn === column) {
    setUserSortDirection(userSortDirection === 'asc' ? 'desc' : 'asc');
  } else {
    setUserSortColumn(column);
    setUserSortDirection('asc');
  }
};

const sortedUsers = React.useMemo(() => {
  const arr = [...users];
  if (!userSortColumn) return arr;
  const direction = userSortDirection === 'asc' ? 1 : -1;
  return arr.sort((a, b) => {
    if (userSortColumn === 'id') return a.id.localeCompare(b.id) * direction;
    if (userSortColumn === 'brand') {
      const aBrand = getBrand(a).toLowerCase();
      const bBrand = getBrand(b).toLowerCase();
      return aBrand.localeCompare(bBrand) * direction;
    }
    if (userSortColumn === 'role') return (a.role || '').localeCompare(b.role || '') * direction;
    if (userSortColumn === 'is_blocked') {
      const aBlocked = a.status === 'blocked' ? 1 : 0;
      const bBlocked = b.status === 'blocked' ? 1 : 0;
      return (aBlocked - bBlocked) * direction;
    }
    return 0;
  });
}, [users, userSortColumn, userSortDirection, getBrand]);


const usersToRender = sortedUsers;

const paginatedJobPostsWithApps = sortedJobPostsWithApps.slice(
  (jobPostsWithAppsPage - 1) * jobPostsWithAppsLimit,
  jobPostsWithAppsPage * jobPostsWithAppsLimit
);

const handleComplaintSort = (column: 'created_at' | 'status') => {
  if (complaintSortColumn === column) {
    setComplaintSortDirection(complaintSortDirection === 'asc' ? 'desc' : 'asc');
  } else {
    setComplaintSortColumn(column);
    setComplaintSortDirection('asc');
  }
};

const handleIssuesSort = (column: 'created_at') => {
  if (issuesSortColumn === column) {
    setIssuesSortDirection(issuesSortDirection === 'asc' ? 'desc' : 'asc');
  } else {
    setIssuesSortColumn(column);
    setIssuesSortDirection('asc');
  }
};

const sortedIssues = [...issues].sort((a, b) => {
  if (!issuesSortColumn) return 0;
  const direction = issuesSortDirection === 'asc' ? 1 : -1;
  return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
});

const handleStoriesSort = (column: 'created_at') => {
  if (storiesSortColumn === column) {
    setStoriesSortDirection(storiesSortDirection === 'asc' ? 'desc' : 'asc');
  } else {
    setStoriesSortColumn(column);
    setStoriesSortDirection('asc');
  }
};



const sortedStories = [...stories].sort((a, b) => {
  if (!storiesSortColumn) return 0;
  const direction = storiesSortDirection === 'asc' ? 1 : -1;
  return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
});

const sortedComplaints = [...enrichedComplaints] // Изменено: enrichedComplaints вместо complaints
  .filter((complaint) => statusFilter === 'All' || complaint.status === statusFilter)
  .sort((a, b) => {
    if (!complaintSortColumn) return 0;
    const direction = complaintSortDirection === 'asc' ? 1 : -1;
    if (complaintSortColumn === 'created_at') {
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
    } else if (complaintSortColumn === 'status') {
      return (a.status || '').localeCompare(b.status || '') * direction;
    }
    return 0;
  });

  const complaintsTotalPages = Math.max(
  1,
  Math.ceil(sortedComplaints.length / complaintsLimit)
);

const paginatedComplaints = React.useMemo(() => {
  const start = (complaintsPage - 1) * complaintsLimit;
  return sortedComplaints.slice(start, start + complaintsLimit);
}, [sortedComplaints, complaintsPage, complaintsLimit]);

// Бережная защита если список “усох” (например, после Resolve):
useEffect(() => {
  const totalPages = Math.max(1, Math.ceil(sortedComplaints.length / complaintsLimit));
  if (complaintsPage > totalPages) setComplaintsPage(totalPages);
}, [sortedComplaints.length, complaintsLimit, complaintsPage]);


const fetchJobPosts = useCallback(async (params: {
  page?: number; limit?: number;
  title?: string; employer_id?: string; employer_username?: string;
  id?: string; category_id?: string; status?: string; pendingReview?: string;
} = {}) => {
  try {
    setIsLoading(true);
    setFetchErrors(prev => ({ ...prev, getAllJobPosts: '' }));
    const q = {
      page: params.page ?? jobPostPage,
      limit: params.limit ?? jobPostLimit,
      title: params.title,
      employer_id: params.employer_id,
      employer_username: params.employer_username,
      id: params.id,
      category_id: params.category_id,
      status: params.status,
      pendingReview: params.pendingReview,
    };
    const response = await getAllJobPosts(q);
    setJobPosts(response.data || []);
  } catch (err) {
    const axiosError = err as AxiosError<{ message?: string }>;
    setFetchErrors(prev => ({ ...prev, getAllJobPosts: axiosError.response?.data?.message || 'Failed to load job posts.' }));
  } finally {
    setIsLoading(false);
  }
}, [jobPostPage, jobPostLimit]);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decoded: DecodedToken = jwtDecode(token);
          setUsername(decoded.username || 'Admin');
          setAdminId(decoded.sub || null);
        } catch (error) {
          console.error('Error decoding token:', error);
          setUsername('Admin');
        }
      }

      try {
        const onlineData = await getOnlineUsers();
        setOnlineEmployers(onlineData?.employers ?? null);
        setOnlineFreelancers(onlineData?.jobseekers ?? null);
      } catch (error) {
        console.error('Error fetching online users:', error);
        setOnlineEmployers(null);
        setOnlineFreelancers(null);
      }
    };

    fetchUserData();
  }, []);

useEffect(() => {
  if (activeTab === 'Email Notifications') {
    const fetch = async () => {
      const params: { jobPostId?: string, title?: string, employerId?: string, employerEmail?: string, employerUsername?: string } = {};
      if (filterJobPostId) params.jobPostId = filterJobPostId;
      if (filterTitle) params.title = filterTitle;
      if (filterEmployerId) params.employerId = filterEmployerId;
      if (filterEmployerEmail) params.employerEmail = filterEmployerEmail;
      if (filterEmployerUsername) params.employerUsername = filterEmployerUsername;
      const data = await getAllEmailStats(params);
      setAllEmailStats(data);
    };
    fetch();
  }
}, [activeTab, filterJobPostId, filterTitle, filterEmployerId, filterEmployerEmail, filterEmployerUsername]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Обновление каждую минуту
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('token');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  const handleBackofficeClick = () => {
    window.location.reload();
  };

// Для пользователей


const buildUserSearch = (page = userPage, s: string = userSearchQuery) => {
  const q: any = { page, limit: userLimit };
  const term = s.trim();
  if (!term) return q;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(term)) q.id = term;
  else if (term.includes('@')) q.email = term;
  else q.username = term;
  return q;
};

  const fetchUsers = useCallback(async (params: {
  page?: number; limit?: number; username?: string; email?: string; id?: string;
  createdAfter?: string; role?: 'employer'|'jobseeker'|'admin'|'moderator';
  status?: 'active'|'blocked'; } = {}) => {
  if (!currentRole || currentRole !== 'admin') {
    setError('This page is only available for admins.');
    setIsUsersLoading(false);
    return;
  }

  try {
    setIsUsersLoading(true);
    setFetchErrors((prev) => ({ ...prev, getAllUsers: '' }));
    
const queryParams: any = {
    page: params.page ?? userPage,
    limit: params.limit ?? userLimit,
  };
  if (params.username) queryParams.username = params.username;
  if (params.email) queryParams.email = params.email;
  if (params.id) queryParams.id = params.id;
  if (params.createdAfter) queryParams.createdAfter = params.createdAfter;
  if (params.role) queryParams.role = params.role;
  if (params.status) queryParams.status = params.status;

  const userResponse = await getAllUsers(queryParams);
  const { data: userData = [], total = 0 } = userResponse || {};
  setUsers(userData);
  setUserTotal(total);
    console.log('Users set in state:', userData);
      
      // Добавлено: запрос онлайн-статусов для всех юзеров
     const statuses = await Promise.all(
      userData.map(u => getUserOnlineStatus(u.id).catch(() => ({ isOnline:false })))
    );
    setOnlineStatuses(userData.reduce((acc, u, i) => {
      acc[u.id] = statuses[i].isOnline; return acc;
    }, {} as Record<string, boolean>));

  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    setFetchErrors(prev => ({
      ...prev,
      getAllUsers: axiosError.response?.data?.message || 'Failed to load users data',
    }));
    setError('Some data failed to load. Check errors below.');
  } finally {
    setIsUsersLoading(false);                       // ← локально
  }
}, [currentRole, userPage, userLimit]);




useEffect(() => {
  fetchUsers(buildUserSearch(userPage));
}, [userPage, userLimit, fetchUsers]);

useEffect(() => {
  if (activeTab !== 'Analytics') return;

  (async () => {
    try {
      setBrandsLoading(true);
      setBrandsError(null);
      const data = await getBrandsAnalytics({
        startDate: brandsRange.startDate,
        endDate: brandsRange.endDate,
      });
      setBrandsData(data);
    } catch (e: any) {
      setBrandsError(e?.message || 'Failed to load brands analytics');
    } finally {
      setBrandsLoading(false);
    }
  })();
}, [activeTab, brandsRange.startDate, brandsRange.endDate]);


// useEffect(() => {


//   setIsLoading(true);
//   setUsers(mockUsers);
//   setIsLoading(false);
// }, [currentRole, userPage]);



useEffect(() => {
  if (!socket) return;

  const onJobPostsChanged = () => fetchJobPosts();
  const onComplaintsChanged = async () =>
  setComplaints((await getComplaints<Complaint>()) || []);
  const onReferralChanged = async () => setReferralLinks(await getReferralLinks({}) || []);
  const onUsersChanged = () => fetchUsers({ page: userPage, limit: userLimit });

  socket.on('jobPostUpdated', onJobPostsChanged);
  socket.on('complaintResolved', onComplaintsChanged);
  socket.on('referralLinkCreated', onReferralChanged);
  socket.on('userUpdated', onUsersChanged);

  return () => {
    socket.off('jobPostUpdated', onJobPostsChanged);
    socket.off('complaintResolved', onComplaintsChanged);
    socket.off('referralLinkCreated', onReferralChanged);
    socket.off('userUpdated', onUsersChanged);
  };
}, [socket, fetchJobPosts, fetchUsers, userPage, userLimit]);


// Для остальных данных
 const fetchOtherData = async () => {
  if (!currentRole || currentRole !== 'admin') return;

  try {
    setIsLoading(true);
    setFetchErrors((prev) => ({
      ...prev,
      getAllJobPosts: '',
      getPendingJobPosts: '',
      getAllReviews: '',
      getFeedback: '',
      getPlatformFeedback: '',
      getBlockedCountries: '',
      getCategories: '',
      getAnalytics: '',
      getRegistrationStats: '',
      freelancerSignupsToday: '',
      freelancerSignupsYesterday: '',
      freelancerSignupsWeek: '',
      freelancerSignupsMonth: '',
      businessSignupsToday: '',
      businessSignupsYesterday: '',
      businessSignupsWeek: '',
      businessSignupsMonth: '',
      getTopEmployers: '',
      getTopJobseekers: '',
      getTopJobseekersByViews: '',
      getTopEmployersByPosts: '',
      getGrowthTrends: '',
      getComplaints: '',
      getGlobalApplicationLimit: '',
      getOnlineUsers: '',
      getRecentRegistrations: '',
      getJobPostsWithApplications: '',
    }));

 const tzOffset = -new Date().getTimezoneOffset();                // ← единый оффсет пользователя
const today = format(new Date(), 'yyyy-MM-dd');
const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
const monthStart = format(subDays(new Date(), 29), 'yyyy-MM-dd'); // ← rolling 30d
const monthEnd = today;                                           // ← до «сегодня»

const requests = [
  getAllJobPosts({ page: jobPostPage, limit: jobPostLimit }),          // 0
  getPlatformFeedback(),                                                // 1
  getBlockedCountries(),                                                // 2
  getAdminCategories(),                                                 // 3
  getAnalytics(),                                                       // 4
  getRegistrationStats({ startDate:'2023-01-01', endDate:new Date().toISOString().split('T')[0], interval:selectedInterval }), // 5
  getGeographicDistribution({ role:'jobseeker', startDate: today, endDate: today, tzOffset }),       // 6
  getGeographicDistribution({ role:'jobseeker', startDate: yesterday, endDate: yesterday, tzOffset }),// 7
  getGeographicDistribution({ role:'jobseeker', startDate: weekStart, endDate: weekEnd, tzOffset }), // 8
  getGeographicDistribution({ role:'jobseeker', startDate: monthStart, endDate: monthEnd, tzOffset }),// 9
  getGeographicDistribution({ role:'employer',  startDate: today, endDate: today, tzOffset }),       // 10
  getGeographicDistribution({ role:'employer',  startDate: yesterday, endDate: yesterday, tzOffset }),// 11
  getGeographicDistribution({ role:'employer',  startDate: weekStart, endDate: weekEnd, tzOffset }), // 12
  getGeographicDistribution({ role:'employer',  startDate: monthStart, endDate: monthEnd, tzOffset }),// 13
  getTopEmployers(5),                                                   // 14
  getTopJobseekers(5),                                                  // 15
  getTopJobseekersByViews(5),                                           // 16
  getTopEmployersByPosts(5),                                            // 17
  getGrowthTrends({ period: '30d' }),                                   // 18
  getComplaints(),                                                      // 19
  getGlobalApplicationLimit(),                                          // 20
  getOnlineUsers(),                                                     // 21
  getRecentRegistrations({ limit: 5 }),                                 // 22
  getJobPostsWithApplications(),                                        // 23
];


    type RequestResult =
      | PaginatedResponse<JobPost>
      | Review[]
      | Feedback[]
      | { id: string; user_id: string; rating: number; description: string; created_at: string; updated_at: string; user: { id: string; username: string; role: string } }[]
      | BlockedCountry[]
      | Category[]
      | { totalUsers: number; employers: number; jobSeekers: number; totalJobPosts: number; activeJobPosts: number; totalApplications: number; totalReviews: number }
      | { period: string; count: number }[]
      | { country: string; count: number }[]
      | { employer_id: string; username: string; job_count: number }[]
      | { job_seeker_id: string; username: string; application_count: number }[]
      | { userId: string; username: string; email: string; profileViews: number }[]
      | { userId: string; username: string; email: string; jobCount: number }[]
      | { registrations: { period: string; count: number }[]; jobPosts: { period: string; count: number }[] }
      | { id: string; complainant_id: string; complainant: { id: string; username: string; email: string; role: string }; job_post_id?: string; job_post?: { id: string; title: string; description: string }; profile_id?: string; reason: string; status: 'Pending' | 'Rejected' | 'Resolved'; created_at: string; resolution_comment?: string }[]
      | { globalApplicationLimit: number | null }
      | OnlineUsers
      | RecentRegistrations
      | JobPostWithApplications[]
      | PlatformFeedbackList;

    const results = await Promise.allSettled(requests);
    const errors: { [key: string]: string } = {};

const endpoints = [
  'getAllJobPosts',            // 0
  'getPlatformFeedback',       // 1
  'getBlockedCountries',       // 2
  'getAdminCategories',        // 3
  'getAnalytics',              // 4
  'getRegistrationStats',      // 5
  'freelancerSignupsToday',    // 6  (jobseekers today)
  'freelancerSignupsYesterday',// 7
  'freelancerSignupsWeek',     // 8
  'freelancerSignupsMonth',    // 9
  'businessSignupsToday',      // 10 (employers today)
  'businessSignupsYesterday',  // 11
  'businessSignupsWeek',       // 12
  'businessSignupsMonth',      // 13
  'getTopEmployers',           // 14
  'getTopJobseekers',          // 15
  'getTopJobseekersByViews',   // 16
  'getTopEmployersByPosts',    // 17
  'getGrowthTrends',           // 18
  'getComplaints',             // 19
  'getGlobalApplicationLimit', // 20
  'getOnlineUsers',            // 21
  'getRecentRegistrations',    // 22
  'getJobPostsWithApplications', // 23
];



    for (const [index, result] of results.entries()) {
      if (result.status === 'fulfilled') {
        console.log(`${endpoints[index]} succeeded:`, result.value);
        const value = result.value as RequestResult;
      switch (index) {
  case 0:  setJobPosts((value as PaginatedResponse<JobPost>).data || []); break;
  case 1:  setStories((value as PlatformFeedbackList).data || []); break;
  case 2:  setBlockedCountries(value as BlockedCountry[] || []); break;
  case 3:  setCategories(value as Category[] || []); break;
  case 4:  setAnalytics(value as typeof analytics || null); break;
  case 5:  setRegistrationStats(value as {period:string;count:number}[] || []); break;
  case 6:  setFreelancerSignupsToday(value as any[] || []); break;
  case 7:  setFreelancerSignupsYesterday(value as any[] || []); break;
  case 8:  setFreelancerSignupsWeek(value as any[] || []); break;
  case 9:  setFreelancerSignupsMonth(value as any[] || []); break;
  case 10: setBusinessSignupsToday(value as any[] || []); break;
  case 11: setBusinessSignupsYesterday(value as any[] || []); break;
  case 12: setBusinessSignupsWeek(value as any[] || []); break;
  case 13: setBusinessSignupsMonth(value as any[] || []); break;
  case 14: setTopEmployers(value as any[] || []); break;
  case 15: setTopJobseekers(value as any[] || []); break;
  case 16: setTopJobseekersByViews(value as any[] || []); break;
  case 17: setTopEmployersByPosts(value as any[] || []); break;
  case 18: setGrowthTrends(value as typeof growthTrends || {registrations:[], jobPosts:[]}); break;
  case 19: setComplaints(value as typeof complaints || []); break;
  case 20: setGlobalLimit((value as {globalApplicationLimit:number|null}).globalApplicationLimit ?? null); break;
  case 21: setOnlineUsers(value as OnlineUsers || null); break;
  case 22:
    try {
      const data = await getRecentRegistrationsToday({ limit: 5 });
      setRecentRegistrations(data as AdminRecentRegistrationsDTO);
    } catch { /* noop */ }
    break;
  case 23: {
    const postsWithApps = (value as JobPostWithApplications[]).map(post => ({
      ...post,
      username: post.employer?.username || 'N/A',
      category: typeof post.category === 'string' ? post.category : post.category?.name || 'N/A',
    }));
    setJobPostsWithApps(postsWithApps);
    const statsResults = await Promise.all(postsWithApps.map(p =>
      getEmailStatsForJob(p.id).catch(() => ({ sent:0, opened:0, clicked:0 }))
    ));
    const statsMap = postsWithApps.reduce((acc, p, i) => { acc[p.id] = statsResults[i]; return acc; }, {} as Record<string,{sent:number;opened:number;clicked:number}>);
    setNotificationStats(statsMap);
    const referralData = await getReferralLinks({});
    setReferralLinks(referralData || []);
    break;
  }
}

      } else {
        const axiosError = result.reason as AxiosError<{ message?: string }>;
        console.error(`${endpoints[index]} failed:`, axiosError.response?.data?.message || axiosError.message);
        const errorMsg = axiosError.response?.data?.message || `Failed to load ${endpoints[index]} data`;
        errors[endpoints[index]] = errorMsg;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFetchErrors((prev) => ({ ...prev, ...errors }));
      setError('Some data failed to load. Check errors below.');
    } else {
      setError(null);
    }
  } catch (error) {
    console.error('Unexpected error fetching other data:', error);
    setError('Unexpected error occurred. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

// Первый useEffect
useEffect(() => {
  if (currentRole === 'admin') {
    fetchOtherData();
  }
}, [currentRole]);

useEffect(() => {
  if (currentRole === 'admin') {
    fetchJobPosts();
  }
}, [currentRole, jobPostPage, fetchJobPosts]);

// Функция handleRefresh
const handleRefresh = async () => {
  setIsLoading(true);
  await fetchJobPosts();
  await fetchOtherData();
  setIsLoading(false);
};



// useEffect(() => {


//   setIsLoading(true);
//   setJobPosts(mockJobPosts);
//   const enrichedJobPostsWithApps = mockJobPostsWithApps.map(post => ({
//     ...post,
//     username: post.username || 'N/A',
//   }));
//   setJobPostsWithApps(enrichedJobPostsWithApps);
//   setReviews(mockReviews);
//   setFeedback(mockFeedback);
//   setBlockedCountries(mockBlockedCountries);
//   setCategories(mockCategories);
//   setAnalytics(mockAnalytics);
//   setRegistrationStats(mockRegistrationStats);
//   setGeographicDistribution(mockGeographicDistribution);
//   setFreelancerSignups(mockFreelancerSignups);
//   setBusinessSignups(mockBusinessSignups);
//   setTopEmployers(mockTopEmployers);
//   setTopJobseekers(mockTopJobseekers);
//   setTopJobseekersByViews(mockTopJobseekersByViews);
//   setTopEmployersByPosts(mockTopEmployersByPosts);
//   setGrowthTrends(mockGrowthTrends);
//   setComplaints(mockComplaints);
//   setGlobalLimit(100);
//   setOnlineUsers(mockOnlineUsers);
//   setRecentRegistrations(mockRecentRegistrations);
//   setJobApplications(mockJobApplications);
//   setFetchErrors({});
//   setError(null);
//   setIsLoading(false);
// }, [currentRole, jobPostPage]);





  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(id);
        if (users.length === 1 && userPage > 1) {
        setUserPage(userPage - 1);
        toast.success('User deleted successfully!');
        } else {
  await fetchUsers(buildUserSearch(userPage)); }
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error('Error deleting user:', axiosError);
        toast.error(axiosError.response?.data?.message || 'Failed to delete user.');
      }
    }
  };


const submitReject = async () => {
  if (!rejectModal.id) return;
  const reason = rejectReason.trim();
  if (!reason) {
    alert('Reason is required.');
    return;
  }
  try {
    await rejectJobPost(rejectModal.id, reason);
    setJobPosts(prev => prev.filter(p => p.id !== rejectModal.id));
    setJobPostsWithApps(prev => prev.filter(p => p.id !== rejectModal.id));
    closeRejectModal();
    toast.success('Job post rejected successfully!');
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    toast.error(axiosError.response?.data?.message || 'Failed to reject job post.');
  }
};

  const handleResetPassword = async (id: string) => {
    const newPassword = prompt('Enter new password:');
    if (newPassword) {
      try {
        await resetUserPassword(id, newPassword);
        toast.success('Password reset successfully!');
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error('Error resetting password:', axiosError);
        toast.error(axiosError.response?.data?.message || 'Failed to reset password.');
      }
    }
  };



const handleVerifyIdentity = async (id: string, verify: boolean) => {
  try {
    await verifyIdentity(id, verify);
    toast.success(`Identity ${verify ? 'verified' : 'rejected'} successfully!`);
    await fetchUsers(buildUserSearch());
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error verifying identity:', axiosError);
    toast.error(axiosError.response?.data?.message || 'Failed to verify identity.');
  }
};

  const handleBlockUser = async (id: string, username: string) => {
  if (window.confirm(`Are you sure you want to block ${username}?`)) {
    try {
      await blockUser(id);
      toast.success('User blocked successfully!');
     await fetchUsers(buildUserSearch(userPage));
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error blocking user:', axiosError);
      toast.error(axiosError.response?.data?.message || 'Failed to block user.');
    }
  }
};

const normalizeCN = (raw: any): ChatNotificationsSettings => ({
  enabled: !!raw?.enabled,
  onEmployerMessage: {
    immediate: !!raw?.onEmployerMessage?.immediate,
    delayedIfUnread: {
      enabled: !!raw?.onEmployerMessage?.delayedIfUnread?.enabled,
      minutes: clamp(
        Number(raw?.onEmployerMessage?.delayedIfUnread?.minutes) || 60,
        1, 10080
      ),
    },
    after24hIfUnread: { // NEW
      enabled: !!raw?.onEmployerMessage?.after24hIfUnread?.enabled,
      hours: clamp(
        Number(raw?.onEmployerMessage?.after24hIfUnread?.hours) || 24,
        1, 168 // 1..168ч
      ),
    },
    onlyFirstMessageInThread: !!raw?.onEmployerMessage?.onlyFirstMessageInThread,
  },
  throttle: {
    perChatCount: clamp(Number(raw?.throttle?.perChatCount) || 1, 1, 100),
    perMinutes: clamp(Number(raw?.throttle?.perMinutes) || 60, 1, 10080),
  },
});



const handleUnblockUser = async (id: string, username: string) => {
  if (window.confirm(`Are you sure you want to unblock ${username}?`)) {
    try {
      await unblockUser(id);
      toast.success('User unblocked successfully!');
      await fetchUsers(buildUserSearch(userPage));
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error unblocking user:', axiosError);
      toast.error(axiosError.response?.data?.message || 'Failed to unblock user.');
    }
  }
};

  const handleViewRiskScore = async (id: string) => {
    try {
      console.log(`Fetching risk score for user ID: ${id}`);
      const data = await getUserRiskScore(id);
      console.log('Risk score data:', data);
      setRiskScoreData(data);
      setShowRiskModal(true);
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error fetching risk score:', axiosError);
      alert(axiosError.response?.data?.message || 'Failed to fetch risk score.');
    }
  };

  const handleCheckOnlineStatus = async (id: string) => {
    try {
      const { isOnline } = await getUserOnlineStatus(id);
      setOnlineStatuses((prev) => ({ ...prev, [id]: isOnline }));
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error checking online status:', axiosError);
      alert(axiosError.response?.data?.message || 'Failed to check online status.');
    }
  };

const handleCreateCategory = async (name: string, parentId?: string) => {
  if (!name.trim()) {
    alert('Category name cannot be empty.');
    return;
  }
  try {
    await createCategory({ name, parentId });
    const updatedCategories = await getAdminCategories();
    setCategories(updatedCategories || []);
    setNewMainCategoryName('');
    setNewSubCategoryName('');
    setNewParentCategoryId('');
    toast.success('Category created successfully!');
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error creating category:', axiosError);
    toast.error(axiosError.response?.data?.message || 'Failed to create category.');
  }
};

const handleDeleteCategory = async (id: string) => {
  if (window.confirm('Are you sure you want to delete this category?')) {
    try {
      await deleteCategory(id);
      const updatedCategories = await getAdminCategories();
      setCategories(updatedCategories || []);
      toast.success('Category deleted successfully!');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error deleting category:', axiosError);
      toast.error(axiosError.response?.data?.message || 'Failed to delete category.');
    }
  }
};



const handleDeleteJobPost = async (id: string) => {
  if (!window.confirm('Are you sure you want to delete this job post?')) return;

  try {
    await deleteJobPostAdmin(id);

    // 1) рефетчим текущую страницу
    const curPage = jobPostPage;
    const cur = await getAllJobPosts({ page: curPage, limit: jobPostLimit });

    if (cur?.data?.length && cur.data.length > 0) {
      setJobPosts(cur.data);
    } else if (curPage > 1) {
      // 2) текущая страница опустела — откатываемся на предыдущую
      const prevPage = curPage - 1;
      setJobPostPage(prevPage);
      const prev = await getAllJobPosts({ page: prevPage, limit: jobPostLimit });
      setJobPosts(prev?.data || []);
    } else {
      setJobPosts([]);
    }

    // 3) синхронизируем агрегированную таблицу с апками
    try {
      const updatedWithApps = await getJobPostsWithApplications();
      setJobPostsWithApps(updatedWithApps || []);
    } catch {
      /* тихо игнорим, если не критично */
    }

    toast.success('Job post deleted successfully!');
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error deleting job post:', axiosError);
    toast.error(axiosError.response?.data?.message || 'Failed to delete job post.');
  }
};


const handleApproveJobPost = async (id: string) => {
  try {
    const updatedPost = await approveJobPost(id);
    setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
    setJobPostsWithApps(jobPostsWithApps.map((post) => (post.id === id ? { ...post, status: updatedPost.status, pending_review: updatedPost.pending_review } : post)));
    toast.success('Job post approved successfully!');
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error approving job post:', axiosError);
    toast.error(axiosError.response?.data?.message || 'Failed to approve job post.');
  }
};

const handleFlagJobPost = async (id: string) => {
  try {
    const updatedPost = await flagJobPost(id);
    setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
    setJobPostsWithApps(jobPostsWithApps.map((post) => (post.id === id ? { ...post, status: updatedPost.status, pending_review: updatedPost.pending_review } : post)));
    toast.success('Job post flagged successfully!');
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error flagging job post:', axiosError);
    toast.error(axiosError.response?.data?.message || 'Failed to flag job post.');
  }
};

const openEditJobModal = async (id: string) => {
  try {
    const job = await getJobPost(id);
    const ids =
      (job as any).category_ids ??
      (Array.isArray((job as any).categories) ? (job as any).categories.map((x: any) => String(x.id)) :
      (job as any).category_id ? [String((job as any).category_id)] : []);

    setEditJobModal({
      id,
      data: {
        // формируем state без null'ов
        id: job.id,
        title: job.title,
        description: job.description,
        location: toU((job as any).location),
        job_type: toU((job as any).job_type),
        salary_type: toU((job as any).salary_type),
        salary: toU((job as any).salary),
        category_ids: ids.map(String),
      },
    });
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Failed to load job post.');
  }
};


const saveJobEdit = async () => {
  if (!editJobModal) return;
  const d = editJobModal.data;

  if (!d.title || !d.description) {
    alert('Job title and description are required.');
    return;
  }

  if (d.salary_type !== 'negotiable') {
    const s = typeof d.salary === 'number' ? d.salary : Number(d.salary ?? 0);
    if (!s || s <= 0) {
      alert('Salary is required (>0) unless salary type is negotiable.');
      return;
    }
  }

  try {
    // В payload переводим undefined → null где нужно по API
    const payload: any = {
      title: d.title,
      description: d.description,
      location: d.location ?? null,
      job_type: (d as any).job_type ?? null,
      salary_type: (d as any).salary_type ?? null,
      salary:
        d.salary_type === 'negotiable'
          ? null
          : (typeof d.salary === 'number' ? d.salary : Number(d.salary ?? 0)),
      category_ids: d.category_ids ?? [],
    };

    const updated = await updateJobPostAdmin(editJobModal.id, payload);

    // — аккуратно мерджим, не затирая employer на null
    setJobPosts(prev =>
      prev.map(p =>
        p.id === editJobModal.id
          ? ({ ...p, ...updated } as JobPost)
          : p
      )
    );

    setJobPostsWithApps(prev =>
      prev.map(p =>
        p.id === editJobModal.id
          ? ({
              ...p,
              ...updated,
              employer: (updated as any).employer ?? p.employer,
            } as JobPostWithApplications)
          : p
      )
    );

    toast.success('Job post updated successfully!');
    setEditJobModal(null);
  } catch (e: any) {
    const msg = e?.response?.data?.message || 'Failed to update job post.';
    toast.error(msg);
  }
};


  const handleSetApplicationLimit = async (id: string) => {
    const limit = prompt('Enter application limit:');
    if (limit && !isNaN(Number(limit))) {
      try {
        await setJobPostApplicationLimitAdmin(id, Number(limit));
        const updatedPosts = await getAllJobPosts({ page: jobPostPage, limit: jobPostLimit });
        setJobPosts(updatedPosts.data || []);
        const updatedPostsWithApps = await getJobPostsWithApplications();
        setJobPostsWithApps(updatedPostsWithApps || []);
        toast.success('Application limit set successfully!');
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error('Error setting application limit:', axiosError);
        toast.error(axiosError.response?.data?.message || 'Failed to set application limit.');
      }
    }
  };

  const selectedJob = jobPosts.find(post => post.id === showJobModal);

type HtmlAttrs = Record<string, string | number | boolean>;

const linkTransformer = (_tagName: string, attribs: HtmlAttrs) => ({
  tagName: 'a',
  attribs: { ...attribs, rel: 'noopener noreferrer', target: '_blank' },
});

const safeDescription = sanitizeHtml(selectedJob?.description ?? '', {
  allowedTags: ['p','br','strong','em','u','ul','ol','li','a','blockquote','code','pre','h1','h2','h3','h4','h5','h6','span','img'],
  allowedAttributes: {
    a: ['href','target','rel'],
    img: ['src','alt']
  },
  allowedSchemes: ['http','https','mailto'],
  // Убираем 'style' полностью. Если критично — whitelisting через allowedStyles.
  // allowedStyles: { '*': { color: [/^#?[\da-f]{3,6}$/i] } }
  transformTags: { a: linkTransformer }
});




const handleNotifyCandidates = async (id: string) => {
  
  setNotifyJobPostId(id);
  setNotifyAudience('all');
  setNotifyTitleFilter('');
  setShowNotifyModal(true);
  console.log('State should update to true'); // Добавлено: лог после setState
};

const handleNotifySubmit = async () => {
  if (!notifyJobPostId) {
    alert('No job post selected.');
    return;
  }

  const n = Math.max(1, Number.parseInt(String(notifyLimit), 10) || 0);
  try {
    const base = { limit: n, orderBy: notifyOrderBy as 'beginning' | 'end' | 'random' };
    const res = notifyAudience === 'referral'
      ? await notifyReferralApplicants(notifyJobPostId, {
          ...base,
          titleContains: notifyTitleFilter.trim() || undefined,
        })
      : await notifyCandidates(notifyJobPostId, base);

    toast.success(`Notified ${res.sent} of ${res.total} candidates for job post ${res.jobPostId}`);
    setShowNotifyModal(false);
    setNotifyLimit('10');
    setNotifyOrderBy('beginning');
    setNotifyAudience('all');
    setNotifyTitleFilter('');
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to notify candidates.';
    console.error('Error notifying candidates:', error);
    toast.error(msg);
  }
};



// единый перезагрузчик после действий
const reloadReviewsSamePage = async () => {
  await loadReviews();
  // если страница опустела и мы не на первой — сдвинем назад и перезагрузим
  if (reviews.length === 0 && reviewPage > 1) {
    setReviewPage(p => p - 1);
    // loadReviews сработает из useEffect по изменению page
  }
};

const handleApproveReview = async (id: string) => {
  try {
    await approveReview(id);
    await loadReviews(); // остаёмся на той же page/limit/status
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Failed to approve review.');
  }
};

const handleRejectReview = async (id: string) => {
  try {
    await rejectReview(id);
    await loadReviews();
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Failed to reject review.');
  }
};

const handleDeleteReview = async (id: string) => {
  if (!window.confirm('Are you sure you want to delete this review?')) return;
  try {
    await deleteReview(id);
    await reloadReviewsSamePage();
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Failed to delete review.');
  }
};


useEffect(() => {
  if (!autoRefresh) return;

  let stop = false;
  let slowBusy = false;

  const today = () => format(new Date(), 'yyyy-MM-dd');
  const yesterday = () => format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const weekRange = () => ({
    start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  });
const tzOffset = -new Date().getTimezoneOffset();

const monthRange = () => ({
  start: format(subDays(new Date(), 29), 'yyyy-MM-dd'),  // ← rolling 30d
  end: format(new Date(), 'yyyy-MM-dd'),
});

  // быстрый тик: онлайн, последние регистрации, и TODAY для Business Overview
const fetchFast = async () => {
  try {
    const [online, recents, jsToday, bizToday] = await Promise.all([
      getOnlineUsers(),
      getRecentRegistrationsToday({ limit: 5 }), // ← новая функция с tzOffset внутри
      getGeographicDistribution({ role: 'jobseeker', startDate: today(), endDate: today(), tzOffset }),
      getGeographicDistribution({ role: 'employer',  startDate: today(), endDate: today(), tzOffset }),
    ]);
    if (stop) return;
    setOnlineUsers(online || null);
    setRecentRegistrations(
      (recents as AdminRecentRegistrationsDTO) ?? {
        date: '',
        tzOffset: -new Date().getTimezoneOffset(),
        jobseekers_total: 0,
        employers_total: 0,
        jobseekers: [],
        employers: [],
      }
    );
    setFreelancerSignupsToday(jsToday || []);
    setBusinessSignupsToday(bizToday || []);
  } catch {
    // тихо
  }
};

  // медленный тик: Yesterday / Week / Month для Business Overview
  const fetchSlow = async () => {
    if (slowBusy) return;
    slowBusy = true;
    try {
      const y = yesterday();
      const { start: ws, end: we } = weekRange();
      const { start: ms, end: me } = monthRange();

const [jsY, jsW, jsM, bizY, bizW, bizM] = await Promise.all([
  getGeographicDistribution({ role: 'jobseeker', startDate: y,  endDate: y,  tzOffset }),
  getGeographicDistribution({ role: 'jobseeker', startDate: ws, endDate: we, tzOffset }),
  getGeographicDistribution({ role: 'jobseeker', startDate: ms, endDate: me, tzOffset }),
  getGeographicDistribution({ role: 'employer',  startDate: y,  endDate: y,  tzOffset }),
  getGeographicDistribution({ role: 'employer',  startDate: ws, endDate: we, tzOffset }),
  getGeographicDistribution({ role: 'employer',  startDate: ms, endDate: me, tzOffset }),
]);

      if (stop) return;
      setFreelancerSignupsYesterday(jsY || []);
      setFreelancerSignupsWeek(jsW || []);
      setFreelancerSignupsMonth(jsM || []);
      setBusinessSignupsYesterday(bizY || []);
      setBusinessSignupsWeek(bizW || []);
      setBusinessSignupsMonth(bizM || []);
    } catch { /* тихо игнорим */ }
    finally { slowBusy = false; }
  };

  // стартовые вызовы
  fetchFast();
  fetchSlow();

  const fastId = setInterval(fetchFast, 15000);   // каждые 15 сек
  const slowId = setInterval(fetchSlow, 120000);  // каждые 2 мин

  return () => { stop = true; clearInterval(fastId); clearInterval(slowId); };
}, [autoRefresh]);


const handleViewJobApplications = async (jobPostId: string) => {
  try {
    setError(null);
    setSelectedJobPostId(jobPostId);
    setSelectedJobApplicationId('');
    setChatHistory({ total: 0, data: [] });
    const applications = await getApplicationsForJobPost(jobPostId);
    const acceptedApps = applications.filter(app => app.status === 'Accepted');
    setJobApplications(acceptedApps || []);
    if (acceptedApps.length > 0) {
      handleViewChatHistory(acceptedApps[0].applicationId); // Авто для первого (единственного) Accepted
    } else {
      setError('No accepted applications found for this job post.');
    }
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error fetching job applications:', axiosError);
    setError(axiosError.response?.data?.message || 'Failed to fetch job applications.');
  }
};

const triggerUserSearch = () => {
  const q = buildUserSearch(1, userSearchQuery);
  fetchUsers(q);
  if (userPage !== 1) setUserPage(1);
};



  const handleViewChatHistory = async (jobApplicationId: string, page: number = 1) => {
  try {
    setError(null);
    const history = await getChatHistory(jobApplicationId, { page, limit: 1000 }, currentRole!); // Добавлено: передача currentRole! (non-null)
    setChatHistory(history);
    setSelectedJobApplicationId(jobApplicationId);
    setChatPage(page);
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error fetching chat history:', axiosError);
    setError(axiosError.response?.data?.message || 'Failed to fetch chat history.');
  }
};


const handleSetGlobalLimit = async () => {
  const limit = prompt('Enter global application limit:');
  if (limit && !isNaN(Number(limit)) && Number(limit) >= 0) {
    try {
      const setResponse = await setGlobalApplicationLimit(Number(limit));
      console.log('Set global application limit response:', setResponse); // Логирование ответа
      const limitData = await getGlobalApplicationLimit();
      console.log('Get global application limit response:', limitData); // Логирование ответа
      setGlobalLimit(limitData.globalApplicationLimit ?? null);
      toast.success(`Global application limit set to ${limitData.globalApplicationLimit ?? 'Not set'} successfully!`);
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error setting global limit:', axiosError.response?.data?.message || axiosError.message);
      setFetchErrors((prev) => ({
        ...prev,
        getGlobalApplicationLimit: axiosError.response?.data?.message || 'Failed to set or retrieve global limit.',
      }));
      toast.error(axiosError.response?.data?.message || 'Failed to set global limit.');
    }
  } else {
    alert('Please enter a valid non-negative number.');
  }
};

  const handleAddBlockedCountry = async () => {
    if (!newCountryCode.trim()) {
      alert('Please enter a country code.');
      return;
    }
    try {
      console.log(`Adding blocked country: ${newCountryCode}`);
      const newCountry = await addBlockedCountry(newCountryCode.trim());
      console.log('New blocked country:', newCountry);
      setBlockedCountries([...blockedCountries, newCountry]);
      setNewCountryCode('');
      toast.success('Country blocked successfully!');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error adding blocked country:', axiosError);
      toast.error(axiosError.response?.data?.message || 'Failed to block country.');
    }
  };

  const handleRemoveBlockedCountry = async (countryCode: string) => {
    if (window.confirm(`Are you sure you want to unblock ${countryCode}?`)) {
      try {
        await removeBlockedCountry(countryCode);
        const updatedCountries = await getBlockedCountries();
        setBlockedCountries(updatedCountries || []);
        toast.success('Country unblocked successfully!');
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error('Error removing blocked country:', axiosError);
        toast.error(axiosError.response?.data?.message || 'Failed to unblock country.');
      }
    }
  };

useEffect(() => {
  if (activeTab !== 'Complaints') return;
  (async () => {
    try {
    const updatedComplaints = await getComplaints<Complaint>();
setComplaints(updatedComplaints || []);
    } catch {/* ignore */}
  })();
}, [activeTab]);

const todayRegs = recentRegistrations.jobseekers || [];
const todayBiz  = recentRegistrations.employers || [];

if (isLoading) {
  return (
    <div>
      <div className="backoffice-header">
        <div className="backoffice-title" onClick={handleBackofficeClick}>BACK<span className='backoffice_span'>OFFICE</span></div>
        <div className="header-right">
          <span className="greeting">Welcome, <span className="username-bold">{username}</span></span> 
          <Link to="/" className="nav-link"><FaHome /> Home</Link>
<button type="button" className="action-button-admin" onClick={handleLogout}>
  <FaSignOutAlt aria-hidden="true" /> Logout
</button>


          <div className="user-count employers"><FaUser /> {onlineUsers?.employers ?? 'N/A'}</div>
<div className="user-count freelancers"><FaUser /> {onlineUsers?.jobseekers ?? 'N/A'}</div>
          <div className="date-time">
           <span>{formatInTimeZone(currentTime, 'Asia/Manila', 'MMM dd')}</span>  {formatInTimeZone(currentTime, 'Asia/Manila', 'HH:mm')}
          </div>
        </div>
      </div>
      <div className="dashboard-wrapper">
        <div className="sidebar">
          
        </div>
        <div className="main-content">
          <div className="content">
            <h2>Admin Dashboard</h2>
            <Loader />
          </div>
        </div>
      </div>
    </div>
  );
}

  if (!currentRole || currentRole !== 'admin') {
  return (
    <div>
      <div className="backoffice-header">
        <div className="backoffice-title" onClick={handleBackofficeClick}>BACK <span>OFFICE</span> </div>
        <div className="header-right">
          <span className="greeting">Welcome, <span className="username-bold">{username}</span></span>
          <Link to="/" className="nav-link"><FaHome /> Home</Link>
          <button type="button" className="action-button-admin" onClick={handleLogout}>
  <FaSignOutAlt aria-hidden="true" /> Logout
</button>

          <div className="user-count employers"><FaUser /> {onlineUsers?.employers ?? 'N/A'}</div>
<div className="user-count freelancers"><FaUser /> {onlineUsers?.jobseekers ?? 'N/A'}</div>
          <div className="date-time">
           <span>{formatInTimeZone(currentTime, 'Asia/Manila', 'MMM dd')}</span>  {formatInTimeZone(currentTime, 'Asia/Manila', 'HH:mm')}
          </div>
        </div>
      </div>
      <div className="dashboard-wrapper">
        <div className="sidebar">
          
        </div>
        <div className="main-content">
          <div className="content">
            <h2>Admin Dashboard</h2>
            <p>This page is only available for admins.</p>
          </div>
          <Footer />
          <Copyright />
        </div>
      </div>
    </div>
  );
}

  return (
  <div>
    <div className="backoffice-header">
      <div className="backoffice-title" onClick={handleBackofficeClick}>BACK<span>OFFICE</span></div>
      <div className="header-right">
        <span className="greeting">Welcome, <span className="username-bold">{username}</span></span>
        <Link to="/" className="nav-link"><FaHome /> Home</Link>
        <button type="button" className="action-button-admin" onClick={handleLogout}>
  <FaSignOutAlt aria-hidden="true" /> Logout
</button>

      <div className="user-count employers"><FaUser /> {onlineUsers?.employers ?? 'N/A'}</div>
<div className="user-count freelancers"><FaUser /> {onlineUsers?.jobseekers ?? 'N/A'}</div>
        <div className="date-time">
          <span>{formatInTimeZone(currentTime, 'Asia/Manila', 'MMM dd')}</span> {formatInTimeZone(currentTime, 'Asia/Manila', 'HH:mm')}
        </div>
      </div>
    </div>
    <div className="dashboard-wrapper">
      <div className="sidebar">
        
        <ul>
          <li className={activeTab === 'Dashboard' ? 'active' : ''} onClick={() => setActiveTab('Dashboard')}>
            Dashboard
          </li>
          <li className={activeTab === 'Users' ? 'active' : ''} onClick={() => setActiveTab('Users')}>
            Users
          </li>
          <li className={activeTab === 'Job Posts' ? 'active' : ''} onClick={() => setActiveTab('Job Posts')}>
            Job Posts
          </li>
          <li className={activeTab === 'Reviews' ? 'active' : ''} onClick={() => setActiveTab('Reviews')}>
            Reviews
          </li>
          <li className={activeTab === 'Feedback' ? 'active' : ''} onClick={() => setActiveTab('Feedback')}>
            Feedback
          </li>
          <li className={activeTab === 'Categories' ? 'active' : ''} onClick={() => setActiveTab('Categories')}>
            Categories
          </li>
          <li className={activeTab === 'Blocked Countries' ? 'active' : ''} onClick={() => setActiveTab('Blocked Countries')}>
            Blocked Countries
          </li>
          <li className={activeTab === 'Complaints' ? 'active' : ''} onClick={() => setActiveTab('Complaints')}>
            Complaints
          </li>
          <li className={activeTab === 'Chat History' ? 'active' : ''} onClick={() => setActiveTab('Chat History')}>
            Chat History
          </li>
          <li className={activeTab === 'Analytics' ? 'active' : ''} onClick={() => setActiveTab('Analytics')}>
            Analytics
          </li>
          <li className={activeTab === 'Email Notifications' ? 'active' : ''} onClick={() => setActiveTab('Email Notifications')}>
  Email Notifications
</li>
<li className={activeTab === 'Referral Links' ? 'active' : ''} onClick={() => setActiveTab('Referral Links')}> 
  Referral Links
</li>
          <li className={activeTab === 'Settings' ? 'active' : ''} onClick={() => setActiveTab('Settings')}>
            Settings
          </li>
        </ul>
      </div>
      <div className="main-content">
        <div className="content">
          

          {activeTab === 'Dashboard' && (
            <div>
 
              <h4>Dashboard</h4>
              <div className="dashboard-section">
  <div className="table-header">
    <h3>Business Overview</h3>
    <button
  className={`action-button ${autoRefresh ? 'success' : ''}`}
  onClick={() => setAutoRefresh(v => !v)}
>
  {autoRefresh ? 'Auto-refresh: ON' : 'Auto-refresh: OFF'}
</button>

       {/* <button className="action-button refresh-button" onClick={handleRefresh}>refresh</button> */}
  </div>
  <table className="dashboard-table">
    <thead>
      <tr>
        <th>Metric</th>
        <th>Today</th>
        <th>Yesterday</th>
        <th>Week (Mon-Sun)</th>
        <th>Last 30 days</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Freelancer Signups by Country</td>
        <td>{freelancerSignupsToday.length > 0 ? freelancerSignupsToday.map(item => `${item.country}: ${item.count}`).join(', ') : 'None registered'}</td>
        <td>{freelancerSignupsYesterday.length > 0 ? freelancerSignupsYesterday.map(item => `${item.country}: ${item.count}`).join(', ') : 'None registered'}</td>
        <td>{freelancerSignupsWeek.length > 0 ? freelancerSignupsWeek.map(item => `${item.country} ${item.count}`).join(' | ') : 'None registered'}</td>
        <td>{freelancerSignupsMonth.length > 0 ? freelancerSignupsMonth.map(item => `${item.country} ${item.count}`).join(' | ') : 'None registered'}</td>
      </tr>
      <tr>
        <td>Business Signups by Country</td>
        <td>{businessSignupsToday.length > 0 ? businessSignupsToday.map(item => `${item.country} ${item.count}`).join(' | ') : 'None registered'}</td>
        <td>{businessSignupsYesterday.length > 0 ? businessSignupsYesterday.map(item => `${item.country} ${item.count}`).join(' | ') : 'None registered'}</td>
        <td>{businessSignupsWeek.length > 0 ? businessSignupsWeek.map(item => `${item.country} ${item.count}`).join(' | ') : 'None registered'}</td>
        <td>{businessSignupsMonth.length > 0 ? businessSignupsMonth.map(item => `${item.country} ${item.count}`).join(' | ') : 'None registered'}</td>
      </tr>
      <tr>
        <td>New Business Subscriptions</td>
        <td>{businessSignupsToday.length > 0 ? businessSignupsToday.map(item => `${item.country} ${Math.round(item.count * 0.1)}`).join(' | ') : 'None registered'}</td>
        <td>{businessSignupsYesterday.length > 0 ? businessSignupsYesterday.map(item => `${item.country} ${Math.round(item.count * 0.1)}`).join(' | ') : 'None registered'}</td>
        <td>{businessSignupsWeek.length > 0 ? businessSignupsWeek.map(item => `${item.country} ${Math.round(item.count * 0.1)}`).join(' | ') : 'None registered'}</td>
        <td>{businessSignupsMonth.length > 0 ? businessSignupsMonth.map(item => `${item.country} ${Math.round(item.count * 0.1)}`).join(' | ') : 'None registered'}</td>
      </tr>
      <tr>
        <td>New Business Subscription by Country</td>
        <td>{businessSignupsToday.length > 0 ? businessSignupsToday.map(item => `${item.country} $${Math.round(item.count * 90)}`).join(' | ') : 'None registered'}</td>
        <td>{businessSignupsYesterday.length > 0 ? businessSignupsYesterday.map(item => `${item.country} $${Math.round(item.count * 90)}`).join(' | ') : 'None registered'}</td>
        <td>{businessSignupsWeek.length > 0 ? businessSignupsWeek.map(item => `${item.country} $${Math.round(item.count * 90)}`).join(' | ') : 'None registered'}</td>
        <td>{businessSignupsMonth.length > 0 ? businessSignupsMonth.map(item => `${item.country} $${Math.round(item.count * 90)}`).join(' | ') : 'None registered'}</td>
      </tr>
      <tr>
        <td>Business Resubscriptions</td>
        <td>{businessSignupsToday.length > 0 ? businessSignupsToday.map(item => `${item.country} ${Math.round(item.count * 0.1)}`).join(' | ') : 'None registered'}</td>
        <td>{businessSignupsYesterday.length > 0 ? businessSignupsYesterday.map(item => `${item.country} ${Math.round(item.count * 0.1)}`).join(' | ') : 'None registered'}</td>
        <td>{businessSignupsWeek.length > 0 ? businessSignupsWeek.map(item => `${item.country} ${Math.round(item.count * 0.1)}`).join(' | ') : 'None registered'}</td>
        <td>{businessSignupsMonth.length > 0 ? businessSignupsMonth.map(item => `${item.country} ${Math.round(item.count * 0.1)}`).join(' | ') : 'None registered'}</td>
      </tr>
      <tr>
        <td>Business Resubscription by Country</td>
        <td>{businessSignupsToday.length > 0 ? businessSignupsToday.map(item => `${item.country} $${Math.round(item.count * 90)}`).join(' | ') : 'None registered'}</td>
        <td>{businessSignupsYesterday.length > 0 ? businessSignupsYesterday.map(item => `${item.country} $${Math.round(item.count * 90)}`).join(' | ') : 'None registered'}</td>
        <td>{businessSignupsWeek.length > 0 ? businessSignupsWeek.map(item => `${item.country} $${Math.round(item.count * 90)}`).join(' | ') : 'None registered'}</td>
        <td>{businessSignupsMonth.length > 0 ? businessSignupsMonth.map(item => `${item.country} $${Math.round(item.count * 90)}`).join(' | ') : 'None registered'}</td>
      </tr>
    </tbody>
  </table>
</div>
              <div className="dashboard-section">
                <h3>Online Users</h3>
                <p><strong>Freelancers Online:</strong> {onlineUsers?.jobseekers ?? 'N/A'}</p>
                <p><strong>Businesses Online:</strong> {onlineUsers?.employers ?? 'N/A'}</p>
              </div>
          <div className="dashboard-section">
  <h3>Recent Registrations</h3>
  <details>
    <summary>
      Freelancer Registrations Today — Total: {recentRegistrations.jobseekers_total ?? todayRegs.length}
    </summary>
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>Username</th>
          <th>Email</th>
          {/* новые 3 колонки после Email */}
          <th>Referral Link Description</th>
          <th>Referral from signup</th>
          <th>Job</th>
          {/* прежняя дата сдвигается вправо */}
          <th>Created At</th>
        </tr>
      </thead>
      <tbody>
        {todayRegs.length === 0 ? (
          <tr><td colSpan={6}>No recent freelancer registrations today.</td></tr>
        ) : (
          todayRegs.map(u => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.email}</td>
             <td>{u.referral_link_description ?? '—'}</td>
<td>{u.referral_from_signup ?? '—'}</td>
<td>
  {u.referral_job
    ? <a className="action-button-view-a"
         href={`/job/${u.referral_job.id}`}
         target="_blank" rel="noopener noreferrer">
        {u.referral_job.title}
      </a>
    : '—'}
</td>

              <td>{format(new Date(u.created_at), 'PP')}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </details>

<details>
  <summary>
    Business Registrations Today — Total: {recentRegistrations.employers_total ?? todayBiz.length}
  </summary>
  <table className="dashboard-table">
    <thead>
      <tr>
        <th>Username</th>
        <th>Email</th>
        {/* новые 3 колонки после Email */}
        <th>Referral Link Description</th>
        <th>Referral from signup</th>
        <th>Job</th>
        {/* прежняя дата сдвигается вправо */}
        <th>Created At</th>
      </tr>
    </thead>
    <tbody>
      {todayBiz.length === 0 ? (
        <tr><td colSpan={6}>No recent business registrations today.</td></tr>
      ) : (
        todayBiz.map(u => (
          <tr key={u.id}>
            <td>{u.username}</td>
            <td>{u.email}</td>
           <td>{u.referral_link_description ?? '—'}</td>
<td>{u.referral_from_signup ?? '—'}</td>
<td>
  {u.referral_job
    ? <a className="action-button-view-a"
         href={`/job/${u.referral_job.id}`}
         target="_blank" rel="noopener noreferrer">
        {u.referral_job.title}
      </a>
    : '—'}
</td>

            <td>{format(new Date(u.created_at), 'PP')}</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</details>

</div>
<div className="dashboard-section">
  <h3>Job Postings with Applications</h3>
  <table className="dashboard-table">
<thead>
  <tr>
    <th>Username</th>
    <th>Title</th>
    <th>Category</th>
    <th onClick={() => handleSort('applicationCount')} style={{ cursor: 'pointer' }}>
      Applications {sortColumn === 'applicationCount' ? (sortDirection === 'asc' ? <FaArrowUp /> : <FaArrowDown />) : <FaArrowUp />}
    </th>
    <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
      Created At {sortColumn === 'created_at' ? (sortDirection === 'asc' ? <FaArrowUp /> : <FaArrowDown />) : <FaArrowUp />}
    </th>
  </tr>
</thead>
<tbody>
  {paginatedJobPostsWithApps.length > 0 ? paginatedJobPostsWithApps.map((post) => (
    <tr key={post.id}>
      <td>{post.username || 'N/A'}</td>
      <td>{post.title}</td>
      <td>
        {Array.isArray(post.categories) && post.categories.length > 0 ? (
          <div className="adm-cats">
            <span>{post.categories[0]}</span>
            {post.categories.slice(1).map((name, idx) => (
              <span key={idx} className="adm-cat-sub">{name}</span>
            ))}
          </div>
        ) : (typeof post.category === 'string' ? post.category : post.category?.name || 'N/A')}
      </td>
      <td>{post.applicationCount}</td>
      <td>{format(new Date(post.created_at), 'PP')}</td>
    </tr>
  )) : (
    <tr>
      <td colSpan={5}>No job postings with applications found.</td>
    </tr>
  )}
</tbody>


  </table>
  <div className="pagination">
    <button
      onClick={() => setJobPostsWithAppsPage(prev => Math.max(prev - 1, 1))}
      disabled={jobPostsWithAppsPage === 1}
      className="action-button"
    >
      Previous
    </button>
    <span className="page-number">Page {jobPostsWithAppsPage}</span>
    <button
      onClick={() => setJobPostsWithAppsPage(prev => prev + 1)}
      disabled={paginatedJobPostsWithApps.length < jobPostsWithAppsLimit}
      className="action-button"
    >
      Next
    </button>
  </div>

 
</div>
</div>
          
          )}

{activeTab === 'Users' && (
  <div>
  <h4>Users</h4>
   <div className="users-toolbar">
      <ExportUsersPopover
        buttonLabel="Export to CSV"
        buttonClassName="action-button"  // используем твой текущий стиль кнопки
      />
    </div>
  {fetchErrors.getAllUsers && <p className="error-message">{fetchErrors.getAllUsers}</p>}
  
  {/* Добавлено: search bar */}
<div className="search_users" style={{ marginBottom: '10px' }}>
<input
  type="text"
  placeholder="Search by username, email or ID"
  value={userSearchQuery}
  onChange={(e) => setUserSearchQuery(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = buildUserSearch(1, userSearchQuery);
      fetchUsers(q);
      if (userPage !== 1) setUserPage(1);
    }
  }}
/>
<button
  type="button"
  onClick={() => {
    const q = buildUserSearch(1, userSearchQuery);
    fetchUsers(q);
    if (userPage !== 1) setUserPage(1);
  }}
  className="action-button"
  disabled={isUsersLoading}
  aria-label="Search users"
>
  <FaSearch />
</button>
</div>

  
  
   <table className="dashboard-table">
  <thead>
    <tr>
      {/* <th onClick={() => handleUserSort('id')} style={{ cursor: 'pointer' }}>
        ID {userSortColumn === 'id' ? (userSortDirection === 'asc' ? <FaArrowUp /> : <FaArrowDown />) : <FaArrowUp />}
      </th> */}
      <th>Username</th>
      <th>Email</th>
      <th onClick={() => handleUserSort('brand')} style={{ cursor: 'pointer' }}>
  Brand {userSortColumn === 'brand' ? (userSortDirection === 'asc' ? <FaArrowUp /> : <FaArrowDown />) : <FaArrowUp />}
</th>
      <th onClick={() => handleUserSort('role')} style={{ cursor: 'pointer' }}>
        Role {userSortColumn === 'role' ? (userSortDirection === 'asc' ? <FaArrowUp /> : <FaArrowDown />) : <FaArrowUp />}
      </th>
      <th onClick={() => handleUserSort('is_blocked')} style={{ cursor: 'pointer' }}>
        Blocked Status {userSortColumn === 'is_blocked' ? (userSortDirection === 'asc' ? <FaArrowUp /> : <FaArrowDown />) : <FaArrowUp />}
      </th>
      <th>Online Status</th>
      <th>Last online</th>
      <th>Date joined</th>
      <th>Risk Score</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
  {usersToRender.length > 0 ? usersToRender.map((user) => (
    <tr key={user.id}>
      {/* <td>{user.id}</td> */}
      <td>{user.username}</td>
      <td>{user.email}</td>
      <td>{getBrand(user)}</td>
      <td>{user.role}</td>
      <td>{user.status === 'blocked' ? 'Blocked' : 'Active'}</td>
      <td>{onlineStatuses[user.id] ? 'Online' : 'Offline'}</td>
      <td>{renderDateCell(user.last_seen_at)}</td>
      <td>{renderDateCell(user.created_at)}</td>
      <td>
        <button onClick={() => handleViewRiskScore(user.id)} className="action-button">View Risk</button>
      </td>
        <td>
  {user.role !== 'admin' && (
    <a
      href={`/public-profile/${user.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="action-button-view-a"
    >
      View Profile
    </a>
  )}
          <button onClick={() => handleDeleteUser(user.id)} className="action-button danger">
            Delete
          </button>
          <button onClick={() => handleResetPassword(user.id)} className="action-button">
            Reset Password
          </button>
          {user.identity_document && !user.identity_verified && (
            <>
              <button onClick={() => handleVerifyIdentity(user.id, true)} className="action-button success">
                Verify Identity
              </button>
              <button onClick={() => handleVerifyIdentity(user.id, false)} className="action-button warning">
                Reject Identity
              </button>
            </>
          )}
          {user.status === 'blocked' ? (
            <button
              onClick={() => handleUnblockUser(user.id, user.username)}
              className="action-button success"
            >
              Unblock
            </button>
          ) : (
            <button
              onClick={() => handleBlockUser(user.id, user.username)}
              className="action-button danger"
            >
              Block
            </button>
          )}
        </td>
      </tr>
    )) : (
      <tr>
        <td colSpan={10}>No users found.</td>
      </tr>
    )}
  </tbody>
</table>
<div className="pagination">
  <button
    onClick={() => setUserPage(prev => Math.max(prev - 1, 1))}
    disabled={userPage === 1}
    className="action-button"
  >
    Previous
  </button>
  <span className="page-number">Page {userPage}</span>
  <button
    onClick={() => setUserPage(prev => prev + 1)}
    disabled={(userPage * userLimit) >= userTotal}
    className="action-button"
  >
    Next
  </button>
</div>
    {showRiskModal && riskScoreData && (
  <div className="modal">
    <div className="modal-content">
      <h3>Risk Score for User ID: {riskScoreData.userId}</h3>
      <p><strong>Risk Score:</strong> {riskScoreData.riskScore}</p>
      <p><strong>Duplicate IP:</strong> {riskScoreData.details.duplicateIp ? 'Yes' : 'No'}</p>
      <p><strong>Proxy Detected:</strong> {riskScoreData.details.proxyDetected ? 'Yes' : 'No'}</p>
      <p><strong>Duplicate Fingerprint:</strong> {riskScoreData.details.duplicateFingerprint ? 'Yes' : 'No'}</p>
      <button onClick={() => setShowRiskModal(false)} className="action-button">
        Close
      </button>
    </div>
  </div>
)}
  </div>
)}

 {activeTab === 'Job Posts' && (
  <div>
    <h4>Job Posts</h4>
    <div className="search_users" style={{ marginBottom: '10px' }}>
      <input
  type="text"
  placeholder="Search by title, employer username or ID"
  value={jobPostSearchQuery}
  onChange={(e) => setJobPostSearchQuery(e.target.value)}
/>
<button
  onClick={() => {
    const q = jobPostSearchQuery.trim();
    if (!q) return;
    const params: any = { page: 1, limit: jobPostLimit };
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q);
    if (isUuid) params.id = q;
    else if (q.startsWith('@')) params.employer_username = q.slice(1);
    else params.title = q;
    fetchJobPosts(params);
    setJobPostPage(1);
  }}
  className="action-button"
>
  <FaSearch />
</button>


    </div>
    <div className="form-group">
      <label>Filter by Status:</label>
      <select
        value={jobStatusFilter}
        onChange={(e) => {
          setJobStatusFilter(e.target.value as 'All' | 'Active' | 'Draft' | 'Closed');
          setJobPostPage(1);
        }}
        className="status-filter"
      >
        <option value="All">All</option>
        <option value="Active">Active</option>
        <option value="Draft">Draft</option>
        <option value="Closed">Closed</option>
      </select>
    </div>
    <div className="form-group">
      <label>Filter by Pending Review:</label>
      <select
        value={pendingReviewFilter}
        onChange={(e) => {
          setPendingReviewFilter(e.target.value as 'All' | 'true' | 'false');
          setJobPostPage(1);
        }}
        className="status-filter"
      >
        <option value="All">All</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>
    {fetchErrors.getPendingJobPosts && <p className="error-message">{fetchErrors.getPendingJobPosts}</p>}
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Employer</th>
          <th>Status</th>
          <th className="col--pending">Pending Review</th>
          <th>Created At</th>
          <th>Actions</th>
          <th>Notifications</th>
        </tr>
      </thead>
      <tbody>
        {jobPosts.length > 0 ? jobPosts
          .filter(post => jobStatusFilter === 'All' || post.status === jobStatusFilter)
          .filter(post => pendingReviewFilter === 'All' || (pendingReviewFilter === 'true' ? post.pending_review : !post.pending_review))
          .map((post) => (
            <tr key={post.id}>
              <td>{post.title}</td>
              <td>{post.employer?.username || 'N/A'}</td>
              <td>{post.status}</td>
              <td className="col--pending">{post.pending_review ? 'Yes' : 'No'}</td>
              <td>{format(new Date(post.created_at), 'PP')}</td>
<td>
  <button onClick={() => handleDeleteJobPost(post.id)} className="action-button danger">Delete</button>
  {post.pending_review && (
    <button onClick={() => handleApproveJobPost(post.id)} className="action-button success">Approve</button>
  )}
  <button onClick={() => handleFlagJobPost(post.id)} className="action-button warning">Flag</button>
  <button onClick={() => openRejectModal(post.id, post.title)} className="action-button danger">Reject</button>
  <button onClick={() => setShowJobModal(post.id)} className="action-button">View Job</button>
  <button
    onClick={() => window.open(`/job/${(post as any).slug_id || post.id}`, '_blank')}
    className="action-button"
  >
    View LP
  </button>
  <button onClick={() => handleReferralForPost(post.id)} className="action-button generate-ref">
    Generate Referral
  </button>
  <button
    onClick={() => openEditJobModal(post.id)}
    className="action-button"
    title="Edit this job post"
  >
    Edit
  </button>
</td>
<td>
  <span title={`Sent: ${notificationStats[post.id]?.sent || 0} Opened: ${notificationStats[post.id]?.opened || 0} Clicked: ${notificationStats[post.id]?.clicked || 0}`}>
    s:{notificationStats[post.id]?.sent || 0} o:{notificationStats[post.id]?.opened || 0} c:{notificationStats[post.id]?.clicked || 0}
  </span>
  <button onClick={() => handleNotifyCandidates(post.id)} className="action-button success">Notify Seekers</button>
  <button onClick={() => openEmailStats(post.id)} className="action-button">View Details</button>
</td>

            </tr>
          )) : (
            <tr>
              <td colSpan={7}>No job posts found.</td>
            </tr>
          )}
      </tbody>
    </table>
    <div className="pagination">
      <button
        onClick={() => setJobPostPage(prev => Math.max(prev - 1, 1))}
        disabled={jobPostPage === 1}
        className="action-button"
      >
        Previous
      </button>
      <span className="page-number">Page {jobPostPage}</span>
      <button
        onClick={() => setJobPostPage(prev => prev + 1)}
        disabled={jobPosts.length < jobPostLimit}
        className="action-button"
      >
        Next
      </button>
    </div>

  {showNotifyModal && (
  <div className="modal_notify">
    <div className="modal-content">
       <h3>Notify Candidates for Job Post: {notifyJob?.title || notifyJobPostId}</h3>
        <fieldset className="form-group">
  <legend>Audience</legend>
  <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', marginRight: 16 }}>
    <input
      type="radio"
      value="all"
      checked={notifyAudience === 'all'}
      onChange={() => setNotifyAudience('all')}
    />
    All Applicants (current behavior)
  </label>

  <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
    <input
      type="radio"
      value="referral"
      checked={notifyAudience === 'referral'}
      onChange={() => setNotifyAudience('referral')}
    />
    Users who registered via referral links (same category)
  </label>
</fieldset>

{/* Insert right below the Audience fieldset */}
{notifyAudience === 'referral' && (
  <div className="form-group">
    <label>Filter by job title (optional):</label>
    <input
      type="text"
      value={notifyTitleFilter}
      onChange={(e) => setNotifyTitleFilter(e.target.value)}
      placeholder="e.g., writer"
      inputMode="search"
      autoComplete="off"
    />
    <small className="hint">
      Applied only when audience is "referral" within the same category.
    </small>
  </div>
)}

        <div className="form-group">

          <label>Number of candidates to notify:</label>
          <input
            type="number"
            value={notifyLimit}
            onChange={(e) => setNotifyLimit(e.target.value)}
            placeholder="e.g., 10"
            min="1"
          />
        </div>
        <div className="form-group">
          <label>Order:</label>
          <select
            value={notifyOrderBy}
            onChange={(e) => setNotifyOrderBy(e.target.value as 'beginning' | 'end' | 'random')}
          >
            <option value="beginning">First Applied</option>
            <option value="end">Last Applied</option>
            <option value="random">Random</option>
          </select>
        </div>
        <div className="modal-actions">
          <button onClick={handleNotifySubmit} className="action-button success">
            Send Notifications
          </button>
          <button
            onClick={() => {
              setShowNotifyModal(false);
              setNotifyLimit('10');
              setNotifyOrderBy('beginning');
              setNotifyAudience('all');
              setNotifyTitleFilter('');
            }}
            className="action-button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )}

  </div>
)}

      {activeTab === 'Reviews' && (
  <div>
    <h4>Reviews</h4>

    {/* Фильтр статуса: три таба + "All" */}
    <div className="tabs" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      {(['All','Pending','Approved','Rejected'] as const).map(s => (
        <button
          key={s}
          className={`action-button ${reviewStatus === s ? 'success' : ''}`}
          onClick={() => { setReviewStatus(s); setReviewPage(1); }}
        >
          {s}
        </button>
      ))}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <label>Per page:</label>
        <select
          value={reviewLimit}
          onChange={(e) => { setReviewLimit(parseInt(e.target.value, 10)); setReviewPage(1); }}
        >
          {[10,20,30,50,100].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    </div>

    <table className="dashboard-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Rating</th>
          <th>Comment</th>
          <th>Status</th>
          <th>Reviewer</th>
          <th>Target</th>
          <th>Related Job</th>
          <th>Created At</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {reviews.length > 0 ? reviews.map((r) => (
          <tr key={r.id}>
            <td>{r.id}</td>
            <td>{r.rating}</td>
            <td>{r.comment}</td>
            <td>{(r as any).status}</td>
            <td>{r.reviewer?.username || 'Anonymous'}</td>
            <td>{r.reviewed?.username || 'N/A'}</td>
            <td>{(r as any).job_application?.job_post?.title || 'N/A'}</td>
            <td>{format(new Date(r.created_at), 'PP')}</td>
<td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
  {(r as any).status === 'Pending' && (
    <>
      <button onClick={() => handleApproveReview(r.id)} className="action-button success">Approve</button>
      <button onClick={() => handleRejectReview(r.id)} className="action-button warning">Reject</button>
    </>
  )}
  <button onClick={() => handleDeleteReview(r.id)} className="action-button danger">Delete</button>
</td>

          </tr>
        )) : (
          <tr><td colSpan={9}>No reviews found.</td></tr>
        )}
      </tbody>
    </table>

    {/* Пагинация */}
    <div className="pagination" style={{ marginTop: 12 }}>
      <button
        onClick={() => setReviewPage(p => Math.max(1, p - 1))}
        disabled={reviewPage === 1}
        className="action-button"
      >
        Previous
      </button>
      <span className="page-number">Page {reviewPage} of {reviewTotalPages}</span>
      <button
        onClick={() => setReviewPage(p => Math.min(reviewTotalPages, p + 1))}
        disabled={reviewPage >= reviewTotalPages}
        className="action-button"
      >
        Next
      </button>
    </div>
  </div>
)}


    {activeTab === 'Feedback' && (
  <div>
    <h4>Feedback</h4>

    {/* subtabs */}
    <div className="tabs" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
  <button className={`action-button ${fbSubtab === 'tech' ? 'success' : ''}`} onClick={() => setFbSubtab('tech')}>Tech Feedback</button>
  <button className={`action-button ${fbSubtab === 'platform' ? 'success' : ''}`} onClick={() => setFbSubtab('platform')}>Platform Feedback (Stories)</button>

  <span style={{marginLeft:12, padding:'6px 10px', borderRadius:8, background:'#eef', fontWeight:600}}>
    Viewing: {fbSubtab === 'tech' ? 'Tech Feedback' : 'Platform Feedback'}
  </span>

      {/* per-page selector for current subtab */}
     <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
    <label>Per page:</label>
    {fbSubtab === 'tech' ? (
      <select value={tfLimit} onChange={(e) => { setTfLimit(parseInt(e.target.value, 10)); setTfPage(1); }}>
        {[10,20,30,40,50,100].map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    ) : (
      <select value={pfLimit} onChange={(e) => { setPfLimit(parseInt(e.target.value, 10)); setPfPage(1); }}>
        {[10,20,30,40,50,100].map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    )}
  </div>
</div>

    {/* TECH FEEDBACK TABLE */}
    {fbSubtab === 'tech' && (
      <>
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>User</th>
              <th>Role</th>
              <th>Category</th>
              <th>Summary</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!techLoading && techFeedback.length === 0 && (
              <tr><td colSpan={6}>No feedback found.</td></tr>
            )}

            {techLoading && (
              <tr><td colSpan={6}>Loading…</td></tr>
            )}

            {!techLoading && techFeedback.map((fb) => (
              <tr key={fb.id}>
                <td>{format(new Date(fb.created_at), 'PP')}</td>
                <td>
                  <div>{fb.user?.username || 'Unknown'}</div>
                  <div style={{opacity:.8, fontSize:12}}>{fb.user?.email}</div>
                </td>
                <td>{fb.role || '—'}</td>
                <td>{fb.category || '—'}</td>
                <td title={fb.summary} style={{maxWidth: 360, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                  {fb.summary}
                </td>
                <td>
                  <button onClick={() => setTechDetails(fb)} className="action-button">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* pagination */}
        <div className="pagination" style={{ marginTop: 12 }}>
          <button
            onClick={() => setTfPage(p => Math.max(1, p - 1))}
            disabled={tfPage === 1}
            className="action-button"
          >
            Previous
          </button>
          <span className="page-number">Page {tfPage} of {tfTotalPages}</span>
          <button
            onClick={() => setTfPage(p => Math.min(tfTotalPages, p + 1))}
            disabled={tfPage >= tfTotalPages}
            className="action-button"
          >
            Next
          </button>         
        </div>

        {/* Tech details modal */}
        {techDetails && (
          <div className="modal" onClick={() => setTechDetails(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <span className="close" onClick={() => setTechDetails(null)}>×</span>
              <h3>Feedback Details</h3>

              <p><strong>Date:</strong> {format(new Date(techDetails.created_at), 'PPpp')}</p>
              <p><strong>User:</strong> {techDetails.user?.username} ({techDetails.user?.email})</p>
              <p><strong>Role:</strong> {techDetails.role}</p>
              <p><strong>Category:</strong> {techDetails.category || '—'}</p>
              <p><strong>Summary:</strong> {techDetails.summary}</p>
              <hr />
              <p><strong>Steps:</strong><br />{techDetails.steps_to_reproduce || '—'}</p>
              <p><strong>Expected:</strong><br />{techDetails.expected_result || '—'}</p>
              <p><strong>Actual:</strong><br />{techDetails.actual_result || '—'}</p>

              <div className="modal-actions">
                <button className="action-button" onClick={() => setTechDetails(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </>
    )}

    {/* PLATFORM FEEDBACK TABLE (Stories) */}
    {fbSubtab === 'platform' && (
      <>
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Headline</th>
              <th>Rating</th>
              <th>Consent</th>
              <th>Public</th>
              <th>Company</th>
              <th>Country</th>
              <th>User</th>
              <th onClick={() => handleStoriesSort('created_at')} style={{ cursor: 'pointer' }}>
                Created At {storiesSortColumn === 'created_at' ? (storiesSortDirection === 'asc' ? <FaArrowUp /> : <FaArrowDown />) : <FaArrowUp />}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedStories.length > 0 ? sortedStories.map((story) => (
              <tr key={story.id}>
                <td title={story.story} style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {story.headline}
                </td>
                <td>{story.rating}</td>
                <td>{story.allowed_to_publish ? 'Yes' : 'No'}</td>
                <td>{story.is_public ? 'Yes' : 'No'}</td>
                <td>{story.company || '—'}</td>
                <td>{story.country || '—'}</td>
                <td>{story.user?.username || 'Unknown'}</td>
                <td>{format(new Date(story.created_at), 'PP')}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setStoryDetails(story)} className="action-button">Details</button>
                  {story.allowed_to_publish && (
                    story.is_public ? (
                      <button
                        onClick={async () => {
                          try {
                            const updated = await unpublishPlatformFeedback(story.id);
                            setStories(prev => prev.map(s => s.id === story.id ? { ...s, ...updated } : s));
                          } catch (e:any) { toast.error(e?.response?.data?.message || 'Failed to unpublish.'); }
                        }}
                        className="action-button warning"
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          try {
                            const updated = await publishPlatformFeedback(story.id);
                            setStories(prev => prev.map(s => s.id === story.id ? { ...s, ...updated } : s));
                          } catch (e:any) { toast.error(e?.response?.data?.message || 'Failed to publish.'); }
                        }}
                        className="action-button success"
                      >
                        Publish
                      </button>
                    )
                  )}
                  <button
                    onClick={async () => {
                      if (!window.confirm('Delete this story?')) return;
                      try {
                        await deletePlatformFeedback(story.id);
                        setStories(prev => prev.filter(s => s.id !== story.id));
                      } catch (e:any) { toast.error(e?.response?.data?.message || 'Failed to delete.'); }
                    }}
                    className="action-button danger"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={9}>No success stories found.</td></tr>
            )}
          </tbody>
        </table>

        {/* pagination */}
        <div className="pagination" style={{ marginTop: 12 }}>
          <button
            onClick={() => setPfPage(p => Math.max(1, p - 1))}
            disabled={pfPage === 1}
            className="action-button"
          >
            Previous
          </button>
          <span className="page-number">Page {pfPage} of {pfTotalPages}</span>
          <button
            onClick={() => setPfPage(p => Math.min(pfTotalPages, p + 1))}
            disabled={pfPage >= pfTotalPages}
            className="action-button"
          >
            Next
          </button>


        </div>
      </>
    )}
  </div>
)}

          {activeTab === 'Categories' && (
 <div>
  <h4>Categories</h4>
  
  {/* Добавлено: 2 формы для main и sub */}
<div className="form-group">
  <h5>Create Main Category</h5>
  <input
    type="text"
    value={newMainCategoryName}
    onChange={(e) => setNewMainCategoryName(e.target.value)}
    placeholder="Enter main category name"
  />
  <button onClick={() => handleCreateCategory(newMainCategoryName)} className="action-button">
    Create Main
  </button>
</div>

<div className="form-group">
  <h5>Create Subcategory</h5>
  <input
    type="text"
    value={newSubCategoryName}
    onChange={(e) => setNewSubCategoryName(e.target.value)}
    placeholder="Enter subcategory name"
  />
  <select
    value={newParentCategoryId}
    onChange={(e) => setNewParentCategoryId(e.target.value)}
    className="category-select"
  >
    <option value="">Select parent category</option>
    {categories.filter((c) => !c.parent_id).map((c) => (
      <option key={c.id} value={c.id}>{c.name}</option>
    ))}
  </select>
  <button onClick={() => handleCreateCategory(newSubCategoryName, newParentCategoryId)} className="action-button"> 
    Create Sub
  </button>
</div>


{fetchErrors.getCategories && <p className="error-message">{fetchErrors.getCategories}</p>}
<div className="category-tree">
  <h5>Category Hierarchy</h5>
  <ul className="category-tree-list">
    {categories
      .filter((category) => !category.parent_id)
      .map((category) => (
        <li key={category.id} className="category-tree-item">
          <details>
            <summary>{category.name} <span onClick={() => handleDeleteCategory(category.id)} className="delete-cross">×</span></summary> 
            {category.subcategories && category.subcategories.length > 0 && (
              <ul className="category-tree-sublist">
                {category.subcategories.map((sub) => (
                  <li key={sub.id} className="category-tree-subitem">
                    {sub.name} <span onClick={() => handleDeleteCategory(sub.id)} className="delete-cross">×</span>
                  </li>
                ))}
              </ul>
            )}
          </details>
        </li>
      ))}
    {categories.length === 0 && <p>No categories found.</p>}
  </ul>
</div>
</div>
)}

          {activeTab === 'Blocked Countries' && (
            <div>
              <h4>Blocked Countries</h4>
              <div className="form-group">
                <input
                  type="text"
                  value={newCountryCode}
                  onChange={(e) => setNewCountryCode(e.target.value)}
                  placeholder="Enter country code (e.g., US)"
                />
                <button onClick={handleAddBlockedCountry} className="action-button">
                  Add Blocked Country
                </button>
              </div>
              {fetchErrors.getBlockedCountries && <p className="error-message">{fetchErrors.getBlockedCountries}</p>}
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Country Code</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedCountries.length > 0 ? blockedCountries.map((country) => (
                    <tr key={country.id}>
                      <td>{country.country_code || 'N/A'}</td>
                      <td>{format(new Date(country.created_at), 'PP')}</td>
                      <td>
                        <button
                          onClick={() => handleRemoveBlockedCountry(country.country_code)}
                          className="action-button danger"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3}>No blocked countries found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

{activeTab === 'Complaints' && (
  <div>
    <h4>Complaints</h4>
    <div className="form-group">
      <label>Filter by Status:</label>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Pending' | 'Resolved' | 'Rejected')}
        className="status-filter"
      >
        <option value="All">All</option>
        <option value="Pending">Pending</option>
        <option value="Resolved">Resolved</option>
        <option value="Rejected">Rejected</option>
      </select>
    </div>
    {fetchErrors.getComplaints && <p className="error-message">{fetchErrors.getComplaints}</p>}
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Complainant</th>
          <th>Target</th>
          <th>Reason</th>
          <th onClick={() => handleComplaintSort('status')} style={{ cursor: 'pointer' }}>
            Status {complaintSortColumn === 'status' ? (complaintSortDirection === 'asc' ? <FaArrowUp /> : <FaArrowDown />) : <FaArrowUp />}
          </th>
          <th>Resolution Comment</th>
          <th onClick={() => handleComplaintSort('created_at')} style={{ cursor: 'pointer' }}>
            Created At {complaintSortColumn === 'created_at' ? (complaintSortDirection === 'asc' ? <FaArrowUp /> : <FaArrowDown />) : <FaArrowUp />}
          </th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {paginatedComplaints.length > 0 ? paginatedComplaints.map((complaint) => (
      <tr key={complaint.id}>
  <td>{complaint.id}</td>
  <td>{complaint.complainant?.username || 'N/A'}</td>
  <td>{complaint.targetUsername || 'N/A'}</td>
  <td>{complaint.reason || 'N/A'}</td>
  <td>{complaint.status || 'N/A'}</td>
  <td>
    {complaint.resolution_comment
      ? `${complaint.resolution_comment} (by ${complaint.resolver?.username || 'Unknown'})`
      : 'N/A'}
  </td>
  <td>{complaint.created_at ? format(new Date(complaint.created_at), 'PP') : 'N/A'}</td> 
  <td>
{complaint.status === 'Pending' && (
  <button
    onClick={() => setResolveModal({ id: complaint.id, status: 'Resolved', comment: '' })}
    className="action-button"
  >
    Resolve
  </button>
)}
    {complaint.job_post_id && (
      <button onClick={() => setShowJobModal(complaint.job_post_id || null)} className="action-button">View Job</button>
    )}
    {complaint.profile_id && (
      <button onClick={() => setShowProfileModal(complaint.profile_id || null)} className="action-button">View Profile</button>
    )}
  </td>
</tr>
        )) : (
          <tr>
             <td colSpan={8}>No complaints found for selected status.</td>
          </tr>
        )}
      </tbody>
    </table>
    <div className="pagination" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
  <button
    onClick={() => setComplaintsPage(p => Math.max(1, p - 1))}
    disabled={complaintsPage === 1}
    className="action-button"
  >
    Previous
  </button>

  <span className="page-number">Page {complaintsPage} of {complaintsTotalPages}</span>

  <button
    onClick={() => setComplaintsPage(p => Math.min(complaintsTotalPages, p + 1))}
    disabled={complaintsPage >= complaintsTotalPages}
    className="action-button"
  >
    Next
  </button>

  <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
    <label>Per page:</label>
    <select
      value={complaintsLimit}
      onChange={(e) => {
        setComplaintsLimit(parseInt(e.target.value, 10));
        setComplaintsPage(1);
      }}
    >
      {[10, 20, 30, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  </div>
</div>

  </div>
)}

    {showProfileModal && selectedProfile && ( 
  <div className="modal">
    <div className="modal-content">
      <span className="close" onClick={() => setShowProfileModal(null)}>×</span>
      <h3>Profile Details</h3>
      <p><strong>Username:</strong> {selectedProfile.username}</p>
      <p><strong>Email:</strong> {selectedProfile.email || 'N/A'}</p>
      <p><strong>Skills:</strong> {selectedProfile.skills?.map(skill => skill.name).join(', ') || 'N/A'}</p>
      <p><strong>Experience:</strong> {selectedProfile.experience || 'N/A'}</p>
      <p><strong>Average Rating:</strong> {selectedProfile.average_rating}</p>
      <p><strong>Reviews:</strong> {selectedProfile.reviews.length > 0 ? selectedProfile.reviews.map(review => review.comment).join('; ') : 'No reviews'}</p>
    </div>
  </div>
  )}

    {showJobModal && jobPosts.find(post => post.id === showJobModal) && (
      <div className="modal is-admin-jobpost">
        <div className="modal-content">
          <span className="close" onClick={() => setShowJobModal(null)}>×</span>
          <h3 className='job-post-details'>Job Post Details</h3>
          <p><strong>Title:</strong> {jobPosts.find(post => post.id === showJobModal)?.title}</p>
         <p><strong>Description:</strong></p>
<div className="job-modal__richtext"
  dangerouslySetInnerHTML={{ __html: safeDescription }}
/>
          {jobPosts.find(post => post.id === showJobModal)?.pending_review && (
            <button onClick={() => {
              handleApproveJobPost(showJobModal);
              setShowJobModal(null);
            }} className="action-button success">
              Approve
            </button>
          )}
        </div>
      </div>
    )}

          {activeTab === 'Chat History' && (
  <div>
    <h4>Chat History</h4>
    {/* {error && <p className="error-message">{error}</p>}
<div className="form-group">
  <label>Search by Job Post ID:</label>
  <input
    type="text"
    value={searchJobId}
    onChange={(e) => setSearchJobId(e.target.value)}
    placeholder="Enter job post ID"
  />
  <button onClick={() => {
    if (searchJobId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(searchJobId)) {
      alert('Wrong format Job Post ID. Enter valid UUID (example, 123e4567-e89b-12d3-a456-426614174000).');
      return;
    }
    handleViewJobApplications(searchJobId);
  }} className="action-button">
    Search
  </button>
</div>
    <div className="form-group">
      <label>Select Job Post:</label>
<select
  value={selectedJobPostId}
  onChange={(e) => handleViewJobApplications(e.target.value)}
>
  <option value="">Select a job post</option>
  {jobPostsWithApps.filter(post => post.status === 'Closed').map(post => (
    <option key={post.id} value={post.id}>
      {post.title} (ID: {post.id})
    </option>
  ))}
</select>
    </div>
    {selectedJobPostId && chatHistory.data.length > 0 && (
      <>
        <h3>Messages for Job Application ID: {selectedJobApplicationId}</h3>
       <div className="chat-messages" style={{ overflowY: 'auto', maxHeight: '400px' }}> 
  {chatHistory.data.length > 0 ? chatHistory.data.map((message) => (
    <div key={message.id} className={`message ${message.sender.role === 'jobseeker' ? 'received' : 'sent'}`}> 
      <p><strong>{message.sender.username}:</strong> {message.content}</p>
      <span>{format(new Date(message.created_at), 'PPpp')}</span>
      <span>{message.is_read ? 'Read' : 'Unread'}</span>
    </div>
  )) : (
    <p>No messages found.</p>
  )}
</div>
       
      </>
    )} */}
     <AdminChatTab />
  </div>
)}

         {activeTab === 'Analytics' && (
  <div>

    <h4>Analytics</h4>
    {fetchErrors.getAnalytics && <p className="error-message">{fetchErrors.getAnalytics}</p>}
    {analytics ? (
      <>
        <h5>User Distribution</h5>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={[
                { name: 'Employers', value: analytics.employers },
                { name: 'Job Seekers', value: analytics.jobSeekers },
              ]}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              label
            >
              <Cell fill="#82ca9d" />
              <Cell fill="#ffc658" />
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="analytics-grid">
          <div className="analytics-card">
            <p><strong>Total Users:</strong> {(analytics.employers && analytics.jobSeekers) ? analytics.employers + analytics.jobSeekers : 'N/A'}</p>
          </div>
          <div className="analytics-card">
            <p><strong>Employers:</strong> {analytics.employers}</p>
          </div>
          <div className="analytics-card">
            <p><strong>Job Seekers:</strong> {analytics.jobSeekers}</p>
          </div>
          <div className="analytics-card">
            <p><strong>Total Job Posts:</strong> {analytics.totalJobPosts}</p>
          </div>
          <div className="analytics-card">
            <p><strong>Active Job Posts:</strong> {analytics.activeJobPosts}</p>
          </div>
          <div className="analytics-card">
            <p><strong>Total Applications:</strong> {analytics.totalApplications}</p>
          </div>
          <div className="analytics-card">
            <p><strong>Total Reviews:</strong> {analytics.totalReviews}</p>
          </div>
        </div>
      </>
    ) : (
      <p>No analytics data available.</p>
    )}
    <h4>Registration Stats</h4>
                     <div className="interval-tabs">
  <button className={selectedInterval === 'day' ? 'active' : ''} onClick={() => setSelectedInterval('day')}>Day</button>
  <button className={selectedInterval === 'week' ? 'active' : ''} onClick={() => setSelectedInterval('week')}>Week</button>
  <button className={selectedInterval === 'month' ? 'active' : ''} onClick={() => setSelectedInterval('month')}>Month</button>
</div>
    {fetchErrors.getRegistrationStats && <p className="error-message">{fetchErrors.getRegistrationStats}</p>}
    {registrationStats.length > 0 && (
  <ResponsiveContainer width="100%" height={300}>
  <BarChart data={registrationStats}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="period" />
    <YAxis />
    <Tooltip formatter={(value: number) => [value, 'Registrations']} />
    <Legend />
    <Bar dataKey="count" fill="#8884d8" />
  </BarChart>
</ResponsiveContainer>
)}
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>Period</th>
          <th>Count</th>
        </tr>
      </thead>
      <tbody>
        {registrationStats.length > 0 ? registrationStats.map((stat, index) => (
          <tr key={index}>
           <td>{format(new Date(stat.period), 'dd.MM.yyyy')}</td>
            <td>{stat.count}</td>
          </tr>
        )) : (
          <tr>
            <td colSpan={2}>No registration stats found.</td>
          </tr>
        )}
      </tbody>
    </table>
    
    <h4>Registrations by Brand</h4>

<div className="filters-row" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
  <label>
    Start:&nbsp;
    <input
      type="date"
      value={brandsRange.startDate || ''}
      onChange={(e) => setBrandsRange(r => ({ ...r, startDate: e.target.value || undefined }))}
    />
  </label>
  <label>
    End:&nbsp;
    <input
      type="date"
      value={brandsRange.endDate || ''}
      onChange={(e) => setBrandsRange(r => ({ ...r, endDate: e.target.value || undefined }))}
    />
  </label>
  <button className="action-button" onClick={() => setBrandsRange({})}>Clear</button>
</div>

{brandsLoading && <p>Loading brand stats…</p>}
{brandsError && <p className="error-message">{brandsError}</p>}

{!brandsLoading && !brandsError && brandsData && (
  <>
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>Brand</th>
          <th>Total</th>
          <th>Employers</th>
          <th>Jobseekers</th>
        </tr>
      </thead>
      <tbody>
        {brandsData.byBrand.map(b => (
          <tr key={b.brand}>
            <td>{b.brand}</td>
            <td>{b.total}</td>
            <td>{b.employers}</td>
            <td>{b.jobseekers}</td>
          </tr>
        ))}
        <tr>
          <td><strong>Overall</strong></td>
          <td><strong>{brandsData.overall.total}</strong></td>
          <td><strong>{brandsData.overall.employers}</strong></td>
          <td><strong>{brandsData.overall.jobseekers}</strong></td>
        </tr>
      </tbody>
    </table>
  </>
)}

   <h4>Growth Trends</h4>
{fetchErrors.getGrowthTrends && <p className="error-message">{fetchErrors.getGrowthTrends}</p>}
<h5>Registrations</h5>
{growthTrends.registrations.length > 0 && (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={growthTrends.registrations}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="period" tickFormatter={(value) => format(new Date(value), 'PP')} />
      <YAxis />
      <Tooltip formatter={(value: number) => [value, 'Registrations']} />
      <Legend />
      <Line type="monotone" dataKey="count" stroke="#82ca9d" />
    </LineChart>
  </ResponsiveContainer>
)}
<table className="dashboard-table">
  <thead>
    <tr>
      <th>Period</th>
      <th>Count</th>
    </tr>
  </thead>
<tbody>
  {growthTrends.registrations.length > 0 ? growthTrends.registrations
    .slice((growthPage - 1) * growthLimit, growthPage * growthLimit) // Добавлено: slice для пагинации
    .map((stat, index) => (
      <tr key={index}>
        <td>{format(new Date(stat.period), 'PP')}</td>
        <td>{stat.count}</td>
      </tr>
    )) : (
      <tr>
        <td colSpan={2}>No registration trends found.</td>
      </tr>
    )}
</tbody>
</table>
<div className="pagination"> 
  <button onClick={() => setGrowthPage(prev => Math.max(prev - 1, 1))} disabled={growthPage === 1} className="action-button">Previous</button>
  <span>Page {growthPage}</span>
  <button onClick={() => setGrowthPage(prev => prev + 1)} disabled={(growthPage * growthLimit) >= growthTrends.registrations.length} className="action-button">Next</button>
</div>
<h5>Job Posts</h5>
{growthTrends.jobPosts.length > 0 && (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={growthTrends.jobPosts}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="period" tickFormatter={(value) => format(new Date(value), 'PP')} />
      <YAxis />
      <Tooltip formatter={(value: number) => [value, 'Job Posts']} />
      <Legend />
      <Line type="monotone" dataKey="count" stroke="#ffc658" />
    </LineChart>
  </ResponsiveContainer>
)}
<table className="dashboard-table">
  <thead>
    <tr>
      <th>Period</th>
      <th>Count</th>
    </tr>
  </thead>
  <tbody>
  {growthTrends.jobPosts.length > 0 ? growthTrends.jobPosts
    .slice((growthPage - 1) * growthLimit, growthPage * growthLimit) // Добавлено: slice
    .map((stat, index) => (
      <tr key={index}>
        <td>{format(new Date(stat.period), 'PP')}</td>
        <td>{stat.count}</td>
      </tr>
    )) : (
      <tr>
        <td colSpan={2}>No job post trends found.</td>
      </tr>
    )}
</tbody>
</table>
<div className="pagination"> {/* Добавлено: пагинация для jobPosts */}
  <button onClick={() => setGrowthPage(prev => Math.max(prev - 1, 1))} disabled={growthPage === 1} className="action-button">Previous</button>
  <span>Page {growthPage}</span>
  <button onClick={() => setGrowthPage(prev => prev + 1)} disabled={(growthPage * growthLimit) >= growthTrends.jobPosts.length} className="action-button">Next</button>
</div>

   {/* <h4>Top Employers by Total Applicants</h4> 
{fetchErrors.getTopEmployers && <p className="error-message">{fetchErrors.getTopEmployers}</p>}
<table className="dashboard-table">
  <thead>
    <tr>
      <th>Username</th>
      <th>Total Applicants</th> 
    </tr>
  </thead>
  <tbody>
    {topEmployers.length > 0 ? topEmployers.map((employer) => {
      const totalApplicants = jobPostsWithApps
        .filter(post => post.employer_id === employer.employer_id)
        .reduce((sum, post) => sum + post.applicationCount, 0);
      return (
        <tr key={employer.employer_id}>
          <td>{employer.username}</td>
          <td>{totalApplicants}</td> 
        </tr>
      );
    }) : (
      <tr>
        <td colSpan={2}>No top employers found.</td>
      </tr>
    )}
  </tbody>
</table>
<h4>Top Jobseekers</h4>
{fetchErrors.getTopJobseekers && <p className="error-message">{fetchErrors.getTopJobseekers}</p>}
<table className="dashboard-table">
  <thead>
    <tr>
      <th>Username</th>
      <th>Application Count</th>
    </tr>
  </thead>
  <tbody>
    {topJobseekers.length > 0 ? topJobseekers.map((jobseeker) => (
      <tr key={jobseeker.job_seeker_id}>
        <td>{jobseeker.username}</td>
        <td>{jobseeker.application_count > 0 ? jobseeker.application_count : 'No applications yet'}</td>
      </tr>
    )) : (
      <tr>
        <td colSpan={2}>No top jobseekers found.</td>
      </tr>
    )}
  </tbody>
</table> */}
    <h4>Top Jobseekers by Profile Views</h4>
    {fetchErrors.getTopJobseekersByViews && <p className="error-message">{fetchErrors.getTopJobseekersByViews}</p>}
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>Username</th>
          <th>Email</th>
          <th>Profile Views</th>
        </tr>
      </thead>
      <tbody>
        {topJobseekersByViews.length > 0 ? topJobseekersByViews.map((jobseeker) => (
          <tr key={jobseeker.userId}>
            <td>{jobseeker.username}</td>
            <td>{jobseeker.email}</td>
            <td>{jobseeker.profileViews}</td>
          </tr>
        )) : (
          <tr>
            <td colSpan={3}>No top jobseekers by views found.</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
)}

{activeTab === 'Email Notifications' && (
  <div>
    <h4>Email Notifications</h4>
    <div className="form-group">
      <label>Job Post ID:</label>
      <input value={filterJobPostId} onChange={(e) => setFilterJobPostId(e.target.value)} />
    </div>
    <div className="form-group">
      <label>Title:</label>
      <input value={filterTitle} onChange={(e) => setFilterTitle(e.target.value)} />
    </div>
    <div className="form-group">
      <label>Employer ID:</label>
      <input value={filterEmployerId} onChange={(e) => setFilterEmployerId(e.target.value)} />
    </div>
    <div className="form-group">
      <label>Employer Email:</label>
      <input value={filterEmployerEmail} onChange={(e) => setFilterEmployerEmail(e.target.value)} />
    </div>
    <div className="form-group">
      <label>Employer Username:</label>
      <input value={filterEmployerUsername} onChange={(e) => setFilterEmployerUsername(e.target.value)} />
    </div>
    <button onClick={async () => {
      const data = await getAllEmailStats({
        jobPostId: filterJobPostId,
        title: filterTitle,
        employerId: filterEmployerId,
        employerEmail: filterEmployerEmail,
        employerUsername: filterEmployerUsername,
      });
      setAllEmailStats(data);
    }} className="action-button">
      Search
    </button>
    {allEmailStats && (
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Username</th>
            <th>Opened</th>
            <th>Clicked</th>
            <th>Sent At</th>
            <th>Opened At</th>
            <th>Clicked At</th>
            <th>Job Post ID</th>
          </tr>
        </thead>
        <tbody>
          {allEmailStats.details.length > 0 ? allEmailStats.details.map((detail, i) => (
            <tr key={i}>
              <td>{detail.email}</td>
              <td>{detail.username}</td>
              <td>{detail.opened ? 'Yes' : 'No'}</td>
              <td>{detail.clicked ? 'Yes' : 'No'}</td>
              <td>{format(new Date(detail.sent_at), 'PPpp')}</td>
              <td>{detail.opened_at ? format(new Date(detail.opened_at), 'PPpp') : 'N/A'}</td>
              <td>{detail.clicked_at ? format(new Date(detail.clicked_at), 'PPpp') : 'N/A'}</td>
              <td>{detail.job_post_id}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={8}>No notifications found.</td>
            </tr>
          )}
        </tbody>
      </table>
    )}
  </div>
)}

{activeTab === 'Referral Links' && (
  <div className="ref-links">
    <div className="ref-links__head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h4 className="ref-links__title">Referral Links</h4>
    </div>

    {/* --- Подменю Job / Site --- */}
    <div className="tabs" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      <button
        className={`action-button ${refSubTab === 'job' ? 'success' : ''}`}
        onClick={() => setRefSubTab('job')}
        type="button"
      >
        Job Links
      </button>
      <button
        className={`action-button ${refSubTab === 'site' ? 'success' : ''}`}
        onClick={() => setRefSubTab('site')}
        type="button"
      >
        Site Links
      </button>
    </div>

{refSubTab === 'job' && (
  <div className="ref-links__job is-open">
    {(() => {
      if (!Array.isArray(referralLinks) || referralLinks.length === 0) {
        return <div className="ref-links__empty">No job referral links yet.</div>;
      }

      // Группируем ссылки по вакансии + считаем агрегаты
      const groups: Record<
        string,
        {
          jobId: string;
          title: string;
          links: any[];
          totals: { clicks: number; registrations: number; verified: number };
        }
      > = {};

      for (const l of referralLinks) {
        const jobId = l.job_post?.id || l.jobPostId || 'unknown';
        const title = l.job_post?.title || 'Untitled job';
        if (!groups[jobId]) {
          groups[jobId] = {
            jobId,
            title,
            links: [],
            totals: { clicks: 0, registrations: 0, verified: 0 },
          };
        }
        groups[jobId].links.push(l);
        groups[jobId].totals.clicks += Number(l.clicks ?? 0);
        groups[jobId].totals.registrations += Number(l.registrations ?? 0);
        groups[jobId].totals.verified += Number(l.registrationsVerified ?? 0);
      }

      const jobIds = Object.keys(groups);

      return jobIds.map((jid) => {
        const g = groups[jid];
        const opened = !!jobExpanded[jid];

        return (
          <section key={jid} className={`ref-links__job ${opened ? 'is-open' : ''}`}>
            {/* Шапка группы вакансии */}
            <header className="ref-links__job-head" onClick={() => toggleJobGroup(jid)}>
              <div className="ref-links__job-title">
                <span className="ref-links__chev">{opened ? '▾' : '▸'}</span>
                <span className="ref-links__job-name">{g.title}</span>
                <span className="ref-links__count">({g.links.length})</span>
              </div>

              {/* агрегаты по вакансии */}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className="ref-links__kv">Clicks: <b>{g.totals.clicks}</b></span>
                <span className="ref-links__kv">Regs: <b>{g.totals.registrations}</b></span>
                <span className="ref-links__kv">Verified: <b>{g.totals.verified}</b></span>

                {/* Создание рефки под конкретную вакансию */}
                <button
                  type="button"
                  className="action-button success"
                  onClick={(e) => { e.stopPropagation(); openCreateReferralModal(jid); }}
                  title="Create referral link for this job"
                >
                  + Create
                </button>
              </div>
            </header>

            {/* Таблица ссылок по этой вакансии */}
            {opened && (
              <div className="ref-links__job-body">
                <div className="ref-links__table-wrap">
                  <table className="ref-links__table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Short / Full Link</th>
                        <th>Clicks</th>
                        <th>Registrations</th>
                        <th>Verified</th>
                        <th>Created at</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.links.map((link: any) => (
                        <tr key={link.id}>
                          <td className="ref-links__desc">{link.description || <i>—</i>}</td>

                          <td className="ref-links__url">
                            <span title={link.fullLink || link.shortLink} className="ref-links__url-text">
                              {typeof shortenReferralUrl === 'function'
                                ? shortenReferralUrl(link.shortLink || link.fullLink)
                                : (link.shortLink || link.fullLink)}
                            </span>
                            {(link.shortLink || link.fullLink) && (
                              <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(link.shortLink || link.fullLink)}
                                className="ref-links__btn ref-links__btn--ghost"
                                title="Copy link"
                              >
                                <FaCopy style={{ marginRight: 6 }} />
                                Copy
                              </button>
                            )}
                          </td>

                          <td className="ref-links__num">{link.clicks ?? 0}</td>
                          <td className="ref-links__num">{link.registrations ?? 0}</td>
                          <td className="ref-links__num">{link.registrationsVerified ?? 0}</td>
                          <td>{link.created_at ? renderDateCell(link.created_at) : '—'}</td>

                          <td className="ref-links__actions">
                            <button
                              type="button"
                              className="ref-links__btn"
                              onClick={() => handleEditReferral(link.id, link.description || '')}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="ref-links__btn ref-links__btn--danger"
                              onClick={() => handleDeleteReferral(link.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        );
      });
    })()}
  </div>
)}


    {/* ====== TAB: SITE LINKS (глобальные ссылки) ====== */}
    {refSubTab === 'site' && (
      <div className="ref-links__site">

        {/* Фильтры/поиск */}
        <div className="ref-links__filters" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="ref-links__field">
            <label htmlFor="site-q">Search (description/refCode):</label>
            <input
              id="site-q"
              value={siteQ}
              onChange={(e) => setSiteQ(e.target.value)}
              placeholder="e.g., promo or 4b1f…"
            />
          </div>

          <div className="ref-links__field">
            <label htmlFor="site-createdby">Created by (adminId):</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="site-createdby"
                value={siteCreatedByAdminId}
                onChange={(e) => setSiteCreatedByAdminId(e.target.value)}
                placeholder="uuid or empty for all"
                style={{ minWidth: 260 }}
              />
              <button
                type="button"
                className="action-button"
                onClick={() => adminId && setSiteCreatedByAdminId(adminId)}
                disabled={!adminId}
                title="Only me"
              >
                Only me
              </button>
              <button
                type="button"
                className="ref-links__btn ref-links__btn--primary"
                onClick={fetchSiteReferrals}
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Создание новой глобальной ссылки */}
        <div className="ref-links__create" style={{ marginTop: 12 }}>
          <h5 style={{ margin: '8px 0' }}>Create Site Referral Link</h5>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr auto' }}>
            <input
              type="text"
              value={newSiteDescription}
              onChange={(e) => setNewSiteDescription(e.target.value)}
              placeholder="Description (optional), e.g. Telegram promo"
            />
            <input
              type="text"
              value={newSiteLandingPath}
              onChange={(e) => setNewSiteLandingPath(e.target.value)}
              placeholder="/register or /register?role=jobseeker"
            />
            <button
              className="action-button success"
              onClick={handleCreateSiteReferral}
              disabled={creatingSite}
              type="button"
            >
              {creatingSite ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>

        {/* Табличный список, сгруппированный по администратору */}
        <div style={{ marginTop: 16 }}>
          {(() => {
            // groups: adminId -> { adminName, links[] }
            const groups: Record<string, { adminName: string; links: SiteReferralLink[] }> = {};
            for (const l of siteReferrals) {
              const aid = l.createdByAdmin?.id || l.createdByAdminId || 'unknown';
              const aname = l.createdByAdmin?.username || 'Unknown';
              if (!groups[aid]) groups[aid] = { adminName: aname, links: [] };
              groups[aid].links.push(l);
            }

            const keys = Object.keys(groups);
            if (keys.length === 0) {
              return <div className="ref-links__empty">No site referral links found.</div>;
            }

            return keys.map((aid) => {
              const opened = !!siteExpandedAdmin[aid];
              const { adminName, links } = groups[aid];
              return (
                <section key={aid} className={`ref-links__job ${opened ? 'is-open' : ''}`}>
                  <header className="ref-links__job-head" onClick={() => toggleSiteGroup(aid)}>
                    <div className="ref-links__job-title">
                      <span className="ref-links__chev">{opened ? '▾' : '▸'}</span>
                      <span className="ref-links__job-name">Admin: {adminName}</span>
                      <span className="ref-links__count">({links.length})</span>
                    </div>
                  </header>

                  {opened && (
                    <div className="ref-links__job-body">
                      <div className="ref-links__table-wrap">
                        <table className="ref-links__table">
                          <thead>
                            <tr>
                              <th>Description</th>
                              <th>Short Link</th>
                              <th>Landing Path</th>
                              <th>Clicks</th>
                              <th>Registrations (verified)</th>
                              <th>Created by</th>
                              <th>Created at</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {links.map((l) => (
                              <React.Fragment key={l.id}>
                                <tr>
                                  <td className="ref-links__desc">{l.description || <i>—</i>}</td>

                                  <td className="ref-links__url">
                                    <span title={l.shortLink} className="ref-links__url-text">
                                      {shortenReferralUrl(l.shortLink)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => navigator.clipboard.writeText(l.shortLink)}
                                      className="ref-links__btn ref-links__btn--ghost"
                                      title="Copy link"
                                    >
                                      <FaCopy style={{ marginRight: 6 }} />
                                      Copy
                                    </button>
                                  </td>

                                  <td>{l.landingPath || '/register'}</td>
                                  <td className="ref-links__num">{l.clicks}</td>
                                  <td className="ref-links__num">
                                    {l.registrations} ({l.registrationsVerified ?? 0})
                                  </td>
                                  <td>{l.createdByAdmin?.username || 'Unknown'}</td>
                                  <td>{l.created_at ? renderDateCell(l.created_at) : '—'}</td>

                                  <td className="ref-links__actions">
                                    <button
                                      type="button"
                                      className="ref-links__btn"
                                      onClick={() => handleEditSiteReferral(l.id, l.description || '')}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="ref-links__btn ref-links__btn--danger"
                                      onClick={() => handleDeleteSiteReferral(l.id)}
                                    >
                                      Delete
                                    </button>
                                    <button
                                      type="button"
                                      className="ref-links__btn ref-links__btn--primary"
                                      onClick={() =>
                                        setSiteExpandedLinkId(siteExpandedLinkId === l.id ? null : l.id)
                                      }
                                    >
                                      {siteExpandedLinkId === l.id ? 'Hide regs' : 'View regs'}
                                    </button>
                                  </td>
                                </tr>

                                {siteExpandedLinkId === l.id && (
                                  <tr className="ref-links__expand">
                                    <td colSpan={8}>
                                      <div className="ref-links__regs">
                                        <div className="ref-links__regs-head">Registrations</div>
                                        <div className="ref-links__regs-tablewrap">
                                          <table className="ref-links__regs-table">
                                            <thead>
                                              <tr>
                                                <th>User ID</th>
                                                <th>Username</th>
                                                <th>Email</th>
                                                <th>Role</th>
                                                <th>Created At</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {l.registrationsDetails?.length ? (
                                                l.registrationsDetails.map((r, i) => (
                                                  <tr key={i}>
                                                    <td>{r.user.id}</td>
                                                    <td>{r.user.username}</td>
                                                    <td>{r.user.email}</td>
                                                    <td>{r.user.role}</td>
                                                    <td>{r.user?.created_at ? new Date(r.user.created_at).toLocaleDateString() : '—'}</td>
                                                  </tr>
                                                ))
                                              ) : (
                                                <tr><td colSpan={5}>No registrations.</td></tr>
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </section>
              );
            });
          })()}
        </div>
      </div>
    )}
  </div>
)}





{showEmailStatsModal && (
  <div className="modal modal--emailstats">
    <div className="modal-content modal-content--emailstats">
      <span className="close" onClick={() => setShowEmailStatsModal(null)}>×</span>
      <h3>Email Notifications — {showEmailStatsModal.jobTitle || showEmailStatsModal.jobPostId}</h3>

      {showEmailStatsModal.loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <p><strong>Sent:</strong> {showEmailStatsModal.data?.sent}</p>
          <p><strong>Opened:</strong> {showEmailStatsModal.data?.opened}</p>
          <p><strong>Clicked:</strong> {showEmailStatsModal.data?.clicked}</p>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Username</th>
                <th>Opened</th>
                <th>Clicked</th>
                <th>Sent At</th>
                <th>Opened At</th>
                <th>Clicked At</th>
              </tr>
            </thead>
            <tbody>
              {showEmailStatsModal.data?.details?.length
                ? showEmailStatsModal.data.details.map((d, i) => (
                    <tr key={i}>
                      <td>{d.email}</td>
                      <td>{d.username}</td>
                      <td>{d.opened ? 'Yes' : 'No'}</td>
                      <td>{d.clicked ? 'Yes' : 'No'}</td>
                      <td>{format(new Date(d.sent_at), 'PPpp')}</td>
                      <td>{d.opened_at ? format(new Date(d.opened_at), 'PPpp') : 'N/A'}</td>
                      <td>{d.clicked_at ? format(new Date(d.clicked_at), 'PPpp') : 'N/A'}</td>
                    </tr>
                  ))
                : (
                  <tr><td colSpan={7}>No notifications found.</td></tr>
                )
              }
            </tbody>
          </table>
        </>
      )}
    </div>
  </div>
)}

{rejectModal.id && (
  <div className="modal">
    <div className="modal-content">
      <span className="close" onClick={closeRejectModal}>×</span>
      <h3>Reject Job Post</h3>
      <p><strong>Job:</strong> {rejectModal.title || rejectModal.id}</p>

      <div className="form-group">
        <label>Reason</label>
        <textarea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Write the reason for rejection…"
        />
      </div>

      <div className="modal-actions">
        <button onClick={submitReject} className="action-button danger">Reject</button>
        <button onClick={closeRejectModal} className="action-button">Cancel</button>
      </div>
    </div>
  </div>
)}


{storyDetails && (
  <div className="modal" onClick={() => setStoryDetails(null)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <span className="close" onClick={() => setStoryDetails(null)}>×</span>
      <h3>Success Story Details</h3>

      <div className="form-group">
        <label><strong>Headline:</strong></label>
        <div>{storyDetails.headline}</div>
      </div>

      <div className="form-group">
        <label><strong>User:</strong></label>
        <div>{storyDetails.user?.username || storyDetails.user_id}</div>
      </div>

      <div className="form-group">
        <label><strong>Rating:</strong></label>
        <div>{storyDetails.rating} / 5</div>
      </div>

      <div className="form-group">
        <label><strong>Company:</strong></label>
        <div>{storyDetails.company || '—'}</div>
      </div>

      <div className="form-group">
        <label><strong>Country:</strong></label>
        <div>{storyDetails.country || '—'}</div>
      </div>

      <div className="form-group">
        <label><strong>Created:</strong></label>
        <div>{format(new Date(storyDetails.created_at), 'PPpp')}</div>
      </div>

      <div className="form-group">
        <label><strong>Updated:</strong></label>
        <div>{format(new Date(storyDetails.updated_at), 'PPpp')}</div>
      </div>

      <hr />

      <div className="form-group">
        <label><strong>Story:</strong></label>
        {/* текст хранится как plain; рендерим безопасно как текст */}
        <div style={{ whiteSpace: 'pre-wrap' }}>{storyDetails.story}</div>
      </div>

      <div className="modal-actions" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        

        {/* Дублируем действие публикации прямо из модалки (необязательно, можно удалить этот блок) */}
        {storyDetails.allowed_to_publish && (
          storyDetails.is_public ? (
            <button
              className="action-button warning"
              onClick={async () => {
                try {
                  const updated = await unpublishPlatformFeedback(storyDetails.id);
                  setStories(prev => prev.map(s => s.id === storyDetails.id ? { ...s, ...updated } : s));
                  setStoryDetails({ ...storyDetails, ...updated });
                } catch (error) {
                  const axiosError = error as AxiosError<{ message?: string }>;
                  alert(axiosError.response?.data?.message || 'Failed to unpublish.');
                }
              }}
            >
              Unpublish
            </button>
          ) : (
            <button
              className="action-button success"
              onClick={async () => {
                try {
                  const updated = await publishPlatformFeedback(storyDetails.id);
                  setStories(prev => prev.map(s => s.id === storyDetails.id ? { ...s, ...updated } : s));
                  setStoryDetails({ ...storyDetails, ...updated });
                } catch (error) {
                  const axiosError = error as AxiosError<{ message?: string }>;
                  alert(axiosError.response?.data?.message || 'Failed to publish.');
                }
              }}
            >
              Publish
            </button>
          )
        )}
      </div>
    </div>
  </div>
)}

{resolveModal && (
  <div className="modal">
    <div className="modal-content">
      <span className="close" onClick={() => setResolveModal(null)}>×</span>
      <h3>Resolve Complaint</h3>
      <div className="form-group">
        <label>Status:</label>
        <select
          value={resolveModal.status}
          onChange={(e) => setResolveModal({ ...resolveModal, status: e.target.value as 'Resolved' | 'Rejected' })}
        >
          <option value="Resolved">Resolved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>
      <div className="form-group">
        <label>Comment (optional):</label>
        <textarea
          value={resolveModal.comment}
          onChange={(e) => setResolveModal({ ...resolveModal, comment: e.target.value })}
          placeholder="Add resolution comment..."
          rows={4}
        />
      </div>
      <div className="modal-actions">
        <button onClick={submitResolveComplaint} className="action-button success">Save</button>
        <button onClick={() => setResolveModal(null)} className="action-button">Cancel</button>
      </div>
    </div>
  </div>
)}

{createReferralForJobId && (
  <div className="modal">
    <div className="modal-content">
      <span className="close" onClick={() => setCreateReferralForJobId(null)}>×</span>
      <h3>New Referral Link</h3>
      <div className="form-group">
        <label>Description (optional):</label>
        <input
          type="text"
          value={newReferralDescription}
          onChange={(e) => setNewReferralDescription(e.target.value)}
          placeholder="e.g., Facebook Ads — Campaign A"
        />
      </div>
      <div className="modal-actions">
        <button onClick={submitCreateReferral} className="action-button success">Create</button>
        <button onClick={() => setCreateReferralForJobId(null)} className="action-button">Cancel</button>
      </div>
    </div>
  </div>
)}

{showReferralModal && (
  <div className="modal">
    <div className="modal-content">
      <span className="close" onClick={() => setShowReferralModal(null)}>×</span>
      <h3>Referral Link Created</h3>
      <p><strong>Full Link:</strong> {showReferralModal.fullLink}</p>
      <button onClick={() => navigator.clipboard.writeText(showReferralModal.fullLink)} className="action-button"><FaCopy /> Copy Link</button>
      <p><strong>Clicks:</strong> {showReferralModal.clicks}</p>
      <p><strong>Registrations:</strong> {showReferralModal.registrations} ({showReferralModal.registrationsVerified ?? 0})</p>
    </div>
  </div>
)}

{showSiteCreatedModal && (
  <div className="modal">
    <div className="modal-content">
      <span className="close" onClick={() => setShowSiteCreatedModal(null)}>×</span>
      <h3>Site Referral Created</h3>
      {showSiteCreatedModal.description && (
        <p><strong>Description:</strong> {showSiteCreatedModal.description}</p>
      )}
      {showSiteCreatedModal.landingPath && (
        <p><strong>Landing Path:</strong> {showSiteCreatedModal.landingPath}</p>
      )}
      <p><strong>Short Link:</strong> {showSiteCreatedModal.shortLink}</p>
      <button
        onClick={() => navigator.clipboard.writeText(showSiteCreatedModal.shortLink)}
        className="action-button"
      >
        <FaCopy /> Copy Link
      </button>
    </div>
  </div>
)}

{editJobModal && (
  <div className="modal" onClick={() => setEditJobModal(null)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <span className="close" onClick={() => setEditJobModal(null)}>×</span>
      <h3>Edit Job Post</h3>

      {/* Title */}
      <div className="form-group">
        <label>Job Title</label>
        <input
          type="text"
          value={editJobModal.data.title || ''}
          onChange={(e) =>
            setEditJobModal(m => m && ({ ...m, data: { ...m.data, title: e.target.value } }))
          }
        />
      </div>

      {/* Description (rich text) */}
      <div className="form-group">
        <label>Description</label>
        <ReactQuill
          value={(editJobModal.data.description as string) || ''}
          onChange={(value) =>
            setEditJobModal(m => m && ({ ...m, data: { ...m.data, description: value } }))
          }
        />
      </div>

      {/* Work mode */}
      <div className="form-group">
        <label>Work Mode</label>
<select
  value={editJobModal.data.location ?? ''}
  onChange={(e) =>
    setEditJobModal(m => m && ({ ...m, data: { ...m.data, location: e.target.value || undefined } }))
  }
>
          <option value="">Work mode</option>
          <option value="Remote">Remote</option>
          <option value="On-site">On-site</option>
          <option value="Hybrid">Hybrid</option>
        </select>
      </div>

      {/* Salary + Type */}
      <div className="form-group" style={{ display: 'grid', gap: 8 }}>
        <label>Salary</label>
       <input
  type="number"
  min={0}
  disabled={editJobModal.data.salary_type === 'negotiable'}
  value={
    editJobModal.data.salary_type === 'negotiable'
      ? ''
      : (typeof editJobModal.data.salary === 'number'
          ? editJobModal.data.salary
          : (editJobModal.data.salary ?? ''))
  }
  onChange={(e) =>
    setEditJobModal(m => m && ({
      ...m,
      data: { ...m.data, salary: e.target.value ? Number(e.target.value) : undefined }
    }))
  }
/>

<select
  value={(editJobModal.data as any).salary_type ?? 'per hour'}
  onChange={(e) => {
    const st = e.target.value as 'per hour' | 'per month' | 'negotiable';
    setEditJobModal(m => m && ({
      ...m,
      data: {
        ...m.data,
        salary_type: st,
        // в state убираем null — только undefined
        salary: st === 'negotiable'
          ? undefined
          : (typeof m.data.salary === 'number'
              ? m.data.salary
              : Number(m.data.salary ?? 0)),
      }
    }));
  }}
>

          <option value="per hour">per hour</option>
          <option value="per month">per month</option>
          <option value="negotiable">negotiable</option>
        </select>
      </div>

      {/* Job type */}
      <div className="form-group">
        <label>Job Type</label>
        <select
          value={(editJobModal.data as any).job_type ?? ''}
          onChange={(e) =>
            setEditJobModal(m => m && ({
              ...m,
              data: { ...m.data, job_type: (e.target.value || undefined) as any }
            }))
          }
        >
          <option value="">Select job type</option>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Project-based">Project-based</option>
        </select>
      </div>

      {/* Categories (multi + autocomplete из локального списка) */}
      <div className="form-group">
        <label>Categories</label>
        <div className="pjx-auto">
          <input
            className="pjx-input pjx-auto-input"
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            placeholder="Start typing to search categories…"
            onFocus={() => setIsDropdownOpen(true)}
            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 150)}
          />
          {isDropdownOpen && (
            <ul className="pjx-dropdown">
              {filteredCats.map((c) => (
                <li key={c.id} className="pjx-item" onMouseDown={() => addCat(String(c.id))}>
                  {c.parent_id
                    ? `${(flattenCategories(categories).find(p => String(p.id) === String(c.parent_id))?.name) || '—'} > ${c.name}`
                    : c.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* chips выбранных категорий */}
        {Array.isArray(editJobModal.data.category_ids) && editJobModal.data.category_ids.length > 0 && (() => {
          const all = flattenedCategories;
          const chips = editJobModal.data.category_ids.map((id) => {
            const cat = all.find(c => String(c.id) === String(id));
            if (!cat) return { id, label: 'Unknown' };
            const parent = cat.parent_id ? all.find(p => String(p.id) === String(cat.parent_id)) : undefined;
            return { id, label: parent ? `${parent.name} > ${cat.name}` : cat.name };
          });
          return (
            <div className="pjx-chips" style={{ marginTop: 8 }}>
              {chips.map(({ id, label }) => (
                <span key={id} className="pjx-chip">
                  {label}
                  <button type="button" className="pjx-chip-x" onClick={() => removeCat(String(id))}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          );
        })()}
      </div>

      <div className="modal-actions">
        <button onClick={saveJobEdit} className="action-button success">Save</button>
        <button onClick={() => setEditJobModal(null)} className="action-button">Cancel</button>
      </div>
    </div>
  </div>
)}

{activeTab === 'Settings' && (
  <div>
    <h4>Settings</h4>

  

<section className="bo-card">
  <header className="bo-card__head">
    <h3 className="bo-card__title">Registration</h3>
  </header>

  <div className="bo-card__body">
    <div className="bo-grid">
      <div className="bo-row">
        <div className="bo-row__label">Require avatar on registration</div>
        <div className="bo-row__control">
          {/* не кладём кнопку внутрь label, чтобы она не перекрывалась */}
          <label className="bo-switch" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={!!regAvatarRequired}
              onChange={(e) => setRegAvatarRequired(e.target.checked)}
            />
            <span className="bo-switch__text">Enabled</span>
          </label>
        </div>
      </div>

      <div className="bo-row">
        <div className="bo-row__label" />
        <div className="bo-row__control">
          <button
            type="button"
            className="bo-btn bo-btn--success"
            disabled={regAvatarRequired === null || savingRegAvatar}
            onClick={async () => {
              setSavingRegAvatar(true);
              try {
                const { required } = await setAdminRegistrationAvatarRequired(!!regAvatarRequired);
                setRegAvatarRequired(required);
                alert('Saved.');
              } catch (e: any) {
                alert(e?.response?.data?.message || 'Failed to save.');
              } finally {
                setSavingRegAvatar(false);
              }
            }}
          >
            {savingRegAvatar ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  </div>
</section>

<section className="bo-card">
  <header className="bo-card__head">
    <h3 className="bo-card__title">Global Application Limit</h3>
  </header>

  <div className="bo-card__body">
    {fetchErrors.getGlobalApplicationLimit && (
      <p className="bo-msg bo-msg--err">{fetchErrors.getGlobalApplicationLimit}</p>
    )}

    <div className="bo-grid">
      <div className="bo-row">
        <div className="bo-row__label">Current limit</div>
        <div className="bo-row__control">
          <span className="bo-kv">{globalLimit !== null ? globalLimit : 'Not set'}</span>
        </div>
      </div>

      <div className="bo-row">
        <div className="bo-row__label" />
        <div className="bo-row__control">
          <button onClick={handleSetGlobalLimit} className="bo-btn bo-btn--primary">
            Set Global Limit
          </button>
        </div>
      </div>
    </div>
  </div>
</section>

{/* === Chat Notifications (Employer → Jobseeker) === */}
<section className="bo-card">
  <header className="bo-card__head">
    <h3 className="bo-card__title">Chat Notifications (Employer → Jobseeker)</h3>
  </header>

  <div className="bo-card__body">
    {fetchErrors.chatNotif && <p className="bo-msg bo-msg--err">{fetchErrors.chatNotif}</p>}
    {chatNotifLoading && <p className="bo-msg">Loading…</p>}

    {chatNotif && (
      <>
        {/* master toggle */}
        <div className="bo-block">
          <div className="bo-row bo-row--switch">
            <label className="bo-row__label">Enable notifications</label>
            <div className="bo-row__control">
              <label className="bo-switch">
                <input
                  type="checkbox"
                  checked={chatNotif.enabled}
                  onChange={(e) => updateCN(p => ({ ...p, enabled: e.target.checked }))}
                />
                <span className="bo-switch__slider" />
              </label>
            </div>
          </div>
        </div>

        {/* On employer message */}
        <fieldset className={`bo-subcard ${chatNotif.enabled ? '' : 'is-disabled'}`} disabled={!chatNotif.enabled}>
          <legend className="bo-subcard__legend">On employer message</legend>

          <div className="bo-grid">
            <div className="bo-row bo-row--switch">
              <label className="bo-row__label">Send immediately</label>
              <div className="bo-row__control">
                <label className="bo-switch">
                  <input
                    type="checkbox"
                    checked={chatNotif.onEmployerMessage.immediate}
                    onChange={(e) =>
                      updateCN(p => ({
                        ...p,
                        onEmployerMessage: { ...p.onEmployerMessage, immediate: e.target.checked },
                      }))
                    }
                  />
                  <span className="bo-switch__slider" />
                </label>
              </div>
            </div>

            <div className="bo-row bo-row--switch">
              <label className="bo-row__label">Delayed reminder if unread</label>
              <div className="bo-row__control bo-inline">
                <label className="bo-switch">
                  <input
                    type="checkbox"
                    checked={chatNotif.onEmployerMessage.delayedIfUnread.enabled}
                    onChange={(e) =>
                      updateCN(p => ({
                        ...p,
                        onEmployerMessage: {
                          ...p.onEmployerMessage,
                          delayedIfUnread: {
                            ...p.onEmployerMessage.delayedIfUnread,
                            enabled: e.target.checked,
                          },
                        },
                      }))
                    }
                  />
                  <span className="bo-switch__slider" />
                </label>

                <div className="bo-field">
                  <label className="bo-field__label">Minutes</label>
                  <input
                    className="bo-input bo-input--sm"
                    type="number"
                    min={1}
                    max={10080}
                    value={chatNotif.onEmployerMessage.delayedIfUnread.minutes}
                    disabled={
                      !chatNotif.enabled ||
                      !chatNotif.onEmployerMessage.delayedIfUnread.enabled
                    }
                    onChange={(e) => {
                      const n = clamp(parseInt(e.target.value || '0', 10) || 0, 1, 10080);
                      updateCN(p => ({
                        ...p,
                        onEmployerMessage: {
                          ...p.onEmployerMessage,
                          delayedIfUnread: { ...p.onEmployerMessage.delayedIfUnread, minutes: n },
                        },
                      }));
                    }}
                  />
                </div>
              </div>
            </div>


            {/* NEW: another email after N hours if unread */}
<div className="bo-row bo-row--switch">
  <label className="bo-row__label">Send another email after N hours if unread</label>
  <div className="bo-row__control bo-inline">
    <label className="bo-switch">
      <input
        type="checkbox"
        checked={!!chatNotif.onEmployerMessage.after24hIfUnread?.enabled}
        onChange={(e) =>
          updateCN(p => ({
            ...p,
            onEmployerMessage: {
              ...p.onEmployerMessage,
              after24hIfUnread: {
                ...(p.onEmployerMessage as any).after24hIfUnread,
                enabled: e.target.checked,
                hours: (p.onEmployerMessage as any).after24hIfUnread?.hours ?? 24,
              },
            },
          }))
        }
      />
      <span className="bo-switch__slider" />
    </label>

    <div className="bo-field">
      <label className="bo-field__label">Hours</label>
      <input
        className="bo-input bo-input--sm"
        type="number"
        min={1}
        max={168}
        value={(chatNotif.onEmployerMessage as any).after24hIfUnread?.hours ?? 24}
        disabled={
          !chatNotif.enabled ||
          !(chatNotif.onEmployerMessage as any).after24hIfUnread?.enabled
        }
        onChange={(e) => {
          const n = clamp(parseInt(e.target.value || '0', 10) || 0, 1, 168);
          updateCN(p => ({
            ...p,
            onEmployerMessage: {
              ...p.onEmployerMessage,
              after24hIfUnread: {
                ...(p.onEmployerMessage as any).after24hIfUnread,
                enabled: !!(p.onEmployerMessage as any).after24hIfUnread?.enabled,
                hours: n,
              },
            },
          }));
        }}
      />
    </div>
  </div>
</div>


            <div className="bo-row bo-row--switch">
              <label className="bo-row__label">Only first message in thread</label>
              <div className="bo-row__control">
                <label className="bo-switch">
                  <input
                    type="checkbox"
                    checked={chatNotif.onEmployerMessage.onlyFirstMessageInThread}
                    onChange={(e) =>
                      updateCN(p => ({
                        ...p,
                        onEmployerMessage: {
                          ...p.onEmployerMessage,
                          onlyFirstMessageInThread: e.target.checked,
                        },
                      }))
                    }
                  />
                  <span className="bo-switch__slider" />
                </label>
              </div>
            </div>
          </div>
        </fieldset>

{/* Throttle */}
<fieldset
  className={`bo-subcard ${chatNotif.enabled ? '' : 'is-disabled'}`}
  disabled={!chatNotif.enabled}
>
  <legend className="bo-subcard__legend">Throttle (per chat)</legend>

  <div className="bo-grid">
    <div className="bo-row">
      <label className="bo-row__label">Count</label>
      <div className="bo-row__control">
        <input
          className="bo-input bo-input--sm"
          type="number"
          min={1}
          max={100}
          value={chatNotif.throttle.perChatCount}
          onChange={(e) => {
            const n = clamp(parseInt(e.target.value || '0', 10) || 0, 1, 100);
            updateCN(p => ({ ...p, throttle: { ...p.throttle, perChatCount: n } }));
          }}
        />
      </div>
    </div>

    <div className="bo-row">
      <label className="bo-row__label">Per minutes</label>
      <div className="bo-row__control">
        <input
          className="bo-input bo-input--sm"
          type="number"
          min={1}
          max={10080}
          value={chatNotif.throttle.perMinutes}
          onChange={(e) => {
            const n = clamp(parseInt(e.target.value || '0', 10) || 0, 1, 10080);
            updateCN(p => ({ ...p, throttle: { ...p.throttle, perMinutes: n } }));
          }}
        />
      </div>
    </div>

    <div className="bo-row">
      <div className="bo-row__label" />
      <div className="bo-row__control">
        <p className="bo-note">
          Counts both immediate and delayed emails per single chat.
        </p>
      </div>
    </div>
  </div>
</fieldset>

{chatNotifWarning && (
  <p className="bo-msg bo-msg--warn" role="alert" aria-live="polite">
    {chatNotifWarning}
  </p>
)}

<div className="bo-actions">
  <button
    type="button"
    className="bo-btn bo-btn--success"
    onClick={saveChatNotif}
    disabled={chatNotifSaving}
  >
    {chatNotifSaving ? 'Saving…' : 'Save'}
  </button>

  <button
    type="button"
    className="bo-btn"
    onClick={loadChatNotif}
    disabled={chatNotifLoading || chatNotifSaving}
  >
    Reset
  </button>
</div>

      </>
    )}
  </div>
</section>

    </div>
  
)}


{showDocumentModal && (
        <div className="modal" onClick={() => setShowDocumentModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close" onClick={() => setShowDocumentModal(null)}>×</span>
            <img src={showDocumentModal} alt="Identity Document" className="modal-image" />
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
    </div>
  );
};

export default AdminDashboard;
