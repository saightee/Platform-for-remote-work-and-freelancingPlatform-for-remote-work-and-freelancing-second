import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getProfile, updateProfile, uploadAvatar, uploadIdentityDocument, deleteAccount } from '../services/api';
import { Profile, SkillCategory } from '@types';
import { useRole } from '../context/RoleContext';
import Copyright from '../components/Copyright';
import { FaUserCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const { profile, refreshProfile } = useRole();
  const [profileData, setProfileData] = useState<Profile | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to view this page.');
      setIsLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const profileData = await getProfile();
        setProfileData(profileData);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (profile) {
      setProfileData(profile);
      setIsLoading(false);
    } else {
      fetchProfile();
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!profileData) return;
    try {
      setFormError(null);
      const updatedProfile = await updateProfile(profileData);
      setProfileData(updatedProfile);
      setIsEditing(false);
      await refreshProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setFormError(error.response?.data?.message || 'Failed to update profile.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    try {
      setFormError(null);
      await deleteAccount();
      localStorage.removeItem('token');
      setProfileData(null);
      navigate('/');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setFormError(error.response?.data?.message || 'Failed to delete account.');
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (['image/jpeg', 'image/jpg', 'image/png'].includes(file.type) && file.size <= 5 * 1024 * 1024) {
        setAvatarFile(file);
      } else {
        setFormError('Only JPEG, JPG, or PNG files up to 5MB are allowed.');
      }
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (
        ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type) &&
        file.size <= 10 * 1024 * 1024
      ) {
        setDocumentFile(file);
      } else {
        setFormError('Only JPEG, JPG, PNG, or PDF files up to 10MB are allowed.');
      }
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) {
      setFormError('Please select a file to upload.');
      return;
    }
    try {
      setFormError(null);
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      const updatedProfile = await uploadAvatar(formData);
      setProfileData(updatedProfile);
      setAvatarFile(null);
      await refreshProfile();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setFormError(error.response?.data?.message || 'Failed to upload avatar.');
    }
  };

  const handleUploadDocument = async () => {
    if (!documentFile) {
      setFormError('Please select a file to upload.');
      return;
    }
    try {
      setFormError(null);
      const formData = new FormData();
      formData.append('document', documentFile);
      const updatedProfile = await uploadIdentityDocument(formData);
      setProfileData(updatedProfile);
      setDocumentFile(null);
      await refreshProfile();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      setFormError(error.response?.data?.message || 'Failed to upload document.');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!profileData) return <div>Profile data is unavailable.</div>;

  return (
    <div>
      <Header />
      <div className="container profile-container">
        <h2>My Profile (Role: {profileData.role})</h2>
        <div className="profile-avatar-section">
          {profileData.avatar ? (
            <img src={profileData.avatar} alt="Avatar" className="profile-avatar" />
          ) : (
            <FaUserCircle className="profile-avatar-icon" />
          )}
        </div>
        <div>
          {formError && <p className="error-message">{formError}</p>}
          {isEditing ? (
            <>
              <div className="form-group">
                <label>Username:</label>
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                  placeholder="Enter your username"
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="Enter your email"
                />
              </div>
              {profileData.role === 'employer' && (
                <>
                  <div className="form-group">
                    <label>Company Name:</label>
                    <input
                      type="text"
                      value={profileData.company_name || ''}
                      onChange={(e) => setProfileData({ ...profileData, company_name: e.target.value })}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Company Info:</label>
                    <textarea
                      value={profileData.company_info || ''}
                      onChange={(e) => setProfileData({ ...profileData, company_info: e.target.value })}
                      placeholder="Enter company information"
                    />
                  </div>
                  <div className="form-group">
                    <label>Referral Link:</label>
                    <input
                      type="text"
                      value={profileData.referral_link || ''}
                      onChange={(e) => setProfileData({ ...profileData, referral_link: e.target.value })}
                      placeholder="Enter referral link"
                    />
                  </div>
                </>
              )}
              {profileData.role === 'jobseeker' && (
                <>
                  <div className="form-group">
                    <label>Skills (comma-separated):</label>
                    <input
                      type="text"
                      value={profileData.skills?.join(', ') || ''}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          skills: e.target.value.split(',').map((s) => s.trim()),
                        })
                      }
                      placeholder="e.g., JavaScript, Python"
                    />
                  </div>
                  <div className="form-group">
                    <label>Experience:</label>
                    <input
                      type="text"
                      value={profileData.experience || ''}
                      onChange={(e) => setProfileData({ ...profileData, experience: e.target.value })}
                      placeholder="Enter your experience"
                    />
                  </div>
                  <div className="form-group">
                    <label>Portfolio:</label>
                    <input
                      type="text"
                      value={profileData.portfolio || ''}
                      onChange={(e) => setProfileData({ ...profileData, portfolio: e.target.value })}
                      placeholder="Enter portfolio URL"
                    />
                  </div>
                  <div className="form-group">
                    <label>Video Introduction:</label>
                    <input
                      type="text"
                      value={profileData.video_intro || ''}
                      onChange={(e) => setProfileData({ ...profileData, video_intro: e.target.value })}
                      placeholder="Enter video intro URL"
                    />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Timezone:</label>
                <input
                  type="text"
                  value={profileData.timezone || ''}
                  onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                  placeholder="Enter your timezone"
                />
              </div>
              <div className="form-group">
                <label>Currency:</label>
                <input
                  type="text"
                  value={profileData.currency || ''}
                  onChange={(e) => setProfileData({ ...profileData, currency: e.target.value })}
                  placeholder="Enter your currency"
                />
              </div>
              <button onClick={handleUpdateProfile}>Save Profile</button>
              <button onClick={() => setIsEditing(false)} style={{ marginLeft: '10px' }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <p><strong>Username:</strong> {profileData.username}</p>
              <p><strong>Email:</strong> {profileData.email}</p>
              {profileData.role === 'employer' && (
                <>
                  <p><strong>Company Name:</strong> {profileData.company_name || 'Not specified'}</p>
                  <p><strong>Company Info:</strong> {profileData.company_info || 'Not specified'}</p>
                  <p><strong>Referral Link:</strong> {profileData.referral_link || 'Not specified'}</p>
                </>
              )}
              {profileData.role === 'jobseeker' && (
                <>
                  <p><strong>Skills:</strong> {profileData.skills?.join(', ') || 'Not specified'}</p>
                  <p>
                    <strong>Skill Categories:</strong>{' '}
                    {profileData.skillCategories?.map((category: SkillCategory) => category.name).join(', ') || 'Not specified'}
                  </p>
                  <p><strong>Experience:</strong> {profileData.experience || 'Not specified'}</p>
                  <p><strong>Portfolio:</strong> {profileData.portfolio || 'Not specified'}</p>
                  <p><strong>Video Introduction:</strong> {profileData.video_intro || 'Not specified'}</p>
                </>
              )}
              {(profileData.role === 'employer' || profileData.role === 'jobseeker') && (
                <>
                  <p><strong>Average Rating:</strong> {profileData.average_rating || 'Not rated'}</p>
                  <p><strong>Identity Verified:</strong> {profileData.identity_verified ? 'Yes' : 'No'}</p>
                  <h3>Reviews</h3>
                  {profileData.reviews?.length ? (
                    <ul>
                      {profileData.reviews.map((review) => (
                        <li key={review.id}>
                          <p><strong>Rating:</strong> {review.rating}</p>
                          <p><strong>Comment:</strong> {review.comment}</p>
                          <p><strong>Reviewer:</strong> {review.reviewer?.username || 'Anonymous'}</p>
                          <p><strong>Date:</strong> {review.created_at}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No reviews yet.</p>
                  )}
                </>
              )}
              <p><strong>Reviews:</strong> <Link to={`/reviews/${profileData.id}`}>View all reviews</Link></p>
              <button onClick={() => setIsEditing(true)} className="action-button">
                Edit Profile
              </button>
              <button
                onClick={handleDeleteAccount}
                className="action-button danger"
                style={{ marginLeft: '10px' }}
              >
                Delete Account
              </button>
            </>
          )}
        </div>

        <h3>Upload Avatar</h3>
        <div className="form-group avatar-upload-group">
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleAvatarChange}
          />
          <button onClick={handleUploadAvatar} disabled={!avatarFile}>
            Upload Avatar
          </button>
        </div>

        {(profileData.role === 'jobseeker' || profileData.role === 'employer') && (
          <>
            <h3>Upload Identity Document</h3>
            <div className="form-group">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handleDocumentChange}
              />
              <button onClick={handleUploadDocument} disabled={!documentFile}>
                Upload Document
              </button>
            </div>
          </>
        )}
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default ProfilePage;