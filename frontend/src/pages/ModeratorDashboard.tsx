// ModeratorDashboard.tsx
import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { startOfWeek, endOfWeek, subDays, format, formatDistanceToNow } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { FaHome, FaSignOutAlt, FaUser, FaSearch, FaArrowUp, FaArrowDown, FaCopy } from 'react-icons/fa';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { useRole } from '../context/RoleContext';
import Loader from '../components/Loader';
import sanitizeHtml from 'sanitize-html';
import '../styles/admin-settings.css';
import '../styles/post-job.css';
import { toast } from '../utils/toast';


// import ExportUsersPopover from '../components/ExportUsersPopover'; // ❌ недоступно модератору
import {
  // === USERS ===
  getAllUsers,
  getUserById,
  // updateUser, // ❌
  // deleteUser, // ❌
  resetUserPassword,
  // blockUser, // ❌
  // unblockUser, // ❌
  getUserRiskScore,
  exportUsersToCSV,
  getUserOnlineStatus,

  // === JOB POSTS ===
  getAllJobPosts,
  // updateJobPostAdmin, // ❌
  // deleteJobPostAdmin, // ❌
  approveJobPost,
  flagJobPost,
  rejectJobPost,
  // setJobPostApplicationLimitAdmin, // ❌
  // notifyCandidates, // ❌
  // notifyReferralApplicants, // ❌

  // === REVIEWS ===
  getAdminReviews,
  approveReview,
  rejectReview,
  deleteReview,

  // === FEEDBACK ===
  getPlatformFeedback,
  publishPlatformFeedback,
  unpublishPlatformFeedback,
  deletePlatformFeedback,

  // === ANALYTICS ===
  getAnalytics,
  getRegistrationStats,
  getGeographicDistribution,
  getTopJobseekersByViews,
  getGrowthTrends,
  getRecentRegistrationsToday,
  getBrandsAnalytics,
  getJobPostsWithApplications,
  getOnlineUsers,

  // === REFERRAL LINKS ===
  createReferralLink,
  getReferralLinks,
  getReferralLinksByJob,
  updateReferralLink,
  deleteReferralLink,
  createSiteReferralLink,
  getSiteReferralLinks,
  updateSiteReferralLink,
  deleteSiteReferralLink,

  // === AUTH / UTILS ===
  logout,
  getJobPost,
  getUserProfileById,
  getChatHistory, // ❌ (но оставлен импорт для типов)

  // ❌ Категории, Blocked Countries, Complaints, Settings — НЕ импортируем
} from '../services/api';

import { User, JobPost, Review, PlatformFeedbackAdminItem, PaginatedResponse, JobSeekerProfile } from '@types';
import { AxiosError } from 'axios';
import '../styles/referral-links.css';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface ReferralRegistration {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    created_at: string;
  };
}

interface JobReferralLink {
  id: string;
  jobPostId: string;
  fullLink: string;
  shortLink?: string;
  description?: string | null;
  clicks: number;
  registrations: number;
  registrationsVerified: number;
  job_post?: { id: string; title: string };
  registrationsDetails?: ReferralRegistration[];
}

interface SiteReferralLink {
  id: string;
  shortLink: string;
  description?: string | null;
  clicks: number;
  registrations: number;
  registrationsVerified: number;
  landingPath?: string | null;
  createdByAdmin?: { id: string; username: string } | null;
  registrationsDetails?: ReferralRegistration[];
}

interface SiteReferralGroup {
  adminName: string;
  links: SiteReferralLink[];
}

// Типы (аналогично админке)
interface OnlineUsers {
  jobseekers: number;
  employers: number;
}
type AdminRecentUser = {
  id: string;
  email: string;
  username: string;
  role: string;
  created_at: string;
  referral_link_scope?: 'job' | 'site' | null;
  referral_from_signup?: string | null;
  referral_link_description?: string | null;
  referral_job?: { id: string; title: string } | null;
};
type AdminRecentRegistrationsDTO = {
  date?: string;
  tzOffset?: number;
  jobseekers_total?: number;
  employers_total?: number;
  jobseekers: AdminRecentUser[];
  employers: AdminRecentUser[];
};

interface DecodedToken {
  email: string;
  sub: string;
  role: 'employer' | 'jobseeker' | 'admin' | 'moderator';
  username?: string;
  iat: number;
  exp: number;
}


const shortenReferralUrl = (url: string, max = 45) => {
  if (!url) return '';
  if (url.length <= max) return url;
  try {
    const u = new URL(url);
    const path = u.pathname || '/';
    const slice = path.slice(0, 20).replace(/\/$/, '');
    return `${u.origin}${slice}...`;
  } catch {
    return `${url.slice(0, max)}...`;
  }
};

const ModeratorDashboard: React.FC = () => {
  const { currentRole, socket } = useRole();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [userTotal, setUserTotal] = useState<number>(0);
  const [jobStatusFilter, setJobStatusFilter] = useState<'All' | 'Active' | 'Draft' | 'Closed'>('All');
  const [selectedInterval, setSelectedInterval] = useState<'day' | 'week' | 'month'>('month');
const handleReferralForPost = (id: string) => {
  openCreateReferralModal(id);
};
  // BRAND ANALYTICS
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [brandsRange, setBrandsRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [brandsData, setBrandsData] = useState<{
    range: { startDate: string; endDate: string };
    byBrand: Array<{ brand: string; total: number; employers: number; jobseekers: number }>;
    overall: { total: number; employers: number; jobseekers: number };
  } | null>(null);

  // FEEDBACK TABS
  const [fbSubtab, setFbSubtab] = useState<'tech' | 'platform'>('platform'); // tech недоступен → сразу platform

  // PLATFORM FEEDBACK PAGINATION
  const [pfPage, setPfPage] = useState(1);
  const [pfLimit, setPfLimit] = useState(40);
  const [pfTotal, setPfTotal] = useState(0);
  const pfTotalPages = Math.max(1, Math.ceil(pfTotal / pfLimit));

  // REVIEWS
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewLimit, setReviewLimit] = useState(10);
  const [reviewStatus, setReviewStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const reviewTotalPages = Math.max(1, Math.ceil(reviewsTotal / reviewLimit));

  // STORIES
  const [stories, setStories] = useState<PlatformFeedbackAdminItem[]>([]);

  // ANALYTICS
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
  const [freelancerSignupsToday, setFreelancerSignupsToday] = useState<{ country: string; count: number }[]>([]);
  const [freelancerSignupsYesterday, setFreelancerSignupsYesterday] = useState<{ country: string; count: number }[]>([]);
  const [freelancerSignupsWeek, setFreelancerSignupsWeek] = useState<{ country: string; count: number }[]>([]);
  const [freelancerSignupsMonth, setFreelancerSignupsMonth] = useState<{ country: string; count: number }[]>([]);
  const [businessSignupsToday, setBusinessSignupsToday] = useState<{ country: string; count: number }[]>([]);
  const [businessSignupsYesterday, setBusinessSignupsYesterday] = useState<{ country: string; count: number }[]>([]);
  const [businessSignupsWeek, setBusinessSignupsWeek] = useState<{ country: string; count: number }[]>([]);
  const [businessSignupsMonth, setBusinessSignupsMonth] = useState<{ country: string; count: number }[]>([]);
  const [topJobseekersByViews, setTopJobseekersByViews] = useState<{ userId: string; username: string; email: string; profileViews: number }[]>([]);
  const [growthTrends, setGrowthTrends] = useState<{
    registrations: { period: string; count: number }[];
    jobPosts: { period: string; count: number }[];
  }>({ registrations: [], jobPosts: [] });

  // JOB POSTS
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [jobPostsWithApps, setJobPostsWithApps] = useState<any[]>([]); // тип упрощён

  // REFERRAL LINKS
  const [refSubTab, setRefSubTab] = useState<'job' | 'site'>('job');
const [referralLinks, setReferralLinks] = useState<JobReferralLink[]>([]);
const [siteReferrals, setSiteReferrals] = useState<SiteReferralLink[]>([]);
  const [referralFilterJobId, setReferralFilterJobId] = useState('');
  const [referralFilterJobTitle, setReferralFilterJobTitle] = useState('');
  const [siteQ, setSiteQ] = useState('');
  const [siteCreatedByAdminId, setSiteCreatedByAdminId] = useState('');
  const [siteExpandedAdmin, setSiteExpandedAdmin] = useState<Record<string, boolean>>({});
  const [siteExpandedLinkId, setSiteExpandedLinkId] = useState<string | null>(null);
  const [jobExpanded, setJobExpanded] = useState<Record<string, boolean>>({});
  const [jobExpandedLinkId, setJobExpandedLinkId] = useState<string | null>(null);
  const [expandedReferral, setExpandedReferral] = useState<string | null>(null);
  const [showReferralModal, setShowReferralModal] = useState<{
    fullLink: string;
    clicks: number;
    registrations: number;
    registrationsVerified?: number;
  } | null>(null);
  const [createReferralForJobId, setCreateReferralForJobId] = useState<string | null>(null);
  const [newReferralDescription, setNewReferralDescription] = useState<string>('');
  const [creatingSite, setCreatingSite] = useState(false);
  const [newSiteDescription, setNewSiteDescription] = useState('');
  const [newSiteLandingPath, setNewSiteLandingPath] = useState('');
  const [showSiteCreatedModal, setShowSiteCreatedModal] = useState<{
    shortLink: string;
    description?: string | null;
    landingPath?: string | null;
  } | null>(null);

  // MODALS
  const [showJobModal, setShowJobModal] = useState<string | null>(null);
  const [storyDetails, setStoryDetails] = useState<PlatformFeedbackAdminItem | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string | null; title?: string }>({ id: null, title: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskScoreData, setRiskScoreData] = useState<any>(null);
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});
  const [onlineUsers, setOnlineUsers] = useState<OnlineUsers | null>(null);
  const [recentRegistrations, setRecentRegistrations] = useState<AdminRecentRegistrationsDTO>({
    date: '',
    tzOffset: -new Date().getTimezoneOffset(),
    jobseekers_total: 0,
    employers_total: 0,
    jobseekers: [],
    employers: [],
  });

  // PAGINATION
  const [userPage, setUserPage] = useState(1);
  const [userLimit] = useState(30);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [jobPostPage, setJobPostPage] = useState(1);
  const [jobPostLimit] = useState(50);
  const [jobPostsWithAppsPage, setJobPostsWithAppsPage] = useState(1);
  const [jobPostsWithAppsLimit] = useState(10);
  const [sortColumn, setSortColumn] = useState<'id' | 'applicationCount' | 'created_at' | null>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [userSortColumn, setUserSortColumn] = useState<'id' | 'role' | 'is_blocked' | 'brand' | null>(null);
  const [userSortDirection, setUserSortDirection] = useState<'asc' | 'desc'>('asc');

  // SEARCH
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [jobPostSearchQuery, setJobPostSearchQuery] = useState<string>('');
  const [username, setUsername] = useState<string>('Moderator');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // UTILS
  const getBrand = (u: User) => (u as any)?.brand ?? (u as any)?.siteBrand ?? '—';
  const toU = <T,>(v: T | null | undefined): T | undefined => v === null ? undefined : v;
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove();
    }
  };

  // SORTING
  const handleSort = (column: 'id' | 'applicationCount' | 'created_at') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  const handleUserSort = (column: 'id' | 'role' | 'is_blocked' | 'brand') => {
    if (userSortColumn === column) {
      setUserSortDirection(userSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setUserSortColumn(column);
      setUserSortDirection('asc');
    }
  };

  // MODAL HANDLERS
  const openRejectModal = (id: string, title?: string) => {
    setRejectModal({ id, title });
    setRejectReason('');
  };
  const closeRejectModal = () => {
    setRejectModal({ id: null, title: '' });
    setRejectReason('');
  };
  const renderDateCell = (iso?: string | null) => {
    if (!iso) return 'no info';
    const d = new Date(iso);
    const full = format(d, 'PP p');
    const human = formatDistanceToNow(d, { addSuffix: true });
    return <span title={human}>{full}</span>;
  };

  // REFERRAL HELPERS
  const toggleJobGroup = (jobId: string) => setJobExpanded(prev => ({ ...prev, [jobId]: !prev[jobId] }));
  const toggleSiteGroup = (aid: string) => setSiteExpandedAdmin(prev => ({ ...prev, [aid]: !prev[aid] }));

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

  const fetchSiteReferrals = React.useCallback(async () => {
    try {
      const data = await getSiteReferralLinks({
        q: siteQ.trim() || undefined,
        createdByAdminId: siteCreatedByAdminId.trim() || undefined,
      });
      setSiteReferrals(data || []);
    } catch (e: any) {
      console.error('Failed to load site referrals', e?.response?.data?.message || e?.message);
      setSiteReferrals([]);
      alert(e?.response?.data?.message || 'Failed to load site referrals.');
    }
  }, [siteQ, siteCreatedByAdminId]);

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
      await fetchSiteReferrals();
      setNewSiteDescription('');
      setNewSiteLandingPath('');
    } catch (e: any) {
      console.error('Failed to create site referral', e?.response?.data?.message || e?.message);
      toast.error(e?.response?.data?.message || 'Failed to create site referral link.');
    } finally {
      setCreatingSite(false);
    }
  };

  const handleEditSiteReferral = async (id: string, current?: string | null) => {
    const next = window.prompt('Edit description (optional):', current || '');
    if (next === null) return;
    try {
      const { description } = await updateSiteReferralLink(id, { description: next || undefined });
      setSiteReferrals(prev => prev.map(l => l.id === id ? { ...l, description } : l));
    } catch (e: any) {
      console.error('Failed to update site referral', e?.response?.data?.message || e?.message);
      toast.error(e?.response?.data?.message || 'Failed to update site referral.');
    }
  };

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

  // API CALLS
  const loadPlatform = useCallback(async () => {
    try {
      const res = await getPlatformFeedback({ page: pfPage, limit: pfLimit });
      setStories(res.data || []);
      setPfTotal(res.total || 0);
    } catch {
      setStories([]);
      setPfTotal(0);
    }
  }, [pfPage, pfLimit]);

  const loadReviews = useCallback(async () => {
    const params: { page: number; limit: number; status?: 'Pending'|'Approved'|'Rejected' } = {
      page: reviewPage,
      limit: reviewLimit,
    };
    if (reviewStatus !== 'All') params.status = reviewStatus;
    try {
      const res = await getAdminReviews(params);
      setReviews((res.data ?? []).map((r: any) => ({ ...r, job_application_id: r.job_application_id ?? undefined })) as Review[]);
      setReviewsTotal(res.total ?? 0);
    } catch (e) {
      setReviews([]);
      setReviewsTotal(0);
    }
  }, [reviewPage, reviewLimit, reviewStatus]);

  const buildUserSearch = (page = userPage, s: string = userSearchQuery) => {
    const q: any = { page, limit: userLimit };
    const term = s.trim();
    if (!term) return q;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(term)) q.id = term;
    else if (term.includes('@')) q.email = term;
    else q.username = term;
    return q;
  };

  const fetchUsers = useCallback(async (params: any = {}) => {
    if (!currentRole || currentRole !== 'moderator') return;
    try {
      setIsUsersLoading(true);
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

      const statuses = await Promise.all(
        userData.map(u => getUserOnlineStatus(u.id).catch(() => ({ isOnline:false })))
      );
      setOnlineStatuses(userData.reduce((acc, u, i) => {
        acc[u.id] = statuses[i].isOnline; return acc;
      }, {} as Record<string, boolean>));
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || 'Failed to load users data');
    } finally {
      setIsUsersLoading(false);
    }
  }, [currentRole, userPage, userLimit]);

  const fetchJobPosts = useCallback(async (params: any = {}) => {
    try {
      setIsLoading(true);
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
      setError(axiosError.response?.data?.message || 'Failed to load job posts.');
    } finally {
      setIsLoading(false);
    }
  }, [jobPostPage, jobPostLimit]);

  const fetchOtherData = async () => {
    if (!currentRole || currentRole !== 'moderator') return;
    try {
      setIsLoading(true);
      const tzOffset = -new Date().getTimezoneOffset();
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const monthStart = format(subDays(new Date(), 29), 'yyyy-MM-dd');
      const monthEnd = today;

      const requests = [
        getAllJobPosts({ page: jobPostPage, limit: jobPostLimit }),
        getPlatformFeedback(),
        getAnalytics(),
        getRegistrationStats({ startDate:'2023-01-01', endDate:new Date().toISOString().split('T')[0], interval:selectedInterval }),
        getGeographicDistribution({ role:'jobseeker', startDate: today, endDate: today, tzOffset }),
        getGeographicDistribution({ role:'jobseeker', startDate: yesterday, endDate: yesterday, tzOffset }),
        getGeographicDistribution({ role:'jobseeker', startDate: weekStart, endDate: weekEnd, tzOffset }),
        getGeographicDistribution({ role:'jobseeker', startDate: monthStart, endDate: monthEnd, tzOffset }),
        getGeographicDistribution({ role:'employer',  startDate: today, endDate: today, tzOffset }),
        getGeographicDistribution({ role:'employer',  startDate: yesterday, endDate: yesterday, tzOffset }),
        getGeographicDistribution({ role:'employer',  startDate: weekStart, endDate: weekEnd, tzOffset }),
        getGeographicDistribution({ role:'employer',  startDate: monthStart, endDate: monthEnd, tzOffset }),
        getTopJobseekersByViews(5),
        getGrowthTrends({ period: '30d' }),
        getRecentRegistrationsToday({ tzOffset, limit: 5 }),
        getJobPostsWithApplications(),
        getBrandsAnalytics({ startDate: brandsRange.startDate, endDate: brandsRange.endDate }),
        getOnlineUsers(),
      ];

      const results = await Promise.allSettled(requests);
      const endpoints = [
        'getAllJobPosts',
        'getPlatformFeedback',
        'getAnalytics',
        'getRegistrationStats',
        'freelancerSignupsToday',
        'freelancerSignupsYesterday',
        'freelancerSignupsWeek',
        'freelancerSignupsMonth',
        'businessSignupsToday',
        'businessSignupsYesterday',
        'businessSignupsWeek',
        'businessSignupsMonth',
        'getTopJobseekersByViews',
        'getGrowthTrends',
        'getRecentRegistrations',
        'getJobPostsWithApplications',
        'getBrandsAnalytics',
        'getOnlineUsers',
      ];

      for (const [index, result] of results.entries()) {
        if (result.status === 'fulfilled') {
          const value = result.value as any;
          switch (index) {
            case 0: setJobPosts((value as any).data || []); break;
            case 1: setStories((value as any).data || []); break;
            case 2: setAnalytics(value); break;
            case 3: setRegistrationStats(value || []); break;
            case 4: setFreelancerSignupsToday(value || []); break;
            case 5: setFreelancerSignupsYesterday(value || []); break;
            case 6: setFreelancerSignupsWeek(value || []); break;
            case 7: setFreelancerSignupsMonth(value || []); break;
            case 8: setBusinessSignupsToday(value || []); break;
            case 9: setBusinessSignupsYesterday(value || []); break;
            case 10: setBusinessSignupsWeek(value || []); break;
            case 11: setBusinessSignupsMonth(value || []); break;
            case 12: setTopJobseekersByViews(value || []); break;
            case 13: setGrowthTrends(value || {registrations:[], jobPosts:[]}); break;
            case 14:
              try {
                const data = await getRecentRegistrationsToday({ limit: 5 });
                setRecentRegistrations(data as AdminRecentRegistrationsDTO);
              } catch { /* noop */ }
              break;
            case 15:
              const postsWithApps = (value as any).map((post: any) => ({
                ...post,
                username: post.employer?.username || 'N/A',
                category: typeof post.category === 'string' ? post.category : post.category?.name || 'N/A',
              }));
              setJobPostsWithApps(postsWithApps);
              const referralData = await getReferralLinks({});
              setReferralLinks(referralData || []);
              break;
            case 16: setBrandsData(value); break;
            case 17: setOnlineUsers(value || null); break;
          }
        }
      }
    } catch (error) {
      console.error('Unexpected error fetching other data:', error);
      setError('Unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // EFFECTS
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        setUsername(decoded.username || 'Moderator');
      } catch (error) {
        console.error('Error decoding token:', error);
        setUsername('Moderator');
      }
    }
  }, []);

  useEffect(() => {
    if (currentRole === 'moderator') {
      fetchOtherData();
      fetchJobPosts();
      fetchUsers(buildUserSearch(userPage));
    }
  }, [currentRole]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'Referral Links' && refSubTab === 'site') {
      fetchSiteReferrals();
    }
  }, [activeTab, refSubTab, fetchSiteReferrals]);

  useEffect(() => {
    if (activeTab === 'Feedback') loadPlatform();
    if (activeTab === 'Reviews') loadReviews();
  }, [activeTab, loadPlatform, loadReviews]);

  // ACTIONS
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

  const handleDeleteUser = (_id: string) => {
    // ❌ недоступно модератору — закомментировано
    // alert('Not allowed for moderators');
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

  const handleViewRiskScore = async (id: string) => {
    try {
      const data = await getUserRiskScore(id);
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

  const handleDeleteJobPost = (_id: string) => {
    // ❌ недоступно модератору
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

  const handleApproveReview = async (id: string) => {
    try {
      await approveReview(id);
      await loadReviews();
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
      await loadReviews();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to delete review.');
    }
  };

  // RENDER
  if (isLoading) {
    return (
      <div>
        <div className="backoffice-header">
          <div className="backoffice-title" onClick={handleBackofficeClick}>MODERATOR<span>OFFICE</span></div>
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
          <div className="sidebar"></div>
          <div className="main-content">
            <div className="content">
              <h2>Moderator Dashboard</h2>
              <Loader />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentRole || currentRole !== 'moderator') {
    return (
      <div>
        <div className="backoffice-header">
          <div className="backoffice-title" onClick={handleBackofficeClick}>MODERATOR<span>OFFICE</span></div>
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
          <div className="sidebar"></div>
          <div className="main-content">
            <div className="content">
              <h2>Moderator Dashboard</h2>
              <p>This page is only available for moderators.</p>
            </div>
            <Footer />
            <Copyright />
          </div>
        </div>
      </div>
    );
  }

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

  const paginatedJobPostsWithApps = sortedJobPostsWithApps.slice(
    (jobPostsWithAppsPage - 1) * jobPostsWithAppsLimit,
    jobPostsWithAppsPage * jobPostsWithAppsLimit
  );

  const usersToRender = sortedUsers;

  const selectedJob = jobPosts.find(post => post.id === showJobModal);
const safeDescription = sanitizeHtml(selectedJob?.description ?? '', {
  allowedTags: ['p','br','strong','em','u','ul','ol','li','a','blockquote','code','pre','h1','h2','h3','h4','h5','h6','span','img'],
  allowedAttributes: {
    a: ['href','target','rel'],
    img: ['src','alt']
  },
  allowedSchemes: ['http','https','mailto'],
  // Убираем transformTags — вместо этого добавим rel/target через allowedAttributes + post-processing
});

  return (
    <div>
      <div className="backoffice-header">
        <div className="backoffice-title" onClick={handleBackofficeClick}>MODERATOR<span>OFFICE</span></div>
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
            <li className={activeTab === 'Analytics' ? 'active' : ''} onClick={() => setActiveTab('Analytics')}>
              Analytics
            </li>
            <li className={activeTab === 'Referral Links' ? 'active' : ''} onClick={() => setActiveTab('Referral Links')}>
              Referral Links
            </li>
            {/* ❌ Удалены: Categories, Blocked Countries, Complaints, Chat History, Email Notifications, Settings */}
          </ul>
        </div>
        <div className="main-content">
          <div className="content">
            {activeTab === 'Dashboard' && (
              <div>
                <h4>Dashboard</h4>
                <div className="dashboard-section">
                  <h3>Online Users</h3>
                  <p><strong>Freelancers Online:</strong> {onlineUsers?.jobseekers ?? 'N/A'}</p>
                  <p><strong>Businesses Online:</strong> {onlineUsers?.employers ?? 'N/A'}</p>
                </div>
                <div className="dashboard-section">
                  <h3>Recent Registrations</h3>
                  {/* ... аналогично админке ... */}
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
                        {/* ❌ Столбец Notifications удалён */}
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
                               {(post.categories as string[]).slice(1).map((name: string, idx: number) => (
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
                {/* ❌ ExportUsersPopover удалён */}
                <div className="search_users" style={{ marginBottom: '10px' }}>
                  <input
                    type="text"
                    placeholder="Search by username, email or ID"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        fetchUsers(buildUserSearch(1, userSearchQuery));
                        if (userPage !== 1) setUserPage(1);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      fetchUsers(buildUserSearch(1, userSearchQuery));
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
                          {/* ❌ Delete удалена */}
                          <button onClick={() => handleResetPassword(user.id)} className="action-button">
                            Reset Password
                          </button>
                          {/* ❌ Verify Identity, Block/Unblock — недоступны */}
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
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Employer</th>
                      <th>Status</th>
                      <th className="col--pending">Pending Review</th>
                      <th>Created At</th>
                      <th>Actions</th>
                      {/* ❌ Столбец Notifications удалён */}
                    </tr>
                  </thead>
                  <tbody>
                    {jobPosts.length > 0 ? jobPosts
                      .filter(post => jobStatusFilter === 'All' || post.status === jobStatusFilter)
                      .map((post) => (
                        <tr key={post.id}>
                          <td>{post.title}</td>
                          <td>{post.employer?.username || 'N/A'}</td>
                          <td>{post.status}</td>
                          <td className="col--pending">{post.pending_review ? 'Yes' : 'No'}</td>
                          <td>{format(new Date(post.created_at), 'PP')}</td>
                          <td>
                            {/* ❌ Delete и Edit удалены */}
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
                            {/* ❌ Edit удалена */}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6}>No job posts found.</td>
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
              </div>
            )}

            {activeTab === 'Reviews' && (
              <div>
                <h4>Reviews</h4>
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
                <div className="tabs" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {/* ❌ Tech Feedback недоступен — только Platform */}
                  <button className={`action-button ${fbSubtab === 'platform' ? 'success' : ''}`} onClick={() => setFbSubtab('platform')}>Platform Feedback (Stories)</button>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label>Per page:</label>
                    <select value={pfLimit} onChange={(e) => { setPfLimit(parseInt(e.target.value, 10)); setPfPage(1); }}>
                      {[10,20,30,40,50,100].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
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
                          <th>Created At</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stories.length > 0 ? stories.map((story) => (
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

            {activeTab === 'Analytics' && (
              <div>
                <h4>Analytics</h4>
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
                        <p><strong>Total Users:</strong> {analytics.employers + analytics.jobSeekers}</p>
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
                    {growthTrends.registrations.length > 0 ? growthTrends.registrations.map((stat, index) => (
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
                    {growthTrends.jobPosts.length > 0 ? growthTrends.jobPosts.map((stat, index) => (
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
                <h4>Top Jobseekers by Profile Views</h4>
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

            {activeTab === 'Referral Links' && (
              <div className="ref-links">
                <div className="ref-links__head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 className="ref-links__title">Referral Links</h4>
                </div>
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
                      interface JobReferralGroup {
  jobId: string;
  title: string;
  links: JobReferralLink[];
  totals: { clicks: number; registrations: number; verified: number };
}
const groups: Record<string, JobReferralGroup> = {};
                      for (const l of referralLinks) {
                        const jobId = l.job_post?.id || l.jobPostId || 'unknown';
                        const title = l.job_post?.title || 'Untitled job';
                        if (!groups[jobId]) {
                          groups[jobId] = { jobId, title, links: [], totals: { clicks: 0, registrations: 0, verified: 0 } };
                        }
                        groups[jobId].links.push(l);
                        groups[jobId].totals.clicks += Number(l.clicks ?? 0);
                        groups[jobId].totals.registrations += Number(l.registrations ?? 0);
                        groups[jobId].totals.verified += Number(l.registrationsVerified ?? 0);
                      }
                      return Object.keys(groups).map((jid) => {
                        const g = groups[jid];
                        const opened = !!jobExpanded[jid];
                        return (
                          <section key={jid} className={`ref-links__job ${opened ? 'is-open' : ''}`}>
                            <header className="ref-links__job-head" onClick={() => toggleJobGroup(jid)}>
                              <div className="ref-links__job-title">
                                <span className="ref-links__chev">{opened ? '▼' : '►'}</span>
                                <span className="ref-links__job-name">{g.title}</span>
                                <span className="ref-links__count">({g.links.length})</span>
                              </div>
                              <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
                                <span className="ref-links__kv">Clicks: <b>{g.totals.clicks}</b></span>
                                <span className="ref-links__kv">Regs: <b>{g.totals.registrations}</b></span>
                                <span className="ref-links__kv">Verified: <b>{g.totals.verified}</b></span>
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
                                        <th>Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {g.links.map((link: any) => (
                                        <React.Fragment key={link.id}>
                                          <tr>
                                            <td className="ref-links__desc">{link.description || <i>—</i>}</td>
                                            <td className="ref-links__url">
                                              <span title={link.fullLink || link.shortLink} className="ref-links__url-text">
                                                {shortenReferralUrl(link.shortLink || link.fullLink)}
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
                                              <button
                                                type="button"
                                                className="ref-links__btn ref-links__btn--primary"
                                                onClick={() => setJobExpandedLinkId(jobExpandedLinkId === link.id ? null : link.id)}
                                              >
                                                {jobExpandedLinkId === link.id ? 'Hide regs' : 'View regs'}
                                              </button>
                                            </td>
                                          </tr>
                                          {jobExpandedLinkId === link.id && (
                                            <tr className="ref-links__expand">
                                              <td colSpan={6}>
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
                                                        {link.registrationsDetails?.length ? (
                                                          link.registrationsDetails.map((r: any, i: number) => (
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
                )}
                {refSubTab === 'site' && (
                  <div className="ref-links__site">
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
                          {/* ❌ Only me — не нужно */}
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
                    <div style={{ marginTop: 16 }}>
                      {(() => {
                        const groups: Record<string, SiteReferralGroup> = {};
                        for (const l of siteReferrals) {
                          const aid = l.createdByAdmin?.id || 'unknown';
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
                                  <span className="ref-links__chev">{opened ? '▼' : '►'}</span>
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
                                                <td colSpan={7}>
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

            {/* MODALS */}
            {showJobModal && selectedJob && (
              <div className="modal is-admin-jobpost">
                <div className="modal-content">
                  <span className="close" onClick={() => setShowJobModal(null)}>×</span>
                  <h3 className='job-post-details'>Job Post Details</h3>
                  <p><strong>Title:</strong> {selectedJob.title}</p>
                  <p><strong>Description:</strong></p>
                  <div className="job-modal__richtext" dangerouslySetInnerHTML={{ __html: safeDescription }} />
                  {selectedJob.pending_review && (
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
                    <div style={{ whiteSpace: 'pre-wrap' }}>{storyDetails.story}</div>
                  </div>
                  <div className="modal-actions" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
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
        </div>
      </div>
    </div>
  );
};

export default ModeratorDashboard;