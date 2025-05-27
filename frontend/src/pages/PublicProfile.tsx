import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { getUserProfileById, getReviewsForUser } from '../services/api';
import { Profile, SkillCategory, Review } from '@types';
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
        setProfile(profileData);
        setReviews(reviewsData);
      } catch (error: any) {
        console.error('Error fetching public profile:', error);
        setError(error.response?.data?.message || 'Failed to load profile.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!profile) return <div>Profile not found.</div>;

  return (
    <div>
      <Header />
      <div className="container profile-container">
        <h2>{profile.username}'s Profile (Role: {profile.role})</h2>
        <div className="profile-avatar-section">
          {profile.avatar ? (
            <img src={profile.avatar} alt="Avatar" className="profile-avatar" />
          ) : (
            <FaUserCircle className="profile-avatar-icon" />
          )}
        </div>
        <div>
          <p><strong>Username:</strong> {profile.username}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          {profile.role === 'employer' && (
            <>
              <p><strong>Company Name:</strong> {profile.company_name || 'Not specified'}</p>
              <p><strong>Company Info:</strong> {profile.company_info || 'Not specified'}</p>
              <p><strong>Referral Link:</strong> {profile.referral_link || 'Not specified'}</p>
            </>
          )}
          {profile.role === 'jobseeker' && (
            <>
              <p><strong>Skills:</strong> {profile.skills?.join(', ') || 'Not specified'}</p>
              <p>
                <strong>Skill Categories:</strong>{' '}
                {profile.skillCategories?.map((category: SkillCategory) => category.name).join(', ') || 'Not specified'}
              </p>
              <p><strong>Experience:</strong> {profile.experience || 'Not specified'}</p>
              <p><strong>Portfolio:</strong> {profile.portfolio || 'Not specified'}</p>
              <p><strong>Video Introduction:</strong> {profile.video_intro || 'Not specified'}</p>
            </>
          )}
          <p><strong>Timezone:</strong> {profile.timezone || 'Not specified'}</p>
          <p><strong>Currency:</strong> {profile.currency || 'Not specified'}</p>
          {(profile.role === 'employer' || profile.role === 'jobseeker') && (
            <>
              <p><strong>Average Rating:</strong> {profile.average_rating || 'Not rated'}</p>
              <p><strong>Identity Verified:</strong> {profile.identity_verified ? 'Yes' : 'No'}</p>
              <h3>Reviews</h3>
              {reviews.length > 0 ? (
                <ul>
                  {reviews.map((review) => (
                    <li key={review.id}>
                      <p><strong>Rating:</strong> {review.rating}</p>
                      <p><strong>Comment:</strong> {review.comment}</p>
                      <p><strong>Reviewer:</strong> {review.reviewer?.username || 'Anonymous'}</p>
                      <p><strong>Job Application ID:</strong> {review.job_application?.id || 'Not specified'}</p>
                      <p><strong>Date:</strong> {formatDateInTimezone(review.created_at)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No reviews yet.</p>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default PublicProfile;