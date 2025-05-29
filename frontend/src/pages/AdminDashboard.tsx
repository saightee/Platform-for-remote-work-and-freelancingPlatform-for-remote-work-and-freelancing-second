import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { useRole } from '../context/RoleContext';
import {
  getAllUsers, deleteUser, resetUserPassword,
  getAllJobPosts, deleteJobPostAdmin, approveJobPost, flagJobPost,
  setJobPostApplicationLimitAdmin, getAllReviews, deleteReview, getAnalytics,
  getRegistrationStats, getGeographicDistribution, getTopEmployers, getTopJobseekers,
  verifyIdentity, setGlobalApplicationLimit, getGlobalApplicationLimit,
  addBlockedCountry, removeBlockedCountry, getBlockedCountries, getFeedback,
  blockUser, unblockUser, getUserRiskScore, exportUsersToCSV, getUserOnlineStatus,
  getCategories, createCategory
} from '../services/api';
import { User, JobPost, Review, Feedback, BlockedCountry, Category } from '@types';
import { format } from 'date-fns';

const AdminDashboard: React.FC = () => {
  const { profile } = useRole();
  const [users, setUsers] = useState<User[]>([]);
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
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
  const [topEmployers, setTopEmployers] = useState<{ employer_id: string; username: string; job_count: number }[]>([]);
  const [topJobseekers, setTopJobseekers] = useState<{ job_seeker_id: string; username: string; application_count: number }[]>([]);
  const [globalLimit, setGlobalLimit] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskScoreData, setRiskScoreData] = useState<{ userId: string; riskScore: number; details: { duplicateIp: boolean; proxyDetected: boolean; duplicateFingerprint: boolean } } | null>(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [onlineStatuses, setOnlineStatuses] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!profile || profile.role !== 'admin') {
        setError('This page is only available for admins.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [
          usersData, jobPostsData, reviewsData, feedbackData, blockedCountriesData,
          categoriesData, analyticsData, registrationStatsData, geographicData,
          topEmployersData, topJobseekersData, globalLimitData
        ] = await Promise.all([
          getAllUsers({}),
          getAllJobPosts({}),
          getAllReviews(),
          getFeedback(),
          getBlockedCountries(),
          getCategories(),
          getAnalytics(),
          getRegistrationStats({ startDate: '2023-01-01', endDate: '2025-12-31', interval: 'month' }),
          getGeographicDistribution(),
          getTopEmployers(5),
          getTopJobseekers(5),
          getGlobalApplicationLimit()
        ]);

        console.log('Blocked countries data:', blockedCountriesData);
        console.log('Categories data:', categoriesData);

        setUsers(usersData);
        setJobPosts(jobPostsData);
        setReviews(reviewsData);
        setFeedback(feedbackData);
        setBlockedCountries(blockedCountriesData);
        setCategories(categoriesData);
        setAnalytics(analyticsData);
        setRegistrationStats(registrationStatsData);
        setGeographicDistribution(geographicData);
        setTopEmployers(topEmployersData);
        setTopJobseekers(topJobseekersData);
        setGlobalLimit(globalLimitData.globalApplicationLimit);
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError('Failed to load admin data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [profile]);

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(id);
        setUsers(users.filter((user) => user.id !== id));
        alert('User deleted successfully!');
      } catch (err) {
        console.error('Error deleting user:', err);
        alert('Failed to delete user.');
      }
    }
  };

  const handleResetPassword = async (id: string) => {
    const newPassword = prompt('Enter new password:');
    if (newPassword) {
      try {
        await resetUserPassword(id, newPassword);
        alert('Password reset successfully!');
      } catch (err) {
        console.error('Error resetting password:', err);
        alert('Failed to reset password.');
      }
    }
  };

  const handleVerifyIdentity = async (id: string, verify: boolean) => {
    try {
      await verifyIdentity(id, verify);
      alert(`Identity ${verify ? 'verified' : 'rejected'} successfully!`);
      const usersData = await getAllUsers({});
      setUsers(usersData);
    } catch (err) {
      console.error('Error verifying identity:', err);
      alert('Failed to verify identity.');
    }
  };

  const handleBlockUser = async (id: string, username: string) => {
    if (window.confirm(`Are you sure you want to block ${username}?`)) {
      try {
        await blockUser(id);
        alert('User blocked successfully!');
        const usersData = await getAllUsers({});
        setUsers(usersData);
      } catch (error) {
        console.error('Error blocking user:', error);
        alert('Failed to block user.');
      }
    }
  };

  const handleUnblockUser = async (id: string, username: string) => {
    if (window.confirm(`Are you sure you want to unblock ${username}?`)) {
      try {
        await unblockUser(id);
        alert('User unblocked successfully!');
        const usersData = await getAllUsers({});
        setUsers(usersData);
      } catch (error) {
        console.error('Error unblocking user:', error);
        alert('Failed to unblock user.');
      }
    }
  };

  const handleViewRiskScore = async (id: string) => {
    try {
      const data = await getUserRiskScore(id);
      setRiskScoreData(data);
      setShowRiskModal(true);
    } catch (error) {
      console.error('Error fetching risk score:', error);
      alert('Failed to fetch risk score.');
    }
  };

  const handleCheckOnlineStatus = async (id: string) => {
    try {
      const { isOnline } = await getUserOnlineStatus(id);
      setOnlineStatuses((prev) => ({ ...prev, [id]: isOnline }));
    } catch (error) {
      console.error('Error checking online status:', error);
      alert('Failed to check online status.');
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
      setCategories(updatedCategories);
      setNewCategoryName('');
      alert('Category created successfully!');
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category.');
    }
  };

  const handleDeleteJobPost = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this job post?')) {
      try {
        await deleteJobPostAdmin(id);
        setJobPosts(jobPosts.filter((post) => post.id !== id));
        alert('Job post deleted successfully!');
      } catch (err) {
        console.error('Error deleting job post:', err);
        alert('Failed to delete job post.');
      }
    }
  };

  const handleApproveJobPost = async (id: string) => {
    try {
      const updatedPost = await approveJobPost(id);
      setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
      alert('Job post approved successfully!');
    } catch (err) {
      console.error('Error approving job post:', err);
      alert('Failed to approve job post.');
    }
  };

  const handleFlagJobPost = async (id: string) => {
    try {
      const updatedPost = await flagJobPost(id);
      setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
      alert('Job post flagged successfully!');
    } catch (err) {
      console.error('Error flagging job post:', err);
      alert('Failed to flag job post.');
    }
  };

  const handleSetApplicationLimit = async (id: string) => {
    const limit = prompt('Enter application limit:');
    if (limit && !isNaN(Number(limit))) {
      try {
        await setJobPostApplicationLimitAdmin(id, Number(limit));
        const updatedPosts = await getAllJobPosts({});
        setJobPosts(updatedPosts);
        alert('Application limit set successfully!');
      } catch (err) {
        console.error('Error setting application limit:', err);
        alert('Failed to set application limit.');
      }
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        await deleteReview(id);
        setReviews(reviews.filter((review) => review.id !== id));
        alert('Review deleted successfully!');
      } catch (err) {
        console.error('Error deleting review:', err);
        alert('Failed to delete review.');
      }
    }
  };

  const handleSetGlobalLimit = async () => {
    const limit = prompt('Enter global application limit:');
    if (limit && !isNaN(Number(limit))) {
      try {
        await setGlobalApplicationLimit(Number(limit));
        const limitData = await getGlobalApplicationLimit();
        setGlobalLimit(limitData.globalApplicationLimit);
        alert('Global application limit set successfully!');
      } catch (err) {
        console.error('Error setting global limit:', err);
        alert('Failed to set global limit.');
      }
    }
  };

  const handleAddBlockedCountry = async () => {
    const countryCode = prompt('Enter country code (e.g., US, CA):');
    if (countryCode) {
      try {
        await addBlockedCountry(countryCode);
        const countries = await getBlockedCountries();
        console.log('Updated blocked countries:', countries);
        setBlockedCountries(countries);
        alert('Country blocked successfully!');
      } catch (err) {
        console.error('Error adding blocked country:', err);
        alert('Failed to block country.');
      }
    }
  };

  const handleRemoveBlockedCountry = async (countryCode: string) => {
    if (window.confirm(`Are you sure you want to unblock ${countryCode}?`)) {
      try {
        await removeBlockedCountry(countryCode);
        const updatedCountries = await getBlockedCountries();
        console.log('Updated blocked countries after removal:', updatedCountries);
        setBlockedCountries(updatedCountries);
        alert('Country unblocked successfully!');
      } catch (err) {
        console.error('Error removing blocked country:', err);
        alert('Failed to unblock country.');
      }
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="container">
          <h2>Admin Dashboard</h2>
          <p>Loading...</p>
        </div>
        <Footer />
        <Copyright />
      </div>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div>
        <Header />
        <div className="container">
          <h2>Admin Dashboard</h2>
          <p>This page is only available for admins.</p>
        </div>
        <Footer />
        <Copyright />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="container admin-container">
        <h2>Admin Dashboard</h2>
        {error && <p className="error-message">{error}</p>}

        {/* Users */}
        <div className="admin-section">
          <h3>Users</h3>
          <button
            onClick={async () => {
              try {
                await exportUsersToCSV();
                alert('Users exported successfully!');
              } catch (error) {
                console.error('Error exporting users:', error);
                alert('Failed to export users.');
              }
            }}
            className="action-button"
          >
            Export to CSV
          </button>
          <table className="admin-table">
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
              {users.map((user) => (
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Job Posts */}
        <div className="admin-section">
          <h3>Job Posts</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobPosts.map((post) => (
                <tr key={post.id}>
                  <td>{post.id}</td>
                  <td>{post.title}</td>
                  <td>{post.status}</td>
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Reviews */}
        <div className="admin-section">
          <h3>Reviews</h3>
          <table className="admin-table">
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
              {reviews.map((review) => (
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Feedback */}
        <div className="admin-section">
          <h3>Feedback</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Message</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((fb) => (
                <tr key={fb.id}>
                  <td>{fb.id}</td>
                  <td>{fb.message}</td>
                  <td>{format(new Date(fb.created_at), 'PP')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Categories */}
        <div className="admin-section">
          <h3>Categories</h3>
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
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.id}</td>
                  <td>{category.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Blocked Countries */}
        <div className="admin-section">
          <h3>Blocked Countries</h3>
          <button onClick={handleAddBlockedCountry} className="action-button">
            Add Blocked Country
          </button>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Country Code</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {blockedCountries.map((country) => (
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Analytics */}
        <div className="admin-section">
          <h3>Analytics</h3>
          {analytics && (
            <div>
              <p><strong>Total Users:</strong> {analytics.totalUsers}</p>
              <p><strong>Employers:</strong> {analytics.employers}</p>
              <p><strong>Job Seekers:</strong> {analytics.jobSeekers}</p>
              <p><strong>Total Job Posts:</strong> {analytics.totalJobPosts}</p>
              <p><strong>Active Job Posts:</strong> {analytics.activeJobPosts}</p>
              <p><strong>Total Applications:</strong> {analytics.totalApplications}</p>
              <p><strong>Total Reviews:</strong> {analytics.totalReviews}</p>
            </div>
          )}
          <h4>Registration Stats</h4>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {registrationStats.map((stat, index) => (
                <tr key={index}>
                  <td>{stat.period}</td>
                  <td>{stat.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4>Geographic Distribution</h4>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Country</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {geographicDistribution.map((dist, index) => (
                <tr key={index}>
                  <td>{dist.country}</td>
                  <td>{dist.count}</td>
                  <td>{dist.percentage}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4>Top Employers</h4>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Job Count</th>
              </tr>
            </thead>
            <tbody>
              {topEmployers.map((employer) => (
                <tr key={employer.employer_id}>
                  <td>{employer.username}</td>
                  <td>{employer.job_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4>Top Jobseekers</h4>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Application Count</th>
              </tr>
            </thead>
            <tbody>
              {topJobseekers.map((jobseeker) => (
                <tr key={jobseeker.job_seeker_id}>
                  <td>{jobseeker.username}</td>
                  <td>{jobseeker.application_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Global Application Limit */}
        <div className="admin-section">
          <h3>Global Application Limit</h3>
          <p>Current Limit: {globalLimit ?? 'Not set'}</p>
          <button onClick={handleSetGlobalLimit} className="action-button">
            Set Global Limit
          </button>
        </div>
      </div>

      {/* Risk Score Modal */}
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

      <Footer />
      <Copyright />
    </div>
  );
};

export default AdminDashboard;