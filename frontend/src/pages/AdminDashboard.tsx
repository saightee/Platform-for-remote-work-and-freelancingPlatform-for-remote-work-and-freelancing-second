import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, format, formatDistanceToNow } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz'; // Для времени по Маниле
import { FaHome, FaSignOutAlt, FaUser, FaSearch, FaArrowUp, FaArrowDown, FaFilePdf, FaLink, FaCopy } from 'react-icons/fa'; // Иконки
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
import {
  getAllUsers, getUserById, updateUser, deleteUser, resetUserPassword,
  getAllJobPosts, updateJobPostAdmin, deleteJobPostAdmin, approveJobPost, flagJobPost,
  setJobPostApplicationLimitAdmin, getAllReviews, deleteReview, getAnalytics,
  getRegistrationStats, getGeographicDistribution, getTopEmployers, getTopJobseekers,
  verifyIdentity, setGlobalApplicationLimit, getGlobalApplicationLimit,
  addBlockedCountry, removeBlockedCountry, getBlockedCountries, getFeedback,
  blockUser, unblockUser, getUserRiskScore, exportUsersToCSV, getUserOnlineStatus,
  getCategories, createCategory, getOnlineUsers, getRecentRegistrations, getJobPostsWithApplications,
  getTopJobseekersByViews, getTopEmployersByPosts, getGrowthTrends, getComplaints,
  resolveComplaint, getChatHistory, notifyCandidates, getApplicationsForJobPost, getJobApplicationById, getJobPost, getUserProfileById,
  logout, getAdminCategories, deletePlatformFeedback, JobPostWithApplications, getPlatformFeedback, deleteCategory, rejectJobPost, getEmailStatsForJob, getAllEmailStats, createReferralLink, getReferralLinks, getReferralLinksByJob, updateReferralLink, deleteReferralLink,  publishPlatformFeedback, unpublishPlatformFeedback, getChatNotificationSettings,
  updateChatNotificationSettings,
  notifyReferralApplicants, api
  // Добавляем logout из api
} from '../services/api';
import type { User, JobPost, Review, Feedback, BlockedCountry, Category, PaginatedResponse, JobApplicationDetails, JobSeekerProfile, PlatformFeedbackAdminItem, PlatformFeedbackList, ChatNotificationsSettings } from '@types';
import { AxiosError } from 'axios';
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
  jobseekers: { id: string; email: string; username: string; role: string; created_at: string }[];
  employers: { id: string; email: string; username: string; role: string; created_at: string }[];
}

interface DecodedToken {
  email: string;
  sub: string;
  role: 'employer' | 'jobseeker' | 'admin' | 'moderator';
  username?: string;
  iat: number;
  exp: number;
}


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


const AdminDashboard: React.FC = () => {
  const { currentRole, socket } = useRole();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [showDocumentModal, setShowDocumentModal] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userTotal, setUserTotal] = useState<number>(0);
  const [jobStatusFilter, setJobStatusFilter] = useState<'All' | 'Active' | 'Draft' | 'Closed'>('All');
  const [selectedInterval, setSelectedInterval] = useState<'day' | 'week' | 'month'>('month');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Resolved' | 'Rejected'>('All');
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [jobPostsWithApps, setJobPostsWithApps] = useState<JobPostWithApplications[]>([]);
  const [jobApplications, setJobApplications] = useState<JobApplicationDetails[]>([]);
  const [selectedJobPostId, setSelectedJobPostId] = useState<string>('');
  const [reviews, setReviews] = useState<Review[]>([]);
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
  const [recentRegistrations, setRecentRegistrations] = useState<RecentRegistrations>({ jobseekers: [], employers: [] });
  const [globalLimit, setGlobalLimit] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchJobId, setSearchJobId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [riskScoreData, setRiskScoreData] = useState<{ userId: string; riskScore: number; details: { duplicateIp: boolean; proxyDetected: boolean; duplicateFingerprint: boolean } } | null>(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [onlineStatuses, setOnlineStatuses] = useState<{ [key: string]: boolean }>({});
  const [fetchErrors, setFetchErrors] = useState<{ [key: string]: string }>({});
  const notifyJob = jobPosts.find(p => p.id === notifyJobPostId);
const [userPage, setUserPage] = useState(1);
const [userLimit] = useState(30);
const [isUsersLoading, setIsUsersLoading] = useState(false);
const [jobPostPage, setJobPostPage] = useState(1);
const [jobPostLimit] = useState(10);
const [jobPostsWithAppsPage, setJobPostsWithAppsPage] = useState(1);
const [jobPostsWithAppsLimit] = useState(10);
const [sortColumn, setSortColumn] = useState<'id' | 'applicationCount' | 'created_at' | null>('created_at'); 
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Изменено: дефолт 'desc' для новых сверху
const [userSortColumn, setUserSortColumn] = useState<'id' | 'role' | 'is_blocked' | null>(null);
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
const [showNotifyModal, setShowNotifyModal] = useState(false);
const [notifyJobPostId, setNotifyJobPostId] = useState<string>('');
const [notifyLimit, setNotifyLimit] = useState<string>('10');
const [notifyOrderBy, setNotifyOrderBy] = useState<'beginning' | 'end' | 'random'>('beginning');
const [username, setUsername] = useState<string>('Admin');
  const [onlineEmployers, setOnlineEmployers] = useState<number | null>(null);
  const [onlineFreelancers, setOnlineFreelancers] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [storyDetails, setStoryDetails] = useState<PlatformFeedbackAdminItem | null>(null);


  const [showProfileModal, setShowProfileModal] = useState<string | null>(null); // Добавлено: state для модалки Profile
const [selectedProfile, setSelectedProfile] = useState<JobSeekerProfile | null>(null);
const renderDateCell = (iso?: string | null) => {
  if (!iso) return 'no info';
  const d = new Date(iso);
  const full = format(d, 'PP p'); // локальный формат проекта
  const human = formatDistanceToNow(d, { addSuffix: true }); // “5 minutes ago”
  return <span title={human}>{full}</span>; // человекочитаемое во всплывающей подсказке
};
const [referralFilterJobId, setReferralFilterJobId] = useState(''); // Добавлено: filter by jobId
const [referralFilterJobTitle, setReferralFilterJobTitle] = useState(''); // Добавлено: filter by title
const [expandedReferral, setExpandedReferral] = useState<string | null>(null); // Добавлено: для expandable registrations
const [showReferralModal, setShowReferralModal] = useState<{ fullLink: string; clicks: number; registrations: number } | null>(null); // Добавлено: модалка для new link
const [enrichedComplaints, setEnrichedComplaints] = useState<EnrichedComplaint[]>([]);
const [resolveModal, setResolveModal] = useState<{ id: string; status: 'Resolved' | 'Rejected'; comment: string } | null>(null);

  const navigate = useNavigate();

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
  setShowEmailStatsModal({ jobPostId, loading: true, data: null });
  try {
    const data = await getEmailStatsForJob(jobPostId);
    setShowEmailStatsModal({
      jobPostId,
      loading: false,
      data: {
        ...data,
        details: data.details.map(d => ({ ...d, job_post_id: jobPostId }))
      }
    });
  } catch (e) {
    alert('Failed to load email stats');
    setShowEmailStatsModal(null);
  }
};


const submitResolveComplaint = async () => {
  if (!resolveModal) return;
  try {
    await resolveComplaint(resolveModal.id, { status: resolveModal.status, comment: resolveModal.comment || undefined });
    const updatedComplaints = await getComplaints();
    setComplaints(updatedComplaints || []);
    setResolveModal(null);
    alert('Complaint resolved successfully!');
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error resolving complaint:', axiosError);
    alert(axiosError.response?.data?.message || 'Failed to resolve complaint.');
  }
};

const [referralLinks, setReferralLinks] = useState<{
  id: string;
  jobPostId: string;
  fullLink: string;
  description?: string | null;
  clicks: number;
  registrations: number;
  registrationsDetails?: { user: { id: string; username: string; email: string; role: string; created_at: string } }[];
  job_post?: { id: string; title: string };
}[]>([]);

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
    alert(axiosError.response?.data?.message || 'Failed to update referral link.');
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
    alert(axiosError.response?.data?.message || 'Failed to delete referral link.');
  }
};

// «Всегда новая» — вместо переиспользования
const handleReferralForPost = (id: string) => {
  openCreateReferralModal(id);
};




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
  if (activeTab === 'Settings') loadChatNotif();
}, [activeTab]);

useEffect(() => {
  if (!chatNotif) return;
  if (
    chatNotif.enabled &&
    !chatNotif.onEmployerMessage.immediate &&
    !chatNotif.onEmployerMessage.delayedIfUnread.enabled
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
    // можно отправлять полный объект — бэку ок; частичный тоже поддерживается
    const saved = await updateChatNotificationSettings(chatNotif);
    setChatNotif(normalizeCN(saved || {}));
    alert('Chat notification settings saved.');
  } catch (e: any) {
    const msg = e?.response?.data?.message || 'Failed to save chat notifications.';
    alert(msg);
  } finally {
    setChatNotifSaving(false);
  }
};


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

const location = useLocation();
useEffect(() => {
  if (location.state?.jobPostId) setFilterJobPostId(location.state.jobPostId);
}, [location.state]);

const sortedJobPostsWithApps = [...jobPostsWithApps].sort((a, b) => {
  if (!sortColumn) return 0;
  const direction = sortDirection === 'asc' ? 1 : -1;
  if (sortColumn === 'id') {
    return a.id.localeCompare(b.id) * direction;
  } else if (sortColumn === 'applicationCount') {
    return (a.applicationCount - b.applicationCount) * direction;
  } else if (sortColumn === 'created_at') {
    return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
  }
  return 0;
});

const handleUserSort = (column: 'id' | 'role' | 'is_blocked') => {
  if (userSortColumn === column) {
    setUserSortDirection(userSortDirection === 'asc' ? 'desc' : 'asc');
  } else {
    setUserSortColumn(column);
    setUserSortDirection('asc');
  }
};

const sortedUsers = [...users].sort((a, b) => {
  if (!userSortColumn) return 0;
  const direction = userSortDirection === 'asc' ? 1 : -1;
  if (userSortColumn === 'id') {
    return a.id.localeCompare(b.id) * direction;
  } else if (userSortColumn === 'role') {
    return (a.role || '').localeCompare(b.role || '') * direction;
  } else if (userSortColumn === 'is_blocked') {
    const aBlocked = a.status === 'blocked' ? 1 : 0;
    const bBlocked = b.status === 'blocked' ? 1 : 0;
    return (aBlocked - bBlocked) * direction;
  }
  return 0;
});

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


const buildUserSearch = (page = userPage) => {
  const q: any = { page, limit: userLimit };
  const s = searchQuery.trim();
  if (!s) return q;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) q.id = s;
  else if (s.includes('@')) q.email = s;
  else q.username = s;
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



// useEffect(() => {


//   setIsLoading(true);
//   setUsers(mockUsers);
//   setIsLoading(false);
// }, [currentRole, userPage]);



useEffect(() => {
  if (!socket) return;

  const onJobPostsChanged = () => fetchJobPosts();
  const onComplaintsChanged = async () => setComplaints(await getComplaints() || []);
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

      const today = format(new Date(), 'yyyy-MM-dd'); // Используем date-fns для форматирования
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const requests = [
      getAllJobPosts({ page: jobPostPage, limit: jobPostLimit }),
      getAllReviews(),
      getFeedback(),
      getPlatformFeedback(),
      getBlockedCountries(), 
      getAdminCategories(),
      getAnalytics(),
      getRegistrationStats({ startDate: '2023-01-01', endDate: new Date().toISOString().split('T')[0], interval: selectedInterval }),
      getGeographicDistribution({ role: 'jobseeker', startDate: today, endDate: today }),
      getGeographicDistribution({ role: 'jobseeker', startDate: yesterday, endDate: yesterday }),
      getGeographicDistribution({ role: 'jobseeker', startDate: weekStart, endDate: weekEnd }),
      getGeographicDistribution({ role: 'jobseeker', startDate: monthStart, endDate: monthEnd }),
      getGeographicDistribution({ role: 'employer', startDate: today, endDate: today }),
      getGeographicDistribution({ role: 'employer', startDate: yesterday, endDate: yesterday }),
      getGeographicDistribution({ role: 'employer', startDate: weekStart, endDate: weekEnd }),
      getGeographicDistribution({ role: 'employer', startDate: monthStart, endDate: monthEnd }),
      getTopEmployers(5),
      getTopJobseekers(5),
      getTopJobseekersByViews(5),
      getTopEmployersByPosts(5),
      getGrowthTrends({ period: '30d' }),
      getComplaints(),
      getGlobalApplicationLimit(),
      getOnlineUsers(),
      getRecentRegistrations({ limit: 5 }),
      getJobPostsWithApplications(),
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
  'getAllJobPosts',
  'getAllReviews',
  'getFeedback',
  'getPlatformFeedback',   // ← добавили
  'getBlockedCountries',
  'getAdminCategories',
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
  'getTopEmployers',
  'getTopJobseekers',
  'getTopJobseekersByViews',
  'getTopEmployersByPosts',
  'getGrowthTrends',
  'getComplaints',
  'getGlobalApplicationLimit',
  'getOnlineUsers',
  'getRecentRegistrations',
  'getJobPostsWithApplications',
];


    for (const [index, result] of results.entries()) {
      if (result.status === 'fulfilled') {
        console.log(`${endpoints[index]} succeeded:`, result.value);
        const value = result.value as RequestResult;
        switch (index) {
case 0:
    setJobPosts((value as PaginatedResponse<JobPost>).data || []);
    break;
          
          case 1:
  const reviewsData = value as Review[] || [];
  const enrichedReviews = reviewsData.map((review) => ({
    ...review,
    job_post: review.job_application?.job_post || null,
    job_seeker: review.job_application?.job_seeker || null,
  }));
  setReviews(enrichedReviews);
  console.log('Enriched reviews set in state:', enrichedReviews);
  break;
          case 2:
            setIssues(value as Feedback[] || []);
            break;
case 3: {
  const { data } = value as PlatformFeedbackList;
  setStories(data || []);
  break;
}
          case 4:
            setBlockedCountries(value as BlockedCountry[] || []);
            break;
case 5:
  setCategories(value as Category[] || []);
  break;
          case 6:
            setAnalytics(value as typeof analytics || null);
            break;
          case 7:
            setRegistrationStats(value as { period: string; count: number }[] || []);
            break;
          case 8:
            setFreelancerSignupsToday(value as { country: string; count: number }[] || []);
            break;
          case 9:
            setFreelancerSignupsYesterday(value as { country: string; count: number }[] || []);
            break;
          case 10:
            setFreelancerSignupsWeek(value as { country: string; count: number }[] || []);
            break;
          case 11:
            setFreelancerSignupsMonth(value as { country: string; count: number }[] || []);
            break;
          case 12:
            setBusinessSignupsToday(value as { country: string; count: number }[] || []);
            break;
          case 13:
            setBusinessSignupsYesterday(value as { country: string; count: number }[] || []);
            break;
          case 14:
            setBusinessSignupsWeek(value as { country: string; count: number }[] || []);
            break;
          case 15:
            setBusinessSignupsMonth(value as { country: string; count: number }[] || []);
            break;
case 16:
  setTopEmployers(value as { employer_id: string; username: string; job_count: number }[] || []);
  console.log('Top Employers data:', value); // Для проверки
  break;
case 17:
  setTopJobseekers(value as { job_seeker_id: string; username: string; application_count: number }[] || []);
  console.log('Top Jobseekers data:', value);
  break;
          case 18:
            setTopJobseekersByViews(value as { userId: string; username: string; email: string; profileViews: number }[] || []);
            break;
          case 19:
            setTopEmployersByPosts(value as { userId: string; username: string; email: string; jobCount: number }[] || []);
            break;
          case 20:
            setGrowthTrends(value as typeof growthTrends || { registrations: [], jobPosts: [] });
            break;
          case 21:
            setComplaints(value as typeof complaints || []);
            break;
case 22:
  console.log('Global limit value:', value); // Добавил лог для диагностики
  setGlobalLimit((value as { globalApplicationLimit: number | null }).globalApplicationLimit ?? null);
  break;
          case 23:
            setOnlineUsers(value as OnlineUsers || null);
            break;
          case 24:
            setRecentRegistrations(value as RecentRegistrations || { jobseekers: [], employers: [] });
            break;


case 25: {
  const postsWithApps = (value as JobPostWithApplications[]).map((post) => ({
    ...post,
    username: post.employer?.username || 'N/A',
    category:
      typeof post.category === 'string'
        ? post.category
        : post.category?.name || 'N/A',
  }));

  setJobPostsWithApps(postsWithApps);

  // fetch stats for each post
  const statsPromises = postsWithApps.map((post) =>
    getEmailStatsForJob(post.id).catch(() => ({
      sent: 0,
      opened: 0,
      clicked: 0,
    }))
  );

  const statsResults: Array<{ sent: number; opened: number; clicked: number }> =
    await Promise.all(statsPromises);

  const statsMap = postsWithApps.reduce<
    Record<string, { sent: number; opened: number; clicked: number }>
  >((acc, post, i) => {
    acc[post.id] = statsResults[i];
    return acc;
  }, {});

  setNotificationStats(statsMap);

  // referral links
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
        alert('User deleted successfully!');
        } else {
  await fetchUsers(buildUserSearch(userPage)); }
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error('Error deleting user:', axiosError);
        alert(axiosError.response?.data?.message || 'Failed to delete user.');
      }
    }
  };



//   const handleDeleteUser = async (id: string) => {
//   if (window.confirm('Are you sure you want to delete this user?')) {
//     setUsers(users.filter((user) => user.id !== id));
//     alert('User deleted successfully!');
//   }
// };

const handleRejectJobPost = async (id: string) => {
  const reason = prompt('Enter reason for rejection:');
  if (reason && reason.trim()) {
    try {
      await rejectJobPost(id, reason);
      setJobPosts(jobPosts.filter((post) => post.id !== id));
      setJobPostsWithApps(jobPostsWithApps.filter((post) => post.id !== id));
      alert('Job post rejected successfully!');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error rejecting job post:', axiosError);
      alert(axiosError.response?.data?.message || 'Failed to reject job post.');
    }
  } else {
    alert('Reason is required.');
  }
};

  const handleResetPassword = async (id: string) => {
    const newPassword = prompt('Enter new password:');
    if (newPassword) {
      try {
        await resetUserPassword(id, newPassword);
        alert('Password reset successfully!');
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error('Error resetting password:', axiosError);
        alert(axiosError.response?.data?.message || 'Failed to reset password.');
      }
    }
  };



const handleVerifyIdentity = async (id: string, verify: boolean) => {
  try {
    await verifyIdentity(id, verify);
    alert(`Identity ${verify ? 'verified' : 'rejected'} successfully!`);
    await fetchUsers(buildUserSearch());
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error verifying identity:', axiosError);
    alert(axiosError.response?.data?.message || 'Failed to verify identity.');
  }
};

  const handleBlockUser = async (id: string, username: string) => {
  if (window.confirm(`Are you sure you want to block ${username}?`)) {
    try {
      await blockUser(id);
      alert('User blocked successfully!');
     await fetchUsers(buildUserSearch(userPage));
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error blocking user:', axiosError);
      alert(axiosError.response?.data?.message || 'Failed to block user.');
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
      alert('User unblocked successfully!');
      await fetchUsers(buildUserSearch(userPage));
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error unblocking user:', axiosError);
      alert(axiosError.response?.data?.message || 'Failed to unblock user.');
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
    alert('Category created successfully!');
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error creating category:', axiosError);
    alert(axiosError.response?.data?.message || 'Failed to create category.');
  }
};

const handleDeleteCategory = async (id: string) => {
  if (window.confirm('Are you sure you want to delete this category?')) {
    try {
      await deleteCategory(id);
      const updatedCategories = await getAdminCategories();
      setCategories(updatedCategories || []);
      alert('Category deleted successfully!');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error deleting category:', axiosError);
      alert(axiosError.response?.data?.message || 'Failed to delete category.');
    }
  }
};



  const handleDeleteJobPost = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this job post?')) {
      try {
        await deleteJobPostAdmin(id);
        setJobPosts(jobPosts.filter((post) => post.id !== id));
        setJobPostsWithApps(jobPostsWithApps.filter((post) => post.id !== id));
        alert('Job post deleted successfully!');
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error('Error deleting job post:', axiosError);
        alert(axiosError.response?.data?.message || 'Failed to delete job post.');
      }
    }
  };

const handleApproveJobPost = async (id: string) => {
  try {
    const updatedPost = await approveJobPost(id);
    setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
    setJobPostsWithApps(jobPostsWithApps.map((post) => (post.id === id ? { ...post, status: updatedPost.status, pending_review: updatedPost.pending_review } : post)));
    alert('Job post approved successfully!');
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error approving job post:', axiosError);
    alert(axiosError.response?.data?.message || 'Failed to approve job post.');
  }
};

const handleFlagJobPost = async (id: string) => {
  try {
    const updatedPost = await flagJobPost(id);
    setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
    setJobPostsWithApps(jobPostsWithApps.map((post) => (post.id === id ? { ...post, status: updatedPost.status, pending_review: updatedPost.pending_review } : post)));
    alert('Job post flagged successfully!');
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error flagging job post:', axiosError);
    alert(axiosError.response?.data?.message || 'Failed to flag job post.');
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
        alert('Application limit set successfully!');
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error('Error setting application limit:', axiosError);
        alert(axiosError.response?.data?.message || 'Failed to set application limit.');
      }
    }
  };

  const selectedJob = jobPosts.find(post => post.id === showJobModal);
const safeDescription = sanitizeHtml(selectedJob?.description ?? '');

const handleNotifyCandidates = async (id: string) => {
  
  setNotifyJobPostId(id);
  setNotifyAudience('all');
  setNotifyTitleFilter('');
  setShowNotifyModal(true);
  console.log('State should update to true'); // Добавлено: лог после setState
};

const handleNotifySubmit = async () => {
  const n = parseInt(notifyLimit, 10);
  if (!n || n < 1) {
    alert('Please enter a valid number of candidates.');
    return;
  }

  try {
    let res;
    if (notifyAudience === 'referral') {
      res = await notifyReferralApplicants(notifyJobPostId, {
        limit: n,
        orderBy: notifyOrderBy,
        titleContains: notifyTitleFilter.trim() || undefined, // опционально для примера с "Social Media"
        // categoryId: selectedJobCategoryId, // если решишь подставлять категорию текущей вакансии
      });
    } else {
      res = await notifyCandidates(notifyJobPostId, { limit: n, orderBy: notifyOrderBy });
    }

    alert(`Notified ${res.sent} of ${res.total} candidates for job post ${res.jobPostId}`);
    setShowNotifyModal(false);
    setNotifyLimit('10');
    setNotifyOrderBy('beginning');
    setNotifyAudience('all');
    setNotifyTitleFilter('');
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to notify candidates.';
    console.error('Error notifying candidates:', error);
    alert(msg);
  }
};


  const handleDeleteReview = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        await deleteReview(id);
        setReviews(reviews.filter((review) => review.id !== id));
        alert('Review deleted successfully!');
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error('Error deleting review:', axiosError);
        alert(axiosError.response?.data?.message || 'Failed to delete review.');
      }
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
  const monthRange = () => ({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  // быстрый тик: онлайн, последние регистрации, и TODAY для Business Overview
  const fetchFast = async () => {
    try {
      const [online, recents, jsToday, bizToday] = await Promise.all([
        getOnlineUsers(),
        getRecentRegistrations({ limit: 5 }),
        getGeographicDistribution({ role: 'jobseeker', startDate: today(), endDate: today() }),
        getGeographicDistribution({ role: 'employer',  startDate: today(), endDate: today() }),
      ]);
      if (stop) return;
      setOnlineUsers(online || null);
      setRecentRegistrations(recents || { jobseekers: [], employers: [] });
      setFreelancerSignupsToday(jsToday || []);
      setBusinessSignupsToday(bizToday || []);
    } catch { /* тихо игнорим */ }
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
        getGeographicDistribution({ role: 'jobseeker', startDate: y,  endDate: y }),
        getGeographicDistribution({ role: 'jobseeker', startDate: ws, endDate: we }),
        getGeographicDistribution({ role: 'jobseeker', startDate: ms, endDate: me }),
        getGeographicDistribution({ role: 'employer',  startDate: y,  endDate: y }),
        getGeographicDistribution({ role: 'employer',  startDate: ws, endDate: we }),
        getGeographicDistribution({ role: 'employer',  startDate: ms, endDate: me }),
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
  const q = buildUserSearch(1); // соберёт id/email/username + page=1
  fetchUsers(q);                // явно шлём запрос
  if (userPage !== 1) setUserPage(1); // чтобы пагинация вернулась на первую
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
      alert(`Global application limit set to ${limitData.globalApplicationLimit ?? 'Not set'} successfully!`);
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error setting global limit:', axiosError.response?.data?.message || axiosError.message);
      setFetchErrors((prev) => ({
        ...prev,
        getGlobalApplicationLimit: axiosError.response?.data?.message || 'Failed to set or retrieve global limit.',
      }));
      alert(axiosError.response?.data?.message || 'Failed to set global limit.');
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
      alert('Country blocked successfully!');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error adding blocked country:', axiosError);
      alert(axiosError.response?.data?.message || 'Failed to block country.');
    }
  };

  const handleRemoveBlockedCountry = async (countryCode: string) => {
    if (window.confirm(`Are you sure you want to unblock ${countryCode}?`)) {
      try {
        await removeBlockedCountry(countryCode);
        const updatedCountries = await getBlockedCountries();
        setBlockedCountries(updatedCountries || []);
        alert('Country unblocked successfully!');
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error('Error removing blocked country:', axiosError);
        alert(axiosError.response?.data?.message || 'Failed to unblock country.');
      }
    }
  };

  const handleExportUsers = async () => {
    try {
      await exportUsersToCSV();
      alert('Users exported successfully!');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error exporting users:', axiosError);
      alert(axiosError.response?.data?.message || 'Failed to export users.');
    }
  };

  // const todayStr = new Date().toDateString();

const todayMnl = formatInTimeZone(new Date(), 'Asia/Manila', 'yyyy-MM-dd');

const todayRegs = recentRegistrations.jobseekers.filter(
  u => formatInTimeZone(new Date(u.created_at), 'Asia/Manila', 'yyyy-MM-dd') === todayMnl
);

const todayBiz = recentRegistrations.employers.filter(
  u => formatInTimeZone(new Date(u.created_at), 'Asia/Manila', 'yyyy-MM-dd') === todayMnl
);

if (isLoading) {
  return (
    <div>
      <div className="backoffice-header">
        <div className="backoffice-title" onClick={handleBackofficeClick}>BACK<span className='backoffice_span'>OFFICE</span></div>
        <div className="header-right">
          <span className="greeting">Welcome, <span className="username-bold">{username}</span></span> 
          <Link to="/" className="nav-link"><FaHome /> Home</Link>
          <button className="action-button" onClick={handleLogout}><FaSignOutAlt /> Logout</button>
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
          <button className="action-button-admin" onClick={handleLogout}><FaSignOutAlt /> Logout</button>
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
        <div className="action-button-admin" onClick={handleLogout}><FaSignOutAlt /> Logout</div>
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
        <th>Month </th>
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
      Last 5 Freelancer Registrations Today (Total: {todayRegs.length})
    </summary>
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>Username</th>
          <th>Email</th>
          <th>Created At</th>
        </tr>
      </thead>
      <tbody>
        {todayRegs.length === 0 ? (
          <tr><td colSpan={3}>No recent freelancer registrations today.</td></tr>
        ) : (
          todayRegs.slice(0,5).map(u => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>{format(new Date(u.created_at), 'PP')}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </details>
 <details>
    <summary>
      Last 5 Business Registrations Today (Total: {todayBiz.length})
    </summary>
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>Username</th>
          <th>Email</th>
          <th>Created At</th>
        </tr>
      </thead>
      <tbody>
        {todayBiz.length === 0 ? (
          <tr><td colSpan={3}>No recent business registrations today.</td></tr>
        ) : (
          todayBiz.slice(0,5).map(u => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.email}</td>
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
      <td>{typeof post.category === 'string' ? post.category : post.category?.name || 'N/A'}</td>
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
  <button onClick={handleExportUsers} className="action-button">
    Export to CSV
  </button>
  {fetchErrors.getAllUsers && <p className="error-message">{fetchErrors.getAllUsers}</p>}
  
  {/* Добавлено: search bar */}
<div className="search_users" style={{ marginBottom: '10px' }}>
  <input
    type="text"
    placeholder="Search by username, email or ID"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerUserSearch();
      }
    }}
  />
  <button
    type="button"
    onClick={triggerUserSearch}
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
      <td>{user.role}</td>
      <td>{user.status === 'blocked' ? 'Blocked' : 'Active'}</td>
      <td>{onlineStatuses[user.id] ? 'Online' : 'Offline'}</td>
      <td>{renderDateCell(user.last_seen_at)}</td>
      <td>{renderDateCell(user.created_at)}</td>
      <td>
        <button onClick={() => handleViewRiskScore(user.id)} className="action-button">View Risk</button>
      </td>
        <td>
        <a
    href={`/public-profile`}
    target="_blank"
    rel="noopener noreferrer"
    className="action-button-view-a"
  >
    View Profile
  </a>
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
        <td colSpan={9}>No users found.</td>
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
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>
<button onClick={() => {
  const query = searchQuery.trim();
  if (!query) return;

  const params: any = { page: 1, limit: jobPostLimit };
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query);

  if (isUuid) {
    params.id = query;                                  // ищем по ID поста
  } else if (/^[a-z0-9_.-]+$/i.test(query)) {
    params.employer_username = query;                   // похоже на username — ищем по нему
  } else {
    params.title = query;                               // иначе — как по заголовку
  }

  fetchJobPosts(params);
  setJobPostPage(1);
}} className="action-button">
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
          <th>Pending Review</th>
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
              <td>{post.pending_review ? 'Yes' : 'No'}</td>
              <td>{format(new Date(post.created_at), 'PP')}</td>
              <td>
                <button onClick={() => handleDeleteJobPost(post.id)} className="action-button danger">
                  Delete
                </button>
                {post.pending_review && (
                  <button onClick={() => handleApproveJobPost(post.id)} className="action-button success">
                    Approve
                  </button>
                )}
                <button onClick={() => handleFlagJobPost(post.id)} className="action-button warning">
                  Flag
                </button>
                <button onClick={() => handleRejectJobPost(post.id)} className="action-button danger">
                  Reject
                </button>
                <button onClick={() => setShowJobModal(post.id)} className="action-button">
                  View Job
                </button>
                <button
    onClick={() => window.open(`/job/${(post as any).slug_id || post.id}`, '_blank')}
    className="action-button"
    title="Open advertising landing for this job"
  >
    View LP
  </button>
 <button onClick={() => handleReferralForPost(post.id)} className="action-button generate-ref">
  Generate Referral
</button>
              </td>
              <td>
<span 
  title={`Sent: ${notificationStats[post.id]?.sent || 0} Opened: ${notificationStats[post.id]?.opened || 0} Clicked: ${notificationStats[post.id]?.clicked || 0}`}
>
  s:{notificationStats[post.id]?.sent || 0} o:{notificationStats[post.id]?.opened || 0} c:{notificationStats[post.id]?.clicked || 0}
</span>
<button onClick={() => handleNotifyCandidates(post.id)} className="action-button success" style={{ cursor: 'pointer' }}>
  Notify Seekers
</button>
<button onClick={() => openEmailStats(post.id)} className="action-button">
  View Details
</button>
               
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
    {fetchErrors.getAllReviews && <p className="error-message">{fetchErrors.getAllReviews}</p>}
    <table className="dashboard-table">
  <thead>
    <tr>
      <th>ID</th>
      <th>Rating</th>
      <th>Comment</th>
      <th>Reviewer</th>
      <th>Target</th>
      <th>Related Job</th>
      <th>Created At</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {reviews.length > 0 ? reviews.map((review) => (
<tr key={review.id}>
  <td>{review.id}</td>
  <td>{review.rating}</td>
  <td>{review.comment}</td>
  <td>{review.reviewer?.username || 'Anonymous'}</td>
  <td>{review.reviewed?.username || 'N/A'}</td> 
  <td>{review.job_post?.title || 'N/A'}</td>
  <td>{format(new Date(review.created_at), 'PP')}</td>
  <td>
    <button onClick={() => handleDeleteReview(review.id)} className="action-button danger">
      Delete
    </button>
  </td>
</tr>
    )) : (
      <tr>
        <td colSpan={8}>No reviews found.</td>
      </tr>
    )}
  </tbody>
</table>
  </div>
)}

       {activeTab === 'Feedback' && (
  <div>
    <h4>Issues Feedback (Technical/Support)</h4>
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>Category</th>
          <th>Summary</th>
          <th>Steps</th>
          <th>Expected</th>
          <th>Actual</th>
          <th>User</th>
          <th onClick={() => handleIssuesSort('created_at')} style={{ cursor: 'pointer' }}>
            Created At {issuesSortColumn === 'created_at' ? (issuesSortDirection === 'asc' ? <FaArrowUp /> : <FaArrowDown />) : <FaArrowUp />}
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedIssues.length > 0 ? sortedIssues.map((fb) => (
          <tr key={fb.id}>
            <td>{fb.category}</td>
            <td>{fb.summary}</td>
            <td>{fb.steps_to_reproduce || '—'}</td>
            <td>{fb.expected_result || '—'}</td>
            <td>{fb.actual_result || '—'}</td>
            <td>{fb.user?.username || 'Unknown'}</td>
            <td>{format(new Date(fb.created_at), 'PP')}</td>
          </tr>
        )) : (
          <tr>
            <td colSpan={7}>No issues feedback found.</td>
          </tr>
        )}
      </tbody>
    </table>


   <h4>Success Stories Feedback</h4>
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
  {/* NEW: Details — открывает модалку с полным текстом истории */}
  <button
    onClick={() => setStoryDetails(story)}
    className="action-button"
  >
    Details
  </button>

  {/* Публиковать/Скрывать — ОДНА кнопка, и только если пользователь дал согласие */}
  {story.allowed_to_publish ? (
    story.is_public ? (
      <button
        onClick={async () => {
          try {
            const updated = await unpublishPlatformFeedback(story.id);
            setStories(prev => prev.map(s => s.id === story.id ? { ...s, ...updated } : s));
          } catch (error) {
            const axiosError = error as AxiosError<{ message?: string }>;
            alert(axiosError.response?.data?.message || 'Failed to unpublish.');
          }
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
          } catch (error) {
            const axiosError = error as AxiosError<{ message?: string }>;
            alert(axiosError.response?.data?.message || 'Failed to publish.');
          }
        }}
        className="action-button success"
      >
        Publish
      </button>
    )
  ) : null}

  <button
    onClick={async () => {
      if (window.confirm('Are you sure you want to delete this story?')) {
        try {
          await deletePlatformFeedback(story.id);
          setStories(stories.filter((item) => item.id !== story.id));
          alert('Story deleted successfully!');
        } catch (error) {
          const axiosError = error as AxiosError<{ message?: string }>;
          console.error('Error deleting story:', axiosError);
          alert(axiosError.response?.data?.message || 'Failed to delete story.');
        }
      }
    }}
    className="action-button danger"
  >
    Delete
  </button>
</td>

      </tr>
    )) : (
      <tr>
        <td colSpan={9}>No success stories found.</td>
      </tr>
    )}
  </tbody>
</table>

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
        {sortedComplaints.length > 0 ? sortedComplaints.map((complaint) => (
         <tr key={complaint.id}>
  <td>{complaint.id}</td>
  <td>{complaint.complainant.username}</td>
  <td>{complaint.targetUsername}</td>
  <td>{complaint.reason}</td>
  <td>{complaint.status}</td>
  <td>{complaint.resolution_comment ? `${complaint.resolution_comment} (by ${complaint.resolver?.username || 'Unknown'})` : 'N/A'}</td> 
  <td>{format(new Date(complaint.created_at), 'PP')}</td> 
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
      <div className="modal">
        <div className="modal-content">
          <span className="close" onClick={() => setShowJobModal(null)}>×</span>
          <h3 className='job-post-details'>Job Post Details</h3>
          <p><strong>Title:</strong> {jobPosts.find(post => post.id === showJobModal)?.title}</p>
         <p><strong>Description:</strong></p>
<div
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
    {error && <p className="error-message">{error}</p>}
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
    )}
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
  <div>
    <h4>Referral Links</h4>
    <div className="form-group">
      <label>Filter by Job ID:</label>
      <input value={referralFilterJobId} onChange={(e) => setReferralFilterJobId(e.target.value)} />
    </div>
    <div className="form-group">
      <label>Filter by Job Title:</label>
      <input value={referralFilterJobTitle} onChange={(e) => setReferralFilterJobTitle(e.target.value)} />
    </div>
    <button
      onClick={async () => {
        const data = await getReferralLinks({
          jobId: referralFilterJobId.trim() || undefined,
          jobTitle: referralFilterJobTitle.trim() || undefined, // <-- правильное имя фильтра
        });
        console.log('Referral Links data:', data);
        setReferralLinks(data || []);
      }}
      className="action-button"
    >
      Search
    </button>

    {(() => {
      // Группируем по вакансии
      const groups: Record<string, { title: string; links: typeof referralLinks }> = {};
      referralLinks.forEach((link) => {
        const jId = link.job_post?.id || link.jobPostId;
        const title = link.job_post?.title || 'N/A';
        if (!groups[jId]) groups[jId] = { title, links: [] as any };
        groups[jId].links.push(link);
      });
      const jobIds = Object.keys(groups);

      if (jobIds.length === 0) {
        return (
          <table className="dashboard-table">
            <tbody>
              <tr>
                <td>No referral links found.</td>
              </tr>
            </tbody>
          </table>
        );
      }

      return jobIds.map((jid) => (
        <div key={jid} style={{ marginTop: 16, border: '1px solid #eee', borderRadius: 6, padding: 12 }}>
          <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h5 style={{ margin: 0 }}>Job: {groups[jid].title}</h5>
            <button className="action-button success" onClick={() => openCreateReferralModal(jid)}>+ New referral link</button>
          </div>
          <table className="dashboard-table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Description</th>
                <th>Full Link</th>
                <th>Clicks</th>
                <th>Registrations</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups[jid].links.map((link) => (
                <Fragment key={link.id}>
                  <tr>
                    <td>{link.description || <i>—</i>}</td>
                    <td>
                      {link.fullLink}
                      <button
                        onClick={() => navigator.clipboard.writeText(link.fullLink)}
                        className="action-button"
                        title="Copy link"
                        style={{ marginLeft: 8 }}
                      >
                        <FaCopy /> Copy
                      </button>
                    </td>
                    <td>{link.clicks}</td>
                    <td>{link.registrations}</td>
                    <td>
                      <button className="action-button" onClick={() => handleEditReferral(link.id, link.description || '')}>Edit</button>
                      <button className="action-button danger" onClick={() => handleDeleteReferral(link.id)}>Delete</button>
                      <button
                        onClick={() => setExpandedReferral(expandedReferral === link.id ? null : link.id)}
                        className="action-button"
                        style={{ marginLeft: 8 }}
                      >
                        {expandedReferral === link.id ? 'Hide details' : 'View regs'}
                      </button>
                    </td>
                  </tr>

                  {expandedReferral === link.id && (
                    <tr>
                      <td colSpan={5}>
                        <details open>
                          <summary>Registrations Details</summary>
                          <table>
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
                              {link.registrationsDetails?.length
                                ? link.registrationsDetails.map((reg, i) => (
                                    <tr key={i}>
                                      <td>{reg.user.id}</td>
                                      <td>{reg.user.username}</td>
                                      <td>{reg.user.email}</td>
                                      <td>{reg.user.role}</td>
                                      <td>{format(new Date(reg.user.created_at), 'PP')}</td>
                                    </tr>
                                  ))
                                : (
                                  <tr>
                                    <td colSpan={5}>No registrations.</td>
                                  </tr>
                                )}
                            </tbody>
                          </table>
                        </details>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ));
    })()}
  </div>
)}



{showEmailStatsModal && (
  <div className="modal">
    <div className="modal-content">
      <span className="close" onClick={() => setShowEmailStatsModal(null)}>×</span>
      <h3>Email Notifications — Job Post ID: {showEmailStatsModal.jobPostId}</h3>
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
        <button className="action-button" onClick={() => setStoryDetails(null)}>Close</button>

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
      <p><strong>Registrations:</strong> {showReferralModal.registrations}</p>
    </div>
  </div>
)}
{activeTab === 'Settings' && (
  <div>
    <h4>Settings</h4>

    {/* --- Global Application Limit (как было) --- */}
    {/* === Global Application Limit === */}
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
