import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { useRole } from '../context/RoleContext';
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
  resolveComplaint, getChatHistory, notifyCandidates, getApplicationsForJobPost
} from '../services/api';
import { User, JobPost, Review, Feedback, BlockedCountry, Category, PaginatedResponse, JobApplicationDetails } from '@types';
import { format } from 'date-fns';
import { AxiosError } from 'axios';

interface JobPostWithApplications {
  id: string;
  title: string;
  status: string;
  applicationCount: number;
  created_at: string;
}

interface OnlineUsers {
  jobseekers: number;
  employers: number;
}

interface RecentRegistrations {
  jobseekers: { id: string; email: string; username: string; role: string; created_at: string }[];
  employers: { id: string; email: string; username: string; role: string; created_at: string }[];
}

const AdminDashboard: React.FC = () => {
  const { currentRole } = useRole();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [jobPostsWithApps, setJobPostsWithApps] = useState<JobPostWithApplications[]>([]);
  const [jobApplications, setJobApplications] = useState<JobApplicationDetails[]>([]);
  const [selectedJobPostId, setSelectedJobPostId] = useState<string>('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [blockedCountries, setBlockedCountries] = useState<BlockedCountry[]>([]);
  const [newCountryCode, setNewCountryCode] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
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
  const [complaints, setComplaints] = useState<{
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
  }[]>([]);
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
  const [error, setError] = useState<string | null>(null);
  const [riskScoreData, setRiskScoreData] = useState<{ userId: string; riskScore: number; details: { duplicateIp: boolean; proxyDetected: boolean; duplicateFingerprint: boolean } } | null>(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [onlineStatuses, setOnlineStatuses] = useState<{ [key: string]: boolean }>({});
  const [fetchErrors, setFetchErrors] = useState<{ [key: string]: string }>({});
  const [userPage, setUserPage] = useState(1);
  const [userLimit] = useState(10);
  const [jobPostPage, setJobPostPage] = useState(1);
  const [jobPostLimit] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentRole || currentRole !== 'admin') {
        setError('This page is only available for admins.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setFetchErrors({});

        const requests = [
          getAllUsers({ page: userPage, limit: userLimit }),
          getAllJobPosts({ page: jobPostPage, limit: jobPostLimit }),
          getAllJobPosts({ status: 'Active', pendingReview: 'true', page: jobPostPage, limit: jobPostLimit }),
          getAllReviews(),
          getFeedback(),
          getBlockedCountries(),
          getCategories(),
          getAnalytics(),
          getRegistrationStats({ startDate: '2023-01-01', endDate: new Date().toISOString().split('T')[0], interval: 'month' }),
          getGeographicDistribution(),
          getTopEmployers(5),
          getTopJobseekers(5),
          getTopJobseekersByViews(5),
          getTopEmployersByPosts(5),
          getGrowthTrends({ period: '30d' }),
          getComplaints(),
          getGlobalApplicationLimit(),
          getOnlineUsers(),
          getRecentRegistrations({ limit: 5 }),
          getJobPostsWithApplications()
        ];

        type RequestResult =
          | PaginatedResponse<User>
          | PaginatedResponse<JobPost>
          | Review[]
          | Feedback[]
          | BlockedCountry[]
          | Category[]
          | { totalUsers: number; employers: number; jobSeekers: number; totalJobPosts: number; activeJobPosts: number; totalApplications: number; totalReviews: number }
          | { period: string; count: number }[]
          | { country: string; count: number; percentage: string }[]
          | { employer_id: string; username: string; job_count: number }[]
          | { job_seeker_id: string; username: string; application_count: number }[]
          | { userId: string; username: string; email: string; profileViews: number }[]
          | { userId: string; username: string; email: string; jobCount: number }[]
          | { registrations: { period: string; count: number }[]; jobPosts: { period: string; count: number }[] }
          | { id: string; complainant_id: string; complainant: { id: string; username: string; email: string; role: string }; job_post_id?: string; job_post?: { id: string; title: string; description: string }; profile_id?: string; reason: string; status: 'Pending' | 'Resolved' | 'Rejected'; created_at: string; resolution_comment?: string }[]
          | { globalApplicationLimit: number | null }
          | OnlineUsers
          | RecentRegistrations
          | JobPostWithApplications[];

        const results = await Promise.allSettled(requests);
        const errors: { [key: string]: string } = {};

        const endpoints = [
          'getAllUsers', 'getAllJobPosts', 'getPendingJobPosts', 'getAllReviews', 'getFeedback',
          'getBlockedCountries', 'getCategories', 'getAnalytics',
          'getRegistrationStats', 'geographicDistribution',
          'getTopEmployers', 'getTopJobseekers', 'getTopJobseekersByViews', 'getTopEmployersByPosts',
          'getGrowthTrends', 'getComplaints', 'getGlobalApplicationLimit',
          'getOnlineUsers', 'getRecentRegistrations', 'getJobPostsWithApplications'
        ];

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            console.log(`${endpoints[index]} succeeded:`, result.value);
            const value = result.value as RequestResult;
            switch (index) {
              case 0: setUsers((value as PaginatedResponse<User>).data || []); break;
              case 1: setJobPosts((value as PaginatedResponse<JobPost>).data || []); break;
              case 2: setJobPosts((value as PaginatedResponse<JobPost>).data || []); break;
              case 3: setReviews(value as Review[] || []); break;
              case 4: setFeedback(value as Feedback[] || []); break;
              case 5: setBlockedCountries(value as BlockedCountry[] || []); break;
              case 6: setCategories(value as Category[] || []); break;
              case 7: setAnalytics(value as typeof analytics || null); break;
              case 8: setRegistrationStats(value as { period: string; count: number }[] || []); break;
              case 9:
                setGeographicDistribution(value as { country: string; count: number; percentage: string }[] || []);
                const total = (value as { count: number }[]).reduce((sum, item) => sum + item.count, 0);
                const freelancers = (value as { country: string; count: number }[]).map(item => ({
                  country: item.country,
                  count: Math.round(item.count * 0.6)
                }));
                const businesses = (value as { country: string; count: number }[]).map(item => ({
                  country: item.country,
                  count: Math.round(item.count * 0.4)
                }));
                setFreelancerSignups(freelancers);
                setBusinessSignups(businesses);
                break;
              case 10: setTopEmployers(value as { employer_id: string; username: string; job_count: number }[] || []); break;
              case 11: setTopJobseekers(value as { job_seeker_id: string; username: string; application_count: number }[] || []); break;
              case 12: setTopJobseekersByViews(value as { userId: string; username: string; email: string; profileViews: number }[] || []); break;
              case 13: setTopEmployersByPosts(value as { userId: string; username: string; email: string; jobCount: number }[] || []); break;
              case 14: setGrowthTrends(value as typeof growthTrends || { registrations: [], jobPosts: [] }); break;
              case 15: setComplaints(value as typeof complaints || []); break;
              case 16: setGlobalLimit((value as { globalApplicationLimit: number | null }).globalApplicationLimit ?? null); break;
              case 17: setOnlineUsers(value as OnlineUsers || null); break;
              case 18: setRecentRegistrations(value as RecentRegistrations || { jobseekers: [], employers: [] }); break;
              case 19: setJobPostsWithApps(value as JobPostWithApplications[] || []); break;
            }
          } else {
            console.error(`${endpoints[index]} failed:`, result.reason);
            const errorMsg = (result.reason as AxiosError<{ message?: string }>)?.response?.data?.message || `Failed to load ${endpoints[index]} data`;
            errors[endpoints[index]] = errorMsg;
          }
        });

        if (Object.keys(errors).length > 0) {
          setFetchErrors(errors);
          setError('Some data failed to load. Check errors below.');
        } else {
          setError(null);
        }
      } catch (error) {
        console.error('Unexpected error fetching admin data:', error);
        setError('Unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentRole, userPage, jobPostPage]);

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
      const usersData = await getAllUsers({ page: userPage, limit: userLimit });
      setUsers(usersData.data || []);
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
        const usersData = await getAllUsers({ page: userPage, limit: userLimit });
        setUsers(usersData.data || []);
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
        const usersData = await getAllUsers({ page: userPage, limit: userLimit });
        setUsers(usersData.data || []);
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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      alert('Category name cannot be empty.');
      return;
    }
    try {
      await createCategory(newCategoryName);
      const updatedCategories = await getCategories();
      setCategories(updatedCategories || []);
      setNewCategoryName('');
      alert('Category created successfully!');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error creating category:', axiosError);
      alert(axiosError.response?.data?.message || 'Failed to create category.');
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
      setJobPostsWithApps(jobPostsWithApps.map((post) => (post.id === id ? { ...post, ...updatedPost } : post)));
      const updatedPosts = await getAllJobPosts({ status: 'Active', pendingReview: 'true', page: jobPostPage, limit: jobPostLimit });
      setJobPosts(updatedPosts.data || []);
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
      setJobPostsWithApps(jobPostsWithApps.map((post) => (post.id === id ? { ...post, ...updatedPost } : post)));
      const updatedPosts = await getAllJobPosts({ status: 'Active', pendingReview: 'true', page: jobPostPage, limit: jobPostLimit });
      setJobPosts(updatedPosts.data || []);
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
    const limit = prompt('Enter number of candidates to notify (e.g., 10):');
    const orderBy = prompt('Enter order (beginning, end, random):', 'random');
    if (!limit || isNaN(parseInt(limit)) || parseInt(limit) < 1) {
      alert('Please enter a valid number of candidates.');
      return;
    }
    if (!orderBy || !['beginning', 'end', 'random'].includes(orderBy)) {
      alert('Please enter a valid order: beginning, end, or random.');
      return;
    }
    try {
      const response = await notifyCandidates(id, {
        limit: parseInt(limit),
        orderBy: orderBy as 'beginning' | 'end' | 'random',
      });
      alert(`Notified ${response.sent} of ${response.total} candidates for job post ${response.jobPostId}`);
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
      setJobApplications(applications.filter(app => app.status === 'Accepted') || []);
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error fetching job applications:', axiosError);
      setError(axiosError.response?.data?.message || 'Failed to fetch job applications.');
    }
  };

  const handleViewChatHistory = async (jobApplicationId: string, page: number = 1) => {
    try {
      setError(null);
      const history = await getChatHistory(jobApplicationId, { page, limit: chatLimit });
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
        await setGlobalApplicationLimit(Number(limit));
        const limitData = await getGlobalApplicationLimit();
        setGlobalLimit(limitData.globalApplicationLimit ?? null);
        alert('Global application limit set successfully!');
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error('Error setting global limit:', axiosError);
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
      <div className="dashboard-wrapper">
        <div className="sidebar">
          <h2>Admin Panel</h2>
        </div>
        <div className="main-content">
          <Header />
          <div className="content">
            <h2>Admin Dashboard</h2>
            <p>Loading...</p>
          </div>
          <Footer />
          <Copyright />
        </div>
      </div>
    );
  }

  if (!currentRole || currentRole !== 'admin') {
    return (
      <div className="dashboard-wrapper">
        <div className="sidebar">
          <h2>Admin Panel</h2>
        </div>
        <div className="main-content">
          <Header />
          <div className="content">
            <h2>Admin Dashboard</h2>
            <p>This page is only available for admins.</p>
          </div>
          <Footer />
          <Copyright />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <div className="sidebar">
        <h2>Admin Panel</h2>
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
          <li className={activeTab === 'Settings' ? 'active' : ''} onClick={() => setActiveTab('Settings')}>
            Settings
          </li>
        </ul>
      </div>
      <div className="main-content">
        <Header />
        <div className="content">
          {error && <p className="error-message">{error}</p>}
          {Object.keys(fetchErrors).length > 0 && (
            <div className="error-details">
              <h4>Fetch Errors:</h4>
              <ul>
                {Object.entries(fetchErrors).map(([key, msg]) => (
                  <li key={key}>{key}: {msg}</li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'Dashboard' && (
            <div>
              <h2>Dashboard</h2>
              <div className="dashboard-section">
                <h3>Signups and Subscriptions</h3>
                <div className="stats-row">
                  <div className="stats-item">
                    <p><strong>Freelancer Signups by Country:</strong> {freelancerSignups.length > 0 ? freelancerSignups.map(item => `${item.country} ${item.count}`).join(' | ') : 'No data'}</p>
                  </div>
                  <div className="stats-item">
                    <p><strong>Business Signups by Country:</strong> {businessSignups.length > 0 ? businessSignups.map(item => `${item.country} ${item.count}`).join(' | ') : 'No data'}</p>
                  </div>
                </div>
                <div className="stats-row">
                  <div className="stats-item">
                    <p><strong>New Business Subscriptions:</strong> {businessSignups.length > 0 ? businessSignups.map(item => `${item.country} ${Math.round(item.count * 0.1)}`).join(' | ') : 'No data'}</p>
                  </div>
                  <div className="stats-item">
                    <p><strong>New Business Subscription by Country:</strong> {businessSignups.length > 0 ? businessSignups.map(item => `${item.country} $${Math.round(item.count * 90)}`).join(' | ') : 'No data'}</p>
                  </div>
                </div>
                <div className="stats-row">
                  <div className="stats-item">
                    <p><strong>Business Resubscriptions:</strong> {businessSignups.length > 0 ? businessSignups.map(item => `${item.country} ${Math.round(item.count * 0.1)}`).join(' | ') : 'No data'}</p>
                  </div>
                  <div className="stats-item">
                    <p><strong>Business Resubscription by Country:</strong> {businessSignups.length > 0 ? businessSignups.map(item => `${item.country} $${Math.round(item.count * 90)}`).join(' | ') : 'No data'}</p>
                  </div>
                </div>
              </div>
              <div className="dashboard-section">
                <h3>Online Users</h3>
                <p><strong>Freelancers Online:</strong> {onlineUsers?.jobseekers ?? 'N/A'}</p>
                <p><strong>Businesses Online:</strong> {onlineUsers?.employers ?? 'N/A'}</p>
              </div>
              <div className="dashboard-section">
                <h3>Recent Registrations</h3>
                <details>
                  <summary>Last 5 Freelancer Registrations Today (Total: {recentRegistrations.jobseekers.length})</summary>
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRegistrations.jobseekers.length > 0 ? recentRegistrations.jobseekers.map((user) => (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>{user.username}</td>
                          <td>{user.email}</td>
                          <td>{format(new Date(user.created_at), 'PP')}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4}>No recent freelancer registrations.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <button className="view-all-button">View All</button>
                </details>
                <details>
                  <summary>Last 5 Business Registrations Today (Total: {recentRegistrations.employers.length})</summary>
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRegistrations.employers.length > 0 ? recentRegistrations.employers.map((user) => (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>{user.username}</td>
                          <td>{user.email}</td>
                          <td>{format(new Date(user.created_at), 'PP')}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4}>No recent business registrations.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <button className="view-all-button">View All</button>
                </details>
              </div>
              <div className="dashboard-section">
                <h3>Job Postings with Applications</h3>
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Applications</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobPostsWithApps.length > 0 ? jobPostsWithApps.map((post) => (
                      <tr key={post.id}>
                        <td>{post.id}</td>
                        <td>{post.title}</td>
                        <td>{post.applicationCount}</td>
                        <td>{format(new Date(post.created_at), 'PP')}</td>
                        <td>
                          <button onClick={() => handleNotifyCandidates(post.id)} className="action-button">
                            Notify Candidates
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5}>No job postings with applications found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Users' && (
            <div>
              <h2>Users</h2>
              <button onClick={handleExportUsers} className="action-button">
                Export to CSV
              </button>
              {fetchErrors.getAllUsers && <p className="error-message">{fetchErrors.getAllUsers}</p>}
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Blocked Status</th>
                    <th>Online Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>{user.is_blocked ? 'Blocked' : 'Active'}</td>
                      <td>
                        {onlineStatuses[user.id] !== undefined ? (
                          onlineStatuses[user.id] ? 'Online' : 'Offline'
                        ) : (
                          <button
                            onClick={() => handleCheckOnlineStatus(user.id)}
                            className="action-button"
                          >
                            Check Status
                          </button>
                        )}
                      </td>
                      <td>
                        <button onClick={() => handleDeleteUser(user.id)} className="action-button danger">
                          Delete
                        </button>
                        <button onClick={() => handleResetPassword(user.id)} className="action-button">
                          Reset Password
                        </button>
                        <button onClick={() => handleVerifyIdentity(user.id, true)} className="action-button success">
                          Verify Identity
                        </button>
                        <button onClick={() => handleVerifyIdentity(user.id, false)} className="action-button warning">
                          Reject Identity
                        </button>
                        {user.is_blocked ? (
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
                        <button
                          onClick={() => handleViewRiskScore(user.id)}
                          className="action-button"
                        >
                          View Risk Score
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7}>No users found.</td>
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
                <span>Page {userPage}</span>
                <button
                  onClick={() => setUserPage(prev => prev + 1)}
                  disabled={users.length < userLimit}
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
              <h2>Job Posts</h2>
              {fetchErrors.getPendingJobPosts && <p className="error-message">{fetchErrors.getPendingJobPosts}</p>}
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Pending Review</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobPosts.length > 0 ? jobPosts.map((post) => (
                    <tr key={post.id}>
                      <td>{post.id}</td>
                      <td>{post.title}</td>
                      <td>{post.status}</td>
                      <td>{post.pending_review ? 'Yes' : 'No'}</td>
                      <td>{format(new Date(post.created_at), 'PP')}</td>
                      <td>
                        <button onClick={() => handleDeleteJobPost(post.id)} className="action-button danger">
                          Delete
                        </button>
                        <button onClick={() => handleApproveJobPost(post.id)} className="action-button success">
                          Approve
                        </button>
                        <button onClick={() => handleFlagJobPost(post.id)} className="action-button warning">
                          Flag
                        </button>
                        <button onClick={() => handleSetApplicationLimit(post.id)} className="action-button">
                          Set Application Limit
                        </button>
                        <button onClick={() => handleNotifyCandidates(post.id)} className="action-button success">
                          Notify Candidates
                        </button>
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
                <span>Page {jobPostPage}</span>
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
              <h2>Reviews</h2>
              {fetchErrors.getAllReviews && <p className="error-message">{fetchErrors.getAllReviews}</p>}
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Reviewer</th>
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
                      <td>{format(new Date(review.created_at), 'PP')}</td>
                      <td>
                        <button onClick={() => handleDeleteReview(review.id)} className="action-button danger">
                          Delete
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6}>No reviews found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'Feedback' && (
            <div>
              <h2>Feedback</h2>
              {fetchErrors.getFeedback && <p className="error-message">{fetchErrors.getFeedback}</p>}
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Message</th>
                    <th>User</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.length > 0 ? feedback.map((fb) => (
                    <tr key={fb.id}>
                      <td>{fb.id}</td>
                      <td>{fb.message}</td>
                      <td>{fb.user?.username || 'Unknown'}</td>
                      <td>{format(new Date(fb.created_at), 'PP')}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4}>No feedback found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'Categories' && (
            <div>
              <h2>Categories</h2>
              <form onSubmit={handleCreateCategory} className="form-group">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                />
                <button type="submit" className="action-button">
                  Create Category
                </button>
              </form>
              {fetchErrors.getCategories && <p className="error-message">{fetchErrors.getCategories}</p>}
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length > 0 ? categories.map((category) => (
                    <tr key={category.id}>
                      <td>{category.id}</td>
                      <td>{category.name}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={2}>No categories found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'Blocked Countries' && (
            <div>
              <h2>Blocked Countries</h2>
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
              <h2>Complaints</h2>
              {fetchErrors.getComplaints && <p className="error-message">{fetchErrors.getComplaints}</p>}
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Complainant</th>
                    <th>Target</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Resolution Comment</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.length > 0 ? complaints.map((complaint) => (
                    <tr key={complaint.id}>
                      <td>{complaint.id}</td>
                      <td>{complaint.complainant.username}</td>
                      <td>{complaint.job_post_id ? `Job Post: ${complaint.job_post?.title}` : complaint.profile_id ? `Profile ID: ${complaint.profile_id}` : 'N/A'}</td>
                      <td>{complaint.reason}</td>
                      <td>{complaint.status}</td>
                      <td>{complaint.resolution_comment || 'N/A'}</td>
                      <td>{format(new Date(complaint.created_at), 'PP')}</td>
                      <td>
                        {complaint.status === 'Pending' && (
                          <button onClick={() => handleResolveComplaint(complaint.id)} className="action-button">
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8}>No complaints found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'Chat History' && (
            <div>
              <h2>Chat History</h2>
              {error && <p className="error-message">{error}</p>}
              <div className="form-group">
                <label>Select Job Post:</label>
                <select
                  value={selectedJobPostId}
                  onChange={(e) => handleViewJobApplications(e.target.value)}
                >
                  <option value="">Select a job post</option>
                  {jobPostsWithApps.filter(post => post.applicationCount > 0).map(post => (
                    <option key={post.id} value={post.id}>
                      {post.title} (ID: {post.id})
                    </option>
                  ))}
                </select>
              </div>
              {selectedJobPostId && (
                <div className="form-group">
                  <label>Select Job Application ID:</label>
                  <select
                    value={selectedJobApplicationId}
                    onChange={(e) => handleViewChatHistory(e.target.value)}
                  >
                    <option value="">Select a job application</option>
                    {jobApplications.map((app: JobApplicationDetails) => (
                      <option key={app.applicationId} value={app.applicationId}>
                        {app.username} (ID: {app.applicationId})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {selectedJobApplicationId && (
                <>
                  <h3>Messages for Job Application ID: {selectedJobApplicationId}</h3>
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Sender</th>
                        <th>Recipient</th>
                        <th>Content</th>
                        <th>Created At</th>
                        <th>Read</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chatHistory.data.length > 0 ? chatHistory.data.map((message) => (
                        <tr key={message.id}>
                          <td>{message.id}</td>
                          <td>{message.sender.username}</td>
                          <td>{message.recipient.username}</td>
                          <td>{message.content}</td>
                          <td>{format(new Date(message.created_at), 'PPpp')}</td>
                          <td>{message.is_read ? 'Yes' : 'No'}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6}>No messages found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div className="pagination">
                    <button
                      onClick={() => handleViewChatHistory(selectedJobApplicationId, chatPage - 1)}
                      disabled={chatPage === 1}
                      className="action-button"
                    >
                      Previous
                    </button>
                    <span>Page {chatPage} of {Math.ceil(chatHistory.total / chatLimit)}</span>
                    <button
                      onClick={() => handleViewChatHistory(selectedJobApplicationId, chatPage + 1)}
                      disabled={chatPage >= Math.ceil(chatHistory.total / chatLimit)}
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
              <h2>Analytics</h2>
              {fetchErrors.getAnalytics && <p className="error-message">{fetchErrors.getAnalytics}</p>}
              {analytics ? (
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <p><strong>Total Users:</strong> {analytics.totalUsers}</p>
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
              ) : (
                <p>No analytics data available.</p>
              )}
              <h4>Registration Stats</h4>
              {fetchErrors.getRegistrationStats && <p className="error-message">{fetchErrors.getRegistrationStats}</p>}
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
                      <td>{stat.period}</td>
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
              <h4>Top Employers</h4>
              {fetchErrors.getTopEmployers && <p className="error-message">{fetchErrors.getTopEmployers}</p>}
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Job Count</th>
                  </tr>
                </thead>
                <tbody>
                  {topEmployers.length > 0 ? topEmployers.map((employer) => (
                    <tr key={employer.employer_id}>
                      <td>{employer.username}</td>
                      <td>{employer.job_count}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={2}>No top employers found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <h4>Top Employers by Job Posts</h4>
              {fetchErrors.getTopEmployersByPosts && <p className="error-message">{fetchErrors.getTopEmployersByPosts}</p>}
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Job Count</th>
                  </tr>
                </thead>
                <tbody>
                  {topEmployersByPosts.length > 0 ? topEmployersByPosts.map((employer) => (
                    <tr key={employer.userId}>
                      <td>{employer.username}</td>
                      <td>{employer.email}</td>
                      <td>{employer.jobCount}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3}>No top employers by posts found.</td>
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
                      <td>{jobseeker.application_count}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={2}>No top jobseekers found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
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

          {activeTab === 'Settings' && (
            <div>
              <h2>Settings</h2>
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
        </div>
        <Footer />
        <Copyright />
      </div>
    </div>
  );
};

export default AdminDashboard;
