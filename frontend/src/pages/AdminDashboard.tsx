import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { 
  getAllUsers, getUserById, updateUser, deleteUser, resetUserPassword,
  getAllJobPosts, updateJobPostAdmin, deleteJobPostAdmin, approveJobPost, flagJobPost,
  setJobPostApplicationLimitAdmin, getAllReviews, deleteReview, getAnalytics,
  getRegistrationStats, getGeographicDistribution, getTopEmployers, getTopJobseekers,
  verifyIdentity, setGlobalApplicationLimit, getGlobalApplicationLimit,
  addBlockedCountry, removeBlockedCountry, getBlockedCountries, getFeedback
} from '../services/api';
import { User, JobPost, Review, Feedback, BlockedCountry } from '@types';
import { useRole } from '../context/RoleContext';
import { format, zonedTimeToUtc } from 'date-fns-tz';
import { parseISO } from 'date-fns';

const AdminDashboard: React.FC = () => {
  const { profile, isLoading: profileLoading } = useRole();
  const [users, setUsers] = useState<User[]>([]);
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [blockedCountries, setBlockedCountries] = useState<BlockedCountry[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [registrationStats, setRegistrationStats] = useState<{ period: string; count: number }[]>([]);
  const [geographicDistribution, setGeographicDistribution] = useState<
    { country: string; count: number; percentage: string }[]
  >([]);
  const [topEmployers, setTopEmployers] = useState<
    { employer_id: string; username: string; job_count: number }[]
  >([]);
  const [topJobseekers, setTopJobseekers] = useState<
    { job_seeker_id: string; username: string; application_count: number }[]
  >([]);
  const [globalLimit, setGlobalLimit] = useState<number>(0);
  const [newLimit, setNewLimit] = useState<number>(0);
  const [countryCode, setCountryCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [showPendingOnly, setShowPendingOnly] = useState<boolean>(true); // Новый стейт для фильтра

  useEffect(() => {
    if (profileLoading) return;

    const typedProfile = profile as { role: string } | null;
    if (!typedProfile || typedProfile.role !== 'admin') {
      setError('This page is only available for Admins.');
      setIsAuthorized(false);
    } else {
      setIsAuthorized(true);
    }
  }, [profile, profileLoading]);

  useEffect(() => {
    if (!isAuthorized || !profile) return;

    const fetchData = async () => {
      try {
        const usersData = await getAllUsers({});
        setUsers(usersData);

        const jobPostsData = await getAllJobPosts({ pendingReview: showPendingOnly ? 'true' : undefined });
        setJobPosts(jobPostsData);

        const reviewsData = await getAllReviews();
        setReviews(reviewsData);

        const feedbacksData = await getFeedback();
        setFeedbacks(feedbacksData);

        const blockedCountriesData = await getBlockedCountries();
        setBlockedCountries(blockedCountriesData);

        const analyticsData = await getAnalytics();
        setAnalytics(analyticsData);

        const statsData = await getRegistrationStats({
          startDate: '2025-05-01',
          endDate: '2025-05-15',
          interval: 'day',
        });
        setRegistrationStats(statsData);

        const geoData = await getGeographicDistribution();
        setGeographicDistribution(geoData);

        const topEmployersData = await getTopEmployers();
        setTopEmployers(topEmployersData);

        const topJobseekersData = await getTopJobseekers();
        setTopJobseekers(topJobseekersData);

        const globalLimitData = await getGlobalApplicationLimit();
        setGlobalLimit(globalLimitData.globalApplicationLimit);
      } catch (error) {
        console.error('Error fetching admin data:', error);
        setError('Failed to load admin data. Please try again.');
      }
    };
    fetchData();
  }, [isAuthorized, profile, showPendingOnly]); // Добавляем showPendingOnly в зависимости

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(id);
        setUsers(users.filter((user) => user.id !== id));
        alert('User deleted successfully!');
      } catch (error) {
        console.error('Error deleting user:', error);
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
      } catch (error) {
        console.error('Error resetting password:', error);
        alert('Failed to reset password.');
      }
    }
  };

  const handleDeleteJobPost = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this job post?')) {
      try {
        await deleteJobPostAdmin(id);
        setJobPosts(jobPosts.filter((post) => post.id !== id));
        alert('Job post deleted successfully!');
      } catch (error) {
        console.error('Error deleting job post:', error);
        alert('Failed to delete job post.');
      }
    }
  };

  const handleApproveJobPost = async (id: string) => {
    try {
      const updatedPost = await approveJobPost(id);
      setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
      alert('Job post approved successfully!');
    } catch (error) {
      console.error('Error approving job post:', error);
      alert('Failed to approve job post.');
    }
  };

  const handleFlagJobPost = async (id: string) => {
    try {
      const updatedPost = await flagJobPost(id);
      setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
      alert('Job post flagged successfully!');
    } catch (error) {
      console.error('Error flagging job post:', error);
      alert('Failed to flag job post.');
    }
  };

  const handleSetJobPostLimit = async (id: string) => {
    try {
      await setJobPostApplicationLimitAdmin(id, newLimit);
      alert('Application limit set successfully!');
      setNewLimit(0);
    } catch (error) {
      console.error('Error setting application limit:', error);
      alert('Failed to set application limit.');
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        await deleteReview(id);
        setReviews(reviews.filter((review) => review.id !== id));
        alert('Review deleted successfully!');
      } catch (error) {
        console.error('Error deleting review:', error);
        alert('Failed to delete review.');
      }
    }
  };

  const handleVerifyIdentity = async (id: string, verify: boolean) => {
    try {
      await verifyIdentity(id, verify);
      alert(`Identity ${verify ? 'verified' : 'rejected'} successfully!`);
    } catch (error) {
      console.error('Error verifying identity:', error);
      alert('Failed to verify identity.');
    }
  };

  const handleSetGlobalLimit = async () => {
    try {
      const response = await setGlobalApplicationLimit(newLimit);
      setGlobalLimit(response.limit);
      alert('Global application limit set successfully!');
    } catch (error) {
      console.error('Error setting global limit:', error);
      alert('Failed to set global limit.');
    }
  };

  const handleAddBlockedCountry = async () => {
    try {
      const newCountry = await addBlockedCountry(countryCode);
      setBlockedCountries([...blockedCountries, newCountry]);
      setCountryCode('');
      alert('Country blocked successfully!');
    } catch (error) {
      console.error('Error blocking country:', error);
      alert('Failed to block country.');
    }
  };

  const handleRemoveBlockedCountry = async (countryCode: string) => {
    if (window.confirm(`Are you sure you want to unblock ${countryCode}?`)) {
      try {
        await removeBlockedCountry(countryCode);
        setBlockedCountries(blockedCountries.filter((country) => country.country_code !== countryCode));
        alert('Country unblocked successfully!');
      } catch (error) {
        console.error('Error unblocking country:', error);
        alert('Failed to unblock country.');
      }
    }
  };

  const formatDateInTimezone = (dateString?: string, timezone?: string): string => {
    if (!dateString) return 'Not specified';
    try {
      const date = parseISO(dateString);
      if (timezone) {
        const zonedDate = zonedTimeToUtc(date, timezone);
        return format(zonedDate, 'PPpp', { timeZone: timezone });
      }
      return format(date, 'PPpp');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  if (profileLoading) {
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

  if (!isAuthorized) {
    return (
      <div>
        <Header />
        <div className="container">
          <h2>Admin Dashboard</h2>
          <p>{error}</p>
        </div>
        <Footer />
        <Copyright />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="container admin-dashboard-container">
        <h2>Admin Dashboard</h2>
        {error && <p className="error-message">{error}</p>}

        <div className="admin-section">
          <h3>Users</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-section">
          <h3>Job Posts</h3>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={showPendingOnly}
                onChange={() => setShowPendingOnly(!showPendingOnly)}
              />
              Show only pending review
            </label>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Pending Review</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobPosts.map((post) => (
                <tr key={post.id}>
                  <td>{post.id}</td>
                  <td>{post.title}</td>
                  <td>{post.status}</td>
                  <td>{post.pending_review ? 'Yes' : 'No'}</td>
                  <td>
                    <button onClick={() => handleDeleteJobPost(post.id)} className="action-button danger">
                      Delete
                    </button>
                    <button onClick={() => handleApproveJobPost(post.id)} className="action-button success">
                      Approve
                    </button>
                    <button onClick={() => handleFlagJobPost(post.id)} className="action-button warning">
                      Flag for Review
                    </button>
                    <div className="form-group">
                      <label>Application Limit:</label>
                      <input
                        type="number"
                        value={newLimit}
                        onChange={(e) => setNewLimit(Number(e.target.value))}
                        min="0"
                      />
                      <button onClick={() => handleSetJobPostLimit(post.id)} className="action-button">
                        Set Limit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-section">
          <h3>Reviews</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Reviewer</th>
                <th>Reviewed</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id}>
                  <td>{review.id}</td>
                  <td>{review.reviewer_id}</td>
                  <td>{review.reviewed_id}</td>
                  <td>{review.rating}</td>
                  <td>{review.comment}</td>
                  <td>{review.created_at || 'Not specified'}</td>
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

        <div className="admin-section">
          <h3>Feedback</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Message</th>
                <th>Role</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((feedback) => (
                <tr key={feedback.id}>
                  <td>{feedback.id}</td>
                  <td>{feedback.user?.username || 'Anonymous'}</td>
                  <td>{feedback.message}</td>
                  <td>{feedback.role}</td>
                  <td>{feedback.created_at || 'Not specified'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-section">
          <h3>Blocked Countries</h3>
          <div className="form-group">
            <label>Add Blocked Country (Country Code):</label>
            <input
              type="text"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
            />
            <button onClick={handleAddBlockedCountry} className="action-button success">
              Add
            </button>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Country Code</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {blockedCountries.map((country) => (
                <tr key={country.id}>
                  <td>{country.country_code}</td>
                  <td>
                    <button onClick={() => handleRemoveBlockedCountry(country.country_code)} className="action-button danger">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-section">
          <h3>Analytics</h3>
          {analytics && (
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
          )}
        </div>

        <div className="admin-section">
          <h3>Registration Stats</h3>
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
        </div>

        <div className="admin-section">
          <h3>Geographic Distribution</h3>
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
                  <td>{dist.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-section">
          <h3>Top Employers</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Job Count</th>
              </tr>
            </thead>
            <tbody>
              {topEmployers.map((employer, index) => (
                <tr key={index}>
                  <td>{employer.username}</td>
                  <td>{employer.job_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-section">
          <h3>Top Jobseekers</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Application Count</th>
              </tr>
            </thead>
            <tbody>
              {topJobseekers.map((jobseeker, index) => (
                <tr key={index}>
                  <td>{jobseeker.username}</td>
                  <td>{jobseeker.application_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-section">
          <h3>Global Application Limit</h3>
          <p><strong>Current Limit:</strong> {globalLimit}</p>
          <div className="form-group">
            <label>New Global Limit:</label>
            <input
              type="number"
              value={newLimit}
              onChange={(e) => setNewLimit(Number(e.target.value))}
              min="0"
            />
            <button onClick={handleSetGlobalLimit} className="action-button success">
              Set Global Limit
            </button>
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default AdminDashboard;