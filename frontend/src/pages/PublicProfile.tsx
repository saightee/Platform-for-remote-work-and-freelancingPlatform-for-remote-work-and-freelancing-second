import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { getUserProfileById, getReviewsForUser, incrementProfileView } from '../services/api';
import { Profile, Review, Category } from '@types';
import { FaUserCircle } from 'react-icons/fa';
import { formatDateInTimezone } from '../utils/dateUtils';

const PublicProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
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
        const [profileData, reviewsData] = await Promise.all([
          getUserProfileById(id),
          getReviewsForUser(id),
        ]);
        console.log('Fetched profile:', profileData);
        setProfile(profileData);
        setReviews(reviewsData);
        if (profileData.role === 'jobseeker') {
          await incrementProfileView(id);
        }
      } catch (error: any) {
        console.error('Error fetching public profile:', error);
        setError(error.response?.data?.message || 'Failed to load profile. Please try again.');
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
      <div className="container profile-container">
        <h2>{profile.username}'s Profile</h2>
        <div className="profile-content">
          <div className="profile-details">
            <div className="profile-avatar-section">
              {profile.avatar ? (
                <img
                  src={`https://jobforge.net/backend${profile.avatar}`}
                  alt="Avatar"
                  className="profile-avatar"
                />
              ) : (
                <FaUserCircle className="profile-avatar-icon" />
              )}
            </div>
            <h3>{profile.username}</h3>
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Role:</strong> {profile.role}</p>
            <p><strong>Timezone:</strong> {profile.timezone || 'Not specified'}</p>
            <p><strong>Currency:</strong> {profile.currency || 'Not specified'}</p>
            {(profile.role === 'employer' || profile.role === 'jobseeker') && (
              <>
                <p>
                  <strong>Average Rating:</strong>{' '}
                  {profile.average_rating ? `${profile.average_rating} ★` : 'Not rated'}
                </p>
                <p><strong>Identity Verified:</strong> {profile.identity_verified ? 'Yes' : 'No'}</p>
              </>
            )}
            {profile.role === 'employer' && (
              <>
                <p><strong>Company Name:</strong> {profile.company_name || 'Not specified'}</p>
                <p><strong>Company Info:</strong> {profile.company_info || 'Not specified'}</p>
                <p>
                  <strong>Referral Link:</strong>{' '}
                  {profile.referral_link ? (
                    <a href={profile.referral_link} target="_blank" rel="noopener noreferrer">
                      {profile.referral_link}
                    </a>
                  ) : (
                    'Not specified'
                  )}
                </p>
              </>
            )}
            {profile.role === 'jobseeker' && (
              <>
                <p><strong>Skills:</strong> {profile.skills?.join(', ') || 'Not specified'}</p>
                <p>
                  <strong>Categories:</strong>{' '}
                  {(profile.categories || profile.skillCategories)?.map((category: Category) => category.name).join(', ') || 'Not specified'}
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
              </>
            )}
          </div>
          <div className="profile-actions">
            <h3>Reviews</h3>
            {reviews.length > 0 ? (
              <div className="review-list">
                {reviews.map((review) => (
                  <div key={review.id} className="review-item">
                    <div className="review-content">
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
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default PublicProfile;