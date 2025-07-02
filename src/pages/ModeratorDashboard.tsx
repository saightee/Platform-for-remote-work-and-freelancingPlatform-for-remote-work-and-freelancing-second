import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { useRole } from '../context/RoleContext';
import {
  getAllJobPosts,
  approveJobPost,
  flagJobPost,
  deleteJobPostAdmin,
  setJobPostApplicationLimitAdmin,
  getAllReviewsModerator,
  deleteReview,
  getComplaintsModerator,
  resolveComplaint,
  getApplicationsForJobPost,
  getChatHistory,
} from '../services/api';
import { JobPost, Review, PaginatedResponse, JobApplicationDetails } from '@types';
import { format } from 'date-fns';
import { AxiosError } from 'axios';

const ModeratorDashboard: React.FC = () => {
  const { currentRole } = useRole();
  const [activeTab, setActiveTab] = useState('Job Posts');
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [jobPostPage, setJobPostPage] = useState(1);
  const [jobPostLimit] = useState(10);
  const [reviews, setReviews] = useState<Review[]>([]);
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
  const [jobApplications, setJobApplications] = useState<JobApplicationDetails[]>([]);
  const [selectedJobPostId, setSelectedJobPostId] = useState<string>('');
  const [selectedJobApplicationId, setSelectedJobApplicationId] = useState<string>('');
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
  const [chatPage, setChatPage] = useState(1);
  const [chatLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchErrors, setFetchErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!currentRole || !['moderator', 'admin'].includes(currentRole)) {
        setError('This page is only available for moderators and admins.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setFetchErrors({});
        const [jobPostsResult, reviewsResult, complaintsResult] = await Promise.all([
          getAllJobPosts({ status: 'Active', pendingReview: 'true', page: jobPostPage, limit: jobPostLimit }),
          getAllReviewsModerator(),
          getComplaintsModerator(),
        ]);

        setJobPosts((jobPostsResult as PaginatedResponse<JobPost>).data || []);
        setReviews(reviewsResult || []);
        setComplaints(complaintsResult || []);
        setError(null);
      } catch (error) {
        console.error('Unexpected error fetching moderator data:', error);
        const axiosError = error as AxiosError<{ message?: string }>;
        setError(axiosError.response?.data?.message || 'Unexpected error occurred. Please try again.');
        setFetchErrors({
          general: axiosError.response?.data?.message || 'Failed to load data',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentRole, jobPostPage]);

  const handleDeleteJobPost = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this job post?')) {
      try {
        await deleteJobPostAdmin(id);
        setJobPosts(jobPosts.filter((post) => post.id !== id));
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
      const updatedPosts = await getAllJobPosts({ status: 'Active', pendingReview: 'true', page: jobPostPage, limit: jobPostLimit });
      setJobPosts((updatedPosts as PaginatedResponse<JobPost>).data || []);
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
      const updatedPosts = await getAllJobPosts({ status: 'Active', pendingReview: 'true', page: jobPostPage, limit: jobPostLimit });
      setJobPosts((updatedPosts as PaginatedResponse<JobPost>).data || []);
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
        const updatedPosts = await getAllJobPosts({ status: 'Active', pendingReview: 'true', page: jobPostPage, limit: jobPostLimit });
        setJobPosts((updatedPosts as PaginatedResponse<JobPost>).data || []);
        alert('Application limit set successfully!');
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error('Error setting application limit:', axiosError);
        alert(axiosError.response?.data?.message || 'Failed to set application limit.');
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

  const handleResolveComplaint = async (id: string) => {
    const status = prompt('Enter status (Resolved or Rejected):');
    const comment = prompt('Enter resolution comment (optional):');
    if (!status || !['Resolved', 'Rejected'].includes(status)) {
      alert('Invalid status. Must be Resolved or Rejected.');
      return;
    }
    try {
      await resolveComplaint(id, { status: status as 'Resolved' | 'Rejected', comment: comment || undefined });
      const updatedComplaints = await getComplaintsModerator();
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

  if (isLoading) {
    return (
      <div className="dashboard-wrapper">
        <div className="sidebar">
          <h2>Moderator Panel</h2>
        </div>
        <div className="main-content">
          <Header />
          <div className="content">
            <h2>Moderator Dashboard</h2>
            <p>Loading...</p>
          </div>
          <Footer />
          <Copyright />
        </div>
      </div>
    );
  }

  if (!currentRole || !['moderator', 'admin'].includes(currentRole)) {
    return (
      <div className="dashboard-wrapper">
        <div className="sidebar">
          <h2>Moderator Panel</h2>
        </div>
        <div className="main-content">
          <Header />
          <div className="content">
            <h2>Moderator Dashboard</h2>
            <p>This page is only available for moderators and admins.</p>
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
        <h2>Moderator Panel</h2>
        <ul>
          <li className={activeTab === 'Job Posts' ? 'active' : ''} onClick={() => setActiveTab('Job Posts')}>
            Job Posts
          </li>
          <li className={activeTab === 'Reviews' ? 'active' : ''} onClick={() => setActiveTab('Reviews')}>
            Reviews
          </li>
          <li className={activeTab === 'Complaints' ? 'active' : ''} onClick={() => setActiveTab('Complaints')}>
            Complaints
          </li>
          <li className={activeTab === 'Chat History' ? 'active' : ''} onClick={() => setActiveTab('Chat History')}>
            Chat History
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

          {activeTab === 'Job Posts' && (
            <div>
              <h2>Job Posts</h2>
              {fetchErrors.general && <p className="error-message">{fetchErrors.general}</p>}
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
              {fetchErrors.general && <p className="error-message">{fetchErrors.general}</p>}
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

          {activeTab === 'Complaints' && (
            <div>
              <h2>Complaints</h2>
              {fetchErrors.general && <p className="error-message">{fetchErrors.general}</p>}
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
                  {jobPosts.map(post => (
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
                    {jobApplications.map(app => (
                      <option key={app.id} value={app.id}>
                        {app.username} (ID: {app.id})
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
        </div>
        <Footer />
        <Copyright />
      </div>
    </div>
  );
};

export default ModeratorDashboard;