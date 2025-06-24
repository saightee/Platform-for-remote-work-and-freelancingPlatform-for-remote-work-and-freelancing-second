import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { useRole } from '../context/RoleContext';
import {
  getAllJobPosts,
  approveJobPostModerator,
  flagJobPostModerator,
  getAllReviewsModerator,
  deleteReviewModerator,
  getComplaintsModerator,
  resolveComplaintModerator,
} from '../services/api';
import { JobPost, Review, PaginatedResponse } from '@types';
import { format } from 'date-fns';
import { AxiosError } from 'axios';

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
}

const ModeratorDashboard: React.FC = () => {
  const { currentRole } = useRole();
  const [activeTab, setActiveTab] = useState('Job Posts');
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
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
          getAllJobPosts({ status: 'Active', pendingReview: 'true' }),
          getAllReviewsModerator(),
          getComplaintsModerator(),
        ]);

        setJobPosts((jobPostsResult as PaginatedResponse<JobPost>).data || []);
        setReviews(reviewsResult || []);
        setComplaints(complaintsResult || []);
        setError(null);
      } catch (error) {
        console.error('Unexpected error fetching moderator data:', error);
        setError('Unexpected error occurred. Please try again.');
        setFetchErrors({
          general: 'Failed to load data',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentRole]);

  const handleApproveJobPost = async (id: string) => {
    try {
      const updatedPost = await approveJobPostModerator(id);
      setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
      alert('Job post approved successfully!');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error approving job post:', axiosError);
      alert(axiosError.response?.data?.message || 'Failed to approve job post.');
    }
  };

  const handleFlagJobPost = async (id: string) => {
    try {
      const updatedPost = await flagJobPostModerator(id);
      setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
      alert('Job post flagged successfully!');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error flagging job post:', axiosError);
      alert(axiosError.response?.data?.message || 'Failed to flag job post.');
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        await deleteReviewModerator(id);
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
      await resolveComplaintModerator(id, { status: status as 'Resolved' | 'Rejected', comment: comment || undefined });
      const updatedComplaints = await getComplaintsModerator();
      setComplaints(updatedComplaints || []);
      alert('Complaint resolved successfully!');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error resolving complaint:', axiosError);
      alert(axiosError.response?.data?.message || 'Failed to resolve complaint.');
    }
  };

  if (isLoading) {
    return (
      <div className="moderator-dashboard-wrapper">
        <div className="moderator-sidebar">
          <h2>Moderator Panel</h2>
        </div>
        <div className="moderator-main-content">
          <Header />
          <div className="moderator-content">
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
      <div className="moderator-dashboard-wrapper">
        <div className="moderator-sidebar">
          <h2>Moderator Panel</h2>
        </div>
        <div className="moderator-main-content">
          <Header />
          <div className="moderator-content">
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
    <div className="moderator-dashboard-wrapper">
      <div className="moderator-sidebar">
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
        </ul>
      </div>
      <div className="moderator-main-content">
        <Header />
        <div className="moderator-content">
          {error && <p className="moderator-error-message">{error}</p>}
          {Object.keys(fetchErrors).length > 0 && (
            <div className="moderator-error-details">
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
              {fetchErrors.getAllJobPosts && <p className="moderator-error-message">{fetchErrors.getAllJobPosts}</p>}
              <table className="moderator-dashboard-table">
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
                  {jobPosts.length > 0 ? (
                    jobPosts.map((post) => (
                      <tr key={post.id}>
                        <td>{post.id}</td>
                        <td>{post.title}</td>
                        <td>{post.status}</td>
                        <td>{post.pending_review ? 'Yes' : 'No'}</td>
                        <td>{format(new Date(post.created_at), 'PP')}</td>
                        <td>
                          <button
                            onClick={() => handleApproveJobPost(post.id)}
                            className="moderator-action-button success"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleFlagJobPost(post.id)}
                            className="moderator-action-button warning"
                          >
                            Flag
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
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
              {fetchErrors.getAllReviewsModerator && <p className="moderator-error-message">{fetchErrors.getAllReviewsModerator}</p>}
              <table className="moderator-dashboard-table">
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
                  {reviews.length > 0 ? (
                    reviews.map((review) => (
                      <tr key={review.id}>
                        <td>{review.id}</td>
                        <td>{review.rating}</td>
                        <td>{review.comment}</td>
                        <td>{review.reviewer?.username || 'Anonymous'}</td>
                        <td>{format(new Date(review.created_at), 'PP')}</td>
                        <td>
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            className="moderator-action-button danger"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
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
              {fetchErrors.getComplaintsModerator && <p className="moderator-error-message">{fetchErrors.getComplaintsModerator}</p>}
              <table className="moderator-dashboard-table">
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
                  {complaints.length > 0 ? (
                    complaints.map((complaint) => (
                      <tr key={complaint.id}>
                        <td>{complaint.id}</td>
                        <td>{complaint.complainant.username}</td>
                        <td>
                          {complaint.job_post_id
                            ? `Job Post: ${complaint.job_post?.title}`
                            : complaint.profile_id
                            ? `Profile ID: ${complaint.profile_id}`
                            : 'N/A'}
                        </td>
                        <td>{complaint.reason}</td>
                        <td>{complaint.status}</td>
                        <td>{complaint.resolution_comment || 'N/A'}</td>
                        <td>{format(new Date(complaint.created_at), 'PP')}</td>
                        <td>
                          {complaint.status === 'Pending' && (
                            <button
                              onClick={() => handleResolveComplaint(complaint.id)}
                              className="moderator-action-button"
                            >
                              Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8}>No complaints found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
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