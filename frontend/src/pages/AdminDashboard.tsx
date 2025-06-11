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
  getCategories, createCategory, getOnlineUsers, getRecentRegistrations, getJobPostsWithApplications
} from '../services/api';
import { User, JobPost, Review, Feedback, BlockedCountry, Category } from '@types';
import { format } from 'date-fns';
import { AxiosError } from 'axios';

const AdminDashboard: React.FC = () => {
  const { currentRole } = useRole();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [jobPostsWithApps, setJobPostsWithApps] = useState<{ id: string; title: string; status: string; applicationCount: number; created_at: string }[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [blockedCountries, setBlockedCountries] = useState<BlockedCountry[]>([]);
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
  const [onlineUsers, setOnlineUsers] = useState<{ jobseekers: number; employers: number } | null>(null);
  const [recentRegistrations, setRecentRegistrations] = useState<{
    jobseekers: { id: string; email: string; username: string; role: string; created_at: string }[];
    employers: { id: string; email: string; username: string; role: string; created_at: string }[];
  }>({ jobseekers: [], employers: [] });
  const [globalLimit, setGlobalLimit] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskScoreData, setRiskScoreData] = useState<{ userId: string; riskScore: number; details: { duplicateIp: boolean; proxyDetected: boolean; duplicateFingerprint: boolean } } | null>(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [onlineStatuses, setOnlineStatuses] = useState<{ [key: string]: boolean }>({});
  const [fetchErrors, setFetchErrors] = useState<{ [key: string]: string }>({});

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
          getAllUsers({}),
          getAllJobPosts({}),
          getAllJobPosts({ status: 'Active', pendingReview: 'true' }),
          getAllReviews(),
          getFeedback(),
          getBlockedCountries(),
          getCategories(),
          getAnalytics(),
          getRegistrationStats({ startDate: '2023-01-01', endDate: new Date().toISOString().split('T')[0], interval: 'month' }),
          getGeographicDistribution(),
          getTopEmployers(5),
          getTopJobseekers(5),
          getGlobalApplicationLimit(),
          getOnlineUsers(),
          getRecentRegistrations({ limit: 5 }),
          getJobPostsWithApplications()
        ];

        const results = await Promise.allSettled(requests);
        const errors: { [key: string]: string } = {};

        const endpoints = [
          'getAllUsers', 'getAllJobPosts', 'getPendingJobPosts', 'getAllReviews', 'getFeedback',
          'getBlockedCountries', 'getCategories', 'getAnalytics',
          'getRegistrationStats', 'getGeographicDistribution',
          'getTopEmployers', 'getTopJobseekers', 'getGlobalApplicationLimit',
          'getOnlineUsers', 'getRecentRegistrations', 'getJobPostsWithApplications'
        ];

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            console.log(`${endpoints[index]} succeeded:`, result.value);
            switch (index) {
              case 0: setUsers(result.value || []); break;
              case 1: setJobPosts(result.value || []); break;
              case 2: setJobPosts(result.value || []); break; // Для вкладки Job Posts
              case 3: setReviews(result.value || []); break;
              case 4: setFeedback(result.value || []); break;
              case 5: setBlockedCountries(result.value || []); break;
              case 6: setCategories(result.value || []); break;
              case 7: setAnalytics(result.value || null); break;
              case 8: setRegistrationStats(result.value || []); break;
              case 9:
                setGeographicDistribution(result.value || []);
                // Разделяем на фрилансеров и работодателей (заглушка, так как API возвращает общее распределение)
                const total = (result.value as { count: number }[]).reduce((sum, item) => sum + item.count, 0);
                const freelancers = (result.value as { country: string; count: number }[]).map(item => ({
                  country: item.country,
                  count: Math.round(item.count * 0.6) // Примерное разделение 60% фрилансеры
                }));
                const businesses = (result.value as { country: string; count: number }[]).map(item => ({
                  country: item.country,
                  count: Math.round(item.count * 0.4) // 40% работодатели
                }));
                setFreelancerSignups(freelancers);
                setBusinessSignups(businesses);
                break;
              case 10: setTopEmployers(result.value || []); break;
              case 11: setTopJobseekers(result.value || []); break;
              case 12: setGlobalLimit(result.value?.globalApplicationLimit ?? null); break;
              case 13: setOnlineUsers(result.value || null); break;
              case 14: setRecentRegistrations(result.value || { jobseekers: [], employers: [] }); break;
              case 15: setJobPostsWithApps(result.value || []); break;
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
  }, [currentRole]);

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
      const usersData = await getAllUsers({});
      setUsers(usersData || []);
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
        const usersData = await getAllUsers({});
        setUsers(usersData || []);
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
        const usersData = await getAllUsers({});
        setUsers(usersData || []);
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error('Error unblocking user:', axiosError);
        alert(axiosError.response?.data?.message || 'Failed to unblock user.');
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
        const updatedPosts = await getAllJobPosts({});
        setJobPosts(updatedPosts || []);
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

  const handleSendEmails = async (jobId: string) => {
    const count = prompt('Enter number of freelancers to email:');
    if (count && !isNaN(Number(count))) {
      try {
        // Заглушка, так как API не предоставляет endpoint
        alert(`Emails sent to ${count} freelancers for job ID ${jobId}! (This is a placeholder)`);
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error('Error sending emails:', axiosError);
        alert(axiosError.response?.data?.message || 'Failed to send emails.');
      }
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

  const handleSetGlobalLimit = async () => {
    const limit = prompt('Enter global application limit:');
    if (limit && !isNaN(Number(limit))) {
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
    }
  };

  const handleAddBlockedCountry = async () => {
    const countryCode = prompt('Enter country code (e.g., US, CA):');
    if (countryCode) {
      try {
        await addBlockedCountry(countryCode);
        const countries = await getBlockedCountries();
        setBlockedCountries(countries || []);
        alert('Country blocked successfully!');
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error('Error adding blocked country:', axiosError);
        alert(axiosError.response?.data?.message || 'Failed to block country.');
      }
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

              {/* Секция 2: Аналитика по странам */}
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

              {/* Секция 3: Онлайн-пользователи */}
              <div className="dashboard-section">
                <h3>Online Users</h3>
                <p><strong>Freelancers Online:</strong> {onlineUsers?.jobseekers ?? 'N/A'}</p>
                <p><strong>Businesses Online:</strong> {onlineUsers?.employers ?? 'N/A'}</p>
              </div>

              {/* Секция 4: Последние регистрации */}
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

              {/* Секция 5: Вакансии с заявками */}
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
                          <button onClick={() => handleSendEmails(post.id)} className="action-button">
                            Send Emails
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
                        <button
                          onClick={() => handleBlockUser(user.id, user.username)}
                          className="action-button danger"
                        >
                          Block
                        </button>
                        <button
                          onClick={() => handleUnblockUser(user.id, user.username)}
                          className="action-button success"
                        >
                          Unblock
                        </button>
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
                      <td colSpan={6}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
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
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6}>No job posts found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
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
              <button onClick={handleAddBlockedCountry} className="action-button">
                Add Blocked Country
              </button>
              {fetchErrors.getBlockedCountries && <p className="error-message">{fetchErrors.getBlockedCountries}</p>}
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Country Code</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedCountries.length > 0 ? blockedCountries.map((country) => (
                    <tr key={country.countryCode}>
                      <td>{country.countryCode}</td>
                      <td>
                        <button
                          onClick={() => handleRemoveBlockedCountry(country.countryCode)}
                          className="action-button danger"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={2}>No blocked countries found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
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
            </div>
          )}

          {activeTab === 'Settings' && (
            <div>
              <h2>Settings</h2>
              <div className="dashboard-section">
                <h3>Global Application Limit</h3>
                {fetchErrors.getGlobalApplicationLimit && <p className="error-message">{fetchErrors.getGlobalApplicationLimit}</p>}
                <p>Current Limit: {globalLimit ?? 'Not set'}</p>
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