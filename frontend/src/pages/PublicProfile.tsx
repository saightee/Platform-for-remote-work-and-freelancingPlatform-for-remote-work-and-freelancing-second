import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { getUserProfileById, getReviewsForUser, incrementProfileView } from '../services/api';
import { JobSeekerProfile, Review, Category } from '@types';
import { useRole } from '../context/RoleContext';
import { FaUserCircle } from 'react-icons/fa';
import { formatDateInTimezone } from '../utils/dateUtils';

const PublicProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile: currentUser } = useRole();
  const [profile, setProfile] = useState<JobSeekerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) {
        setError('Invalid user ID.');
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        console.log(`Fetching profile for ID: ${id}`);
        const [profileData, reviewsData] = await Promise.all([
          getUserProfileById(id),
          getReviewsForUser(id),
        ]);
        console.log('Fetched profile:', profileData);
        setProfile(profileData);
        setReviews(reviewsData || []);
        if (profileData.role === 'jobseeker') {
          await incrementProfileView(id);
        }
      } catch (error: any) {
        console.error('Error fetching public profile:', error);
        const errorMsg = error.response?.data?.message || 'Failed to load profile. User may not exist or the server is unavailable.';
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (isLoading) return <div>Loading...</div>;
  if (error || !profile) return <div className="error-message">{error || 'Profile not found'}</div>;

  return (
    <div>
      <Header />
      <div className="pp-container">
        <h2>{profile.username}'s Profile</h2>
        <div className="pp-content">
          <div className="pp-details">
            <div className="pp-avatar-section">
              {profile.avatar ? (
                <img
                  src={`https://jobforge.net${profile.avatar}`}
                  alt="Avatar"
                  className="pp-avatar"
                />
              ) : (
                <FaUserCircle className="pp-avatar-icon" />
              )}
            </div>
            <h3>{profile.username}</h3>
            <p><strong>Email:</strong> {profile.email || 'Not visible'}</p>
            <p><strong>Role:</strong> {profile.role}</p>
            <p><strong>Timezone:</strong> {profile.timezone || 'Not specified'}</p>
            <p><strong>Currency:</strong> {profile.currency || 'Not specified'}</p>
            <p><strong>Average Rating:</strong> {profile.average_rating ? `${profile.average_rating} ★` : 'Not rated'}</p>
            <p><strong>Identity Verified:</strong> {profile.identity_verified ? 'Yes' : 'No'}</p>
            <p><strong>Skills:</strong> {profile.skills?.join(', ') || 'Not specified'}</p>
            <p>
              <strong>Categories:</strong>{' '}
              {profile.categories?.map((category: Category) => category.name).join(', ') || 'Not specified'}
            </p>
            <p><strong>Experience:</strong> {profile.experience || 'Not specified'}</p>
            <p>
              <strong>Portfolio:</strong>{' '}
              {profile.portfolio ? (
                <a href={profile.portfolio} target="_blank" rel="noopener noreferrer">
                  {profile.portfolio}
                </a>
              ) : (
                'Not specified'
              )}
            </p>
            <p>
              <strong>Video Introduction:</strong>{' '}
              {profile.video_intro ? (
                <a href={profile.video_intro} target="_blank" rel="noopener noreferrer">
                  {profile.video_intro}
                </a>
              ) : (
                'Not specified'
              )}
            </p>
            <p><strong>Profile Views:</strong> {profile.profile_views || 0}</p>
          </div>
          <div className="pp-actions">
            <h3>Reviews</h3>
            {reviews.length > 0 ? (
              <div className="pp-review-list">
                {reviews.map((review) => (
                  <div key={review.id} className="pp-review-item">
                    <div className="pp-review-content">
                      <h4>{review.reviewer?.username || 'Anonymous'}</h4>
                      <p><strong>Rating:</strong> {review.rating} ★</p>
                      <p><strong>Comment:</strong> {review.comment}</p>
                      <p><strong>Job Application ID:</strong> {review.job_application?.id || 'Not specified'}</p>
                      <p><strong>Date:</strong> {formatDateInTimezone(review.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No reviews yet.</p>
            )}
            {currentUser && (
              <Link
                to={`/complaint?type=profile&id=${id}`}
                className="report-link"
              >
                Report Profile
              </Link>
            )}
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default PublicProfile;