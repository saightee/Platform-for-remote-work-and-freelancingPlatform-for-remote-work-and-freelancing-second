import { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, format } from 'date-fns';
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
  logout, getAdminCategories, deletePlatformFeedback, JobPostWithApplications, getPlatformFeedback, deleteCategory, rejectJobPost, getEmailStatsForJob, getAllEmailStats, generateReferralLink, getReferralLinks, api// Добавляем logout из api
} from '../services/api';
import { User, JobPost, Review, Feedback, BlockedCountry, Category, PaginatedResponse, JobApplicationDetails, JobSeekerProfile } from '@types';
import { AxiosError } from 'axios';
import { useCallback } from 'react';
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
  const { currentRole } = useRole();
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
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newParentCategoryId, setNewParentCategoryId] = useState<string>('');
  const [pendingReviewFilter, setPendingReviewFilter] = useState<'All' | 'true' | 'false'>('All');
  const [issues, setIssues] = useState<Feedback[]>([]);
  const [growthPage, setGrowthPage] = useState(1);
const [growthLimit] = useState(10); // Лимит на страницу
const [stories, setStories] = useState<{ id: string; user_id: string; rating: number; description: string; created_at: string; updated_at: string; user: { id: string; username: string; role: string } }[]>([]);
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
const [userPage, setUserPage] = useState(1);
const [userLimit] = useState(10);
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

  const [showProfileModal, setShowProfileModal] = useState<string | null>(null); // Добавлено: state для модалки Profile
const [selectedProfile, setSelectedProfile] = useState<JobSeekerProfile | null>(null);

const [referralFilterJobId, setReferralFilterJobId] = useState(''); // Добавлено: filter by jobId
const [referralFilterJobTitle, setReferralFilterJobTitle] = useState(''); // Добавлено: filter by title
const [expandedReferral, setExpandedReferral] = useState<string | null>(null); // Добавлено: для expandable registrations
const [showReferralModal, setShowReferralModal] = useState<{ fullLink: string; clicks: number; registrations: number } | null>(null); // Добавлено: модалка для new link
const [enrichedComplaints, setEnrichedComplaints] = useState<EnrichedComplaint[]>([]);

  const navigate = useNavigate();

const handleSort = (column: 'id' | 'applicationCount' | 'created_at') => {
  if (sortColumn === column) {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  } else {
    setSortColumn(column);
    setSortDirection('asc');
  }
};

const [referralLinks, setReferralLinks] = useState<{ 
  id: string; 
  jobPostId: string; 
  refCode: string; // camelCase как в ошибке
  fullLink: string; 
  clicks: number; 
  registrations: number; 
  registrationsDetails: { user: { id: string; username: string; email: string; role: string; created_at: string } }[]; 
  job_post?: { id: string; title: string }; // optional, если backend не всегда возвращает
 }[]>([]);

const handleGenerateReferral = async (id: string) => {
  try {
    const data = await generateReferralLink(id);
    setShowReferralModal({ fullLink: data.fullLink, clicks: data.clicks, registrations: data.registrations }); // Открываем модалку
    const updatedLinks = await getReferralLinks({});
    setReferralLinks(updatedLinks || []);
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error generating referral:', axiosError);
    alert(axiosError.response?.data?.message || 'Failed to generate referral link.');
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

const handleGenerateAffiliateLink = async (id: string) => {
  try {
    const response = await api.post<{ fullLink: string }>(`/admin/job-posts/${id}/generate-referral`);
    alert(`Tracking Link generated: ${response.data.fullLink}`);
    // Опционально: скопировать в clipboard
    navigator.clipboard.writeText(response.data.fullLink);
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error generating affiliate link:', axiosError);
    alert(axiosError.response?.data?.message || 'Failed to generate link.');
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

const fetchJobPosts = useCallback(async (params: { page?: number; title?: string; employer_id?: string; employer_username?: string; id?: string; category_id?: string; status?: string; pendingReview?: string } = {}) => { // Изменено: добавили supported id, category_id; убрали employer_email
  try {
    setIsLoading(true);
    setFetchErrors((prev) => ({ ...prev, getAllJobPosts: '' }));
    const response = await getAllJobPosts(params);
    setJobPosts(response.data || []);
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error fetching job posts:', axiosError);
    if (axiosError.response?.status === 401) { // Добавлено: handle 401 специально (token invalid?)
      alert('Session expired. Please log in again.');
      localStorage.removeItem('token');
      navigate('/login');
    }
    setFetchErrors((prev) => ({ ...prev, getAllJobPosts: axiosError.response?.data?.message || 'Failed to load job posts.' }));
  } finally {
    setIsLoading(false);
  }
}, [navigate]); // Добавлено: navigate в deps

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

  const fetchUsers = useCallback(async (params: { page?: number; limit?: number; username?: string; email?: string; id?: string } = {}) => {
  if (!currentRole || currentRole !== 'admin') {
    setError('This page is only available for admins.');
    setIsLoading(false);
    return;
  }

  try {
    setIsLoading(true);
    setFetchErrors((prev) => ({ ...prev, getAllUsers: '' }));
    const effectivePage = params.page || userPage;
const queryParams: { page: number; limit: number; username?: string; email?: string; id?: string } = {
  page: effectivePage,
  limit: userLimit,
};
if (params.username) {
  queryParams.username = params.username;
}
if (params.email) {
  queryParams.email = params.email;
}
if (params.id) {
  queryParams.id = params.id; // Добавь
}
    console.log('Fetching users with params:', queryParams); // Лог для диагностики
    const userResponse = await getAllUsers(queryParams);
    console.log('Raw getAllUsers response:', userResponse);
    const userData = Array.isArray(userResponse) ? userResponse : userResponse?.data || [];
    console.log('Extracted userData:', userData);
    setUsers(userData);
    setUserTotal(userResponse.total || userData.length); // Устанавливаем total для пагинации
    console.log('Users set in state:', userData);
      
      // Добавлено: запрос онлайн-статусов для всех юзеров
      const statusPromises = userData.map((user) => getUserOnlineStatus(user.id).catch(() => ({ isOnline: false })));
      const statuses = await Promise.all(statusPromises);
      const statusMap = userData.reduce((acc, user, index) => {
        acc[user.id] = statuses[index].isOnline;
        return acc;
      }, {} as { [key: string]: boolean });
      setOnlineStatuses(statusMap);
      
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error fetching users:', axiosError.response?.data?.message || axiosError.message);
      setFetchErrors((prev) => ({
        ...prev,
        getAllUsers: axiosError.response?.data?.message || 'Failed to load users data',
      }));
      setError('Some data failed to load. Check errors below.');
    } finally {
      setIsLoading(false);
    }
  }, [currentRole, userPage, userLimit]);


useEffect(() => {
  fetchUsers(); // Без params, как раньше
}, [fetchUsers]);


// useEffect(() => {


//   setIsLoading(true);
//   setUsers(mockUsers);
//   setIsLoading(false);
// }, [currentRole, userPage]);






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
      | JobPostWithApplications[];

    const results = await Promise.allSettled(requests);
    const errors: { [key: string]: string } = {};

    const endpoints = [
      'getAllJobPosts', 'getAllReviews', 'getFeedback',
      'getBlockedCountries', 'getCategories', 'getAnalytics', 'getRegistrationStats',
      'freelancerSignupsToday', 'freelancerSignupsYesterday', 'freelancerSignupsWeek', 'freelancerSignupsMonth',
      'businessSignupsToday', 'businessSignupsYesterday', 'businessSignupsWeek', 'businessSignupsMonth',
      'getTopEmployers', 'getTopJobseekers', 'getTopJobseekersByViews', 'getTopEmployersByPosts',
      'getGrowthTrends', 'getComplaints', 'getGlobalApplicationLimit', 'getOnlineUsers',
      'getRecentRegistrations', 'getJobPostsWithApplications',
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
            case 3: setStories(value as { id: string; user_id: string; rating: number; description: string; created_at: string; updated_at: string; user: { id: string; username: string; role: string } }[] || []);
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
case 25:
  const jobPostsWithApps = (value as JobPostWithApplications[]).map(post => ({
    ...post,
    username: post.employer?.username || 'N/A',
    category: typeof post.category === 'string' ? post.category : post.category?.name || 'N/A',
  }));
  setJobPostsWithApps(jobPostsWithApps);
  console.log('Job Posts with Applications:', JSON.stringify(jobPostsWithApps, null, 2));
  // Добавлено: fetch stats for each post
  const statsPromises = jobPostsWithApps.map(post => getEmailStatsForJob(post.id).catch(() => ({ sent: 0, opened: 0, clicked: 0 })));
  const statsResults = await Promise.all(statsPromises);
  const statsMap = jobPostsWithApps.reduce((acc: { [key: string]: { sent: number; opened: number; clicked: number } }, post, i) => {
    acc[post.id] = statsResults[i];
    return acc;
  }, {});
  setNotificationStats(statsMap);
  // Добавлено: fetch referral links
  const referralData = await getReferralLinks({});
  setReferralLinks(referralData || []);
  break;
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
    fetchJobPosts();
  }
}, [currentRole, jobPostPage]);

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
        setUsers(users.filter((user) => user.id !== id));
        alert('User deleted successfully!');
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
    await fetchUsers({ username: searchQuery, email: searchQuery }); // Reuse fetchUsers with current searchQuery (resets page to 1 if search)
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
      fetchUsers({ username: searchQuery, email: searchQuery, page: userPage }); // Перезагружаем с текущим поиском и страницей
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error blocking user:', axiosError);
      alert(axiosError.response?.data?.message || 'Failed to block user.');
    }
  }
};

const handleUnblockUser = async (id: string, username: string) => {
  if (window.confirm(`Are you sure you want to unblock ${username}?`)) {
    try {
      await unblockUser(id);
      alert('User unblocked successfully!');
      fetchUsers({ username: searchQuery, email: searchQuery, page: userPage }); // Перезагружаем с текущим поиском и страницей
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

  const handleCreateCategory = async (parentId?: string) => { 
  if (!newCategoryName.trim()) {
    alert('Category name cannot be empty.');
    return;
  }
  try {
    await createCategory({ name: newCategoryName, parentId });
    const updatedCategories = await getAdminCategories(); // Изменил на getAdminCategories, как в fetchOtherData
    setCategories(updatedCategories || []);
    setNewCategoryName('');
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

const handleNotifyCandidates = async (id: string) => {
  console.log('Handle Notify called for id:', id); // Добавлено: лог для диагностики клика
  setNotifyJobPostId(id);
  setShowNotifyModal(true);
  console.log('State should update to true'); // Добавлено: лог после setState
};

const handleNotifySubmit = async () => {
  if (!notifyLimit || isNaN(parseInt(notifyLimit)) || parseInt(notifyLimit) < 1) {
    alert('Please enter a valid number of candidates.');
    return;
  }
  try {
    const response = await notifyCandidates(notifyJobPostId, {
      limit: parseInt(notifyLimit),
      orderBy: notifyOrderBy,
    });
    alert(`Notified ${response.sent} of ${response.total} candidates for job post ${response.jobPostId}`);
    setShowNotifyModal(false);
    setNotifyLimit('10');
    setNotifyOrderBy('beginning');
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error notifying candidates:', axiosError);
    alert(axiosError.response?.data?.message || 'Failed to notify candidates.');
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

  const handleResolveComplaint = async (id: string) => {
    const status = prompt('Enter status (Resolved or Rejected):');
    const comment = prompt('Enter resolution comment (optional):');
    if (!status || !['Resolved', 'Rejected'].includes(status)) {
      alert('Invalid status. Must be Resolved or Rejected.');
      return;
    }
    try {
      await resolveComplaint(id, { status: status as 'Resolved' | 'Rejected', comment: comment || undefined });
      const updatedComplaints = await getComplaints();
      setComplaints(updatedComplaints || []);
      alert('Complaint resolved successfully!');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error resolving complaint:', axiosError);
      alert(axiosError.response?.data?.message || 'Failed to resolve complaint.');
    }
  };

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

if (isLoading) {
  return (
    <div>
      <div className="backoffice-header">
        <div className="backoffice-title" onClick={handleBackofficeClick}>BACK<span className='backoffice_span'>OFFICE</span></div>
        <div className="header-right">
          <span className="greeting">Welcome, <span className="username-bold">{username}</span></span> 
          <Link to="/" className="nav-link"><FaHome /> Home</Link>
          <button className="action-button" onClick={handleLogout}><FaSignOutAlt /> Logout</button>
          <div className="user-count employers"><FaUser /> {onlineEmployers ?? 'N/A'}</div>
          <div className="user-count freelancers"><FaUser /> {onlineFreelancers ?? 'N/A'}</div>
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
          <div className="user-count employers"><FaUser /> {onlineEmployers ?? 'N/A'}</div>
          <div className="user-count freelancers"><FaUser /> {onlineFreelancers ?? 'N/A'}</div>
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
        <div className="user-count employers"><FaUser /> {onlineEmployers ?? 'N/A'}</div>
        <div className="user-count freelancers"><FaUser /> {onlineFreelancers ?? 'N/A'}</div>
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
       <button className="action-button refresh-button" onClick={handleRefresh}>refresh</button>
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
  <summary>Last 5 Freelancer Registrations Today (Total: {recentRegistrations.jobseekers.filter(user => new Date(user.created_at).toDateString() === new Date().toDateString()).length})</summary> {/* Обработка: фильтр по сегодняшней дате */}
  <table className="dashboard-table">
    <thead>
      <tr>
        <th>Username</th>
        <th>Email</th>
        <th>Created At</th>
      </tr>
    </thead>
    <tbody>
      {recentRegistrations.jobseekers
        .filter(user => new Date(user.created_at).toDateString() === new Date().toDateString()) // Добавлено: фильтр по дате
        .slice(0, 5) // Лимит 5
        .map((user) => (
          <tr key={user.id}>
            <td>{user.username}</td>
            <td>{user.email}</td>
            <td>{format(new Date(user.created_at), 'PP')}</td>
          </tr>
        )) || (
          <tr>
            <td colSpan={3}>No recent freelancer registrations today.</td>
          </tr>
        )}
    </tbody>
  </table>
</details>
<details>
  <summary>Last 5 Business Registrations Today (Total: {recentRegistrations.employers.filter(user => new Date(user.created_at).toDateString() === new Date().toDateString()).length})</summary>
  <table className="dashboard-table">
    <thead>
      <tr>
        <th>Username</th>
        <th>Email</th>
        <th>Created At</th>
      </tr>
    </thead>
    <tbody>
      {recentRegistrations.employers
        .filter(user => new Date(user.created_at).toDateString() === new Date().toDateString()) // Добавлено: фильтр по дате
        .slice(0, 5) // Лимит 5
        .map((user) => (
          <tr key={user.id}>
            <td>{user.username}</td>
            <td>{user.email}</td>
            <td>{format(new Date(user.created_at), 'PP')}</td>
          </tr>
        )) || (
          <tr>
            <td colSpan={3}>No recent business registrations today.</td>
          </tr>
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
    <th>Category</th> {/* Added */}
    <th onClick={() => handleSort('applicationCount')} style={{ cursor: 'pointer' }}>
      Applications {sortColumn === 'applicationCount' ? (sortDirection === 'asc' ? <FaArrowUp /> : <FaArrowDown />) : <FaArrowUp />}
    </th>
    <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
      Created At {sortColumn === 'created_at' ? (sortDirection === 'asc' ? <FaArrowUp /> : <FaArrowDown />) : <FaArrowUp />}
    </th>
    <th>Affiliate/Tracking Link</th>
  </tr>
</thead>
<tbody>
  {paginatedJobPostsWithApps.length > 0 ? paginatedJobPostsWithApps.map((post) => (
    <tr key={post.id}>
      <td>{post.username || 'N/A'}</td>
      <td>{post.title}</td>
      <td>{typeof post.category === 'string' ? post.category : post.category?.name || 'N/A'}</td> {/* Обработка: string или object.name */}
      <td>{post.applicationCount}</td>
      <td>{format(new Date(post.created_at), 'PP')}</td>
      <td>
        <button onClick={() => handleGenerateAffiliateLink(post.id)} className="action-button">Generate Link</button> 
      </td> 
    </tr>
  )) : (
    <tr>
      <td colSpan={6}>No job postings with applications found.</td> {/* Изменено: colSpan +1 */}
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
  {(() => {
    console.log('Rendering users:', sortedUsers);
    return null;
  })()}
  
  {/* Добавлено: search bar */}
  <div className="search-bar" style={{ marginBottom: '10px' }}>
    <input
      type="text"
      placeholder="Search by username or email"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
 <button onClick={() => {
  const params: { page: number; username?: string; email?: string; id?: string } = { page: 1 };
if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(searchQuery)) {
  params.id = searchQuery; // Поиск по ID
} else if (searchQuery.includes('@')) {
  params.email = searchQuery;
} else {
  params.username = searchQuery;
}
fetchUsers(params);
setUserPage(1);
}} className="action-button">
  <FaSearch />
</button>
  </div>
  
  
   <table className="dashboard-table">
  <thead>
    <tr>
      <th onClick={() => handleUserSort('id')} style={{ cursor: 'pointer' }}>
        ID {userSortColumn === 'id' ? (userSortDirection === 'asc' ? <FaArrowUp /> : <FaArrowDown />) : <FaArrowUp />}
      </th>
      <th>Username</th>
      <th>Email</th>
      <th onClick={() => handleUserSort('role')} style={{ cursor: 'pointer' }}>
        Role {userSortColumn === 'role' ? (userSortDirection === 'asc' ? <FaArrowUp /> : <FaArrowDown />) : <FaArrowUp />}
      </th>
      <th onClick={() => handleUserSort('is_blocked')} style={{ cursor: 'pointer' }}>
        Blocked Status {userSortColumn === 'is_blocked' ? (userSortDirection === 'asc' ? <FaArrowUp /> : <FaArrowDown />) : <FaArrowUp />}
      </th>
      <th>Online Status</th>
      <th>Risk Score</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {sortedUsers.length > 0 ? sortedUsers.map((user) => (
      <tr key={user.id}>
        <td>{user.id}</td>
        <td>{user.username}</td>
        <td>{user.email}</td>
        <td>{user.role}</td>
        <td>{user.status === 'blocked' ? 'Blocked' : 'Active'}</td>
        <td>
          {onlineStatuses[user.id] ? 'Online' : 'Offline'}
        </td>
        <td>
          <button onClick={() => handleViewRiskScore(user.id)} className="action-button">
            View Risk
          </button>
        </td>
        <td>
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
        <td colSpan={8}>No users found.</td>
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
    <div className="search-bar" style={{ marginBottom: '10px' }}>
      <input
        type="text"
        placeholder="Search by title or employer username/email"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
<button onClick={() => {
  const query = searchQuery.trim(); // Добавлено: trim для чистоты
  if (!query) return; // Добавлено: игнор если пусто
  const params: { page: number; title?: string; employer_id?: string; employer_username?: string; id?: string; category_id?: string } = { page: 1 }; // Изменено: убрали employer_email (нет в docs), добавили id, category_id
  if (query.includes('@')) {
    alert('Search by email is not supported. Use username or ID.'); // Добавлено: alert, т.к. нет employer_email
    return;
  } else if (query.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
    params.employer_id = query; // employer_id для uuid
    params.id = query; // Также id для job post, backend handle
    params.category_id = query; // Если uuid категории, но редко — backend ignore если не match
  } else {
    params.title = query; // По title
    params.employer_username = query; // По employer_username (partial match по docs)
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
          <th>ID</th>
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
              <td>{post.id}</td>
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
                <button onClick={() => handleGenerateReferral(post.id)} className="action-button">Generate Referral</button> 
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
<button onClick={() => navigate('/admin/email-notifications', { state: { jobPostId: post.id } })} className="action-button">
  View Details
</button>
               
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={8}>No job posts found.</td> {/* colSpan +1 */}
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
    {showJobModal && jobPosts.find(post => post.id === showJobModal) && (
      <div className="modal">
        <div className="modal-content">
          <span className="close" onClick={() => setShowJobModal(null)}>×</span>
          <h3>Job Post Details</h3>
          <p><strong>Title:</strong> {jobPosts.find(post => post.id === showJobModal)?.title}</p>
          <p><strong>Description:</strong> <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(jobPosts.find(post => post.id === showJobModal)?.description || '') }} /></p>
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
  {showNotifyModal && (
  <div className="modal_notify">
    <div className="modal-content">
        <h3>Notify Candidates for Job Post ID: {notifyJobPostId}</h3>
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
          <th>Message</th>
          <th>User</th>
          <th onClick={() => handleIssuesSort('created_at')} style={{ cursor: 'pointer' }}>
            Created At {issuesSortColumn === 'created_at' ? (issuesSortDirection === 'asc' ? <FaArrowUp /> : <FaArrowDown />) : <FaArrowUp />}
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedIssues.length > 0 ? sortedIssues.map((fb) => (
          <tr key={fb.id}>
            <td>{fb.message}</td>
            <td>{fb.user?.username || 'Unknown'}</td>
            <td>{format(new Date(fb.created_at), 'PP')}</td>
          </tr>
        )) : (
          <tr>
            <td colSpan={3}>No issues feedback found.</td>
          </tr>
        )}
      </tbody>
    </table>

    <h4>Success Stories Feedback</h4>
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Rating</th>
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
            <td>{story.description}</td>
            <td>{story.rating}</td>
            <td>{story.user?.username || 'Unknown'}</td>
            <td>{format(new Date(story.created_at), 'PP')}</td>
            <td>
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
            <td colSpan={5}>No success stories found.</td>
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
    value={newCategoryName}
    onChange={(e) => setNewCategoryName(e.target.value)}
    placeholder="Enter main category name"
  />
<button onClick={() => handleCreateCategory(undefined)} className="action-button">
  Create Main
</button>
</div>

<div className="form-group">
  <h5>Create Subcategory</h5>
  <input
    type="text"
    value={newCategoryName}
    onChange={(e) => setNewCategoryName(e.target.value)}
    placeholder="Enter subcategory name"
  />
  <select
    value={newParentCategoryId}
    onChange={(e) => setNewParentCategoryId(e.target.value)}
    className="category-select"
  >
    <option value="">Select parent category</option>
    {categories
      .filter((category) => !category.parent_id)
      .map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
  </select>
<button onClick={() => handleCreateCategory(newParentCategoryId)} className="action-button"> 
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
        onClick={() => handleResolveComplaint(complaint.id)}
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
  <button className={selectedInterval === 'day' ? 'active' : ''} onClick={() => { setSelectedInterval('day'); handleRefresh(); }}>Day</button>
  <button className={selectedInterval === 'week' ? 'active' : ''} onClick={() => { setSelectedInterval('week'); handleRefresh(); }}>Week</button>
  <button className={selectedInterval === 'month' ? 'active' : ''} onClick={() => { setSelectedInterval('month'); handleRefresh(); }}>Month</button>
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
<button onClick={async () => {
  const data = await getReferralLinks({ jobId: referralFilterJobId.trim() || undefined, title: referralFilterJobTitle.trim() || undefined }); // Изменено: title вместо jobTitle, trim+undefined если пусто
  console.log('Referral Links data:', data);
  setReferralLinks(data || []);
}} className="action-button">
  Search
</button>
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>Job Title</th> 
          <th>Ref Code</th>
          <th>Full Link</th>
          <th>Clicks</th>
          <th>Registrations</th>
        </tr>
      </thead>
      <tbody>
        {referralLinks.length > 0 ? referralLinks.map((link) => (
          <>
<tr key={link.id} onClick={() => setExpandedReferral(expandedReferral === link.id ? null : link.id)} style={{ cursor: 'pointer' }}>
  <td>{link.job_post?.title || 'N/A'}</td>
  <td>{link.refCode}</td> 
  <td>{link.fullLink}</td>
  <td>{link.clicks}</td>
  <td>{link.registrations}</td>
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
                        {link.registrationsDetails?.map((reg, i) => ( // Добавь ? для optional
                          <tr key={i}>
                            <td>{reg.user.id}</td>
                            <td>{reg.user.username}</td>
                            <td>{reg.user.email}</td>
                            <td>{reg.user.role}</td>
                            <td>{format(new Date(reg.user.created_at), 'PP')}</td>
                          </tr>
                        )) || (
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
          </>
        )) : (
          <tr>
            <td colSpan={5}>No referral links found.</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
)}


{showReferralModal && (
  <div className="modal">
    <div className="modal-content">
      <span className="close" onClick={() => setShowReferralModal(null)}>×</span>
      <h3>Referral Link Details</h3>
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
    <div className="dashboard-section">
      <h3>Global Application Limit</h3>
      {fetchErrors.getGlobalApplicationLimit && <p className="error-message">{fetchErrors.getGlobalApplicationLimit}</p>}
      <p>Current Limit: {globalLimit !== null ? globalLimit : 'Not set'}</p>
      <button onClick={handleSetGlobalLimit} className="action-button">
        Set Global Limit
      </button>
    </div>
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
