import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getProfile, updateProfile, uploadAvatar, uploadIdentityDocument, deleteAccount, getCategories } from '../services/api';
import { Profile, Category, JobSeekerProfile, EmployerProfile } from '@types';
import { useRole } from '../context/RoleContext';
import Copyright from '../components/Copyright';
import { FaUserCircle, FaFilePdf } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const { profile, refreshProfile } = useRole();
  const [profileData, setProfileData] = useState<Profile | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
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

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [profileData, categoriesData] = await Promise.all([
          getProfile(),
          getCategories(),
        ]);
        setProfileData(profileData);
        setCategories(categoriesData || []);
        if (profileData.role === 'jobseeker') {
          setSelectedCategoryIds(
            (profileData as JobSeekerProfile).categories?.map((cat: Category) => cat.id) || []
          );
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setError(error.response?.data?.message || 'Failed to load profile or categories.');
      } finally {
        setIsLoading(false);
      }
    };

    if (profile) {
      setProfileData(profile);
      fetchData();
    } else {
      fetchData();
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!profileData) return;
    try {
      setFormError(null);
      if (profileData.role === 'jobseeker') {
        const updatedData: Partial<JobSeekerProfile> = {
          username: profileData.username,
          email: profileData.email,
          timezone: profileData.timezone,
          currency: profileData.currency,
          skills: (profileData as JobSeekerProfile).skills,
          experience: (profileData as JobSeekerProfile).experience,
          portfolio: (profileData as JobSeekerProfile).portfolio,
          video_intro: (profileData as JobSeekerProfile).video_intro,
          categoryIds: selectedCategoryIds,
        };
        const updatedProfile = await updateProfile(updatedData);
        setProfileData(updatedProfile);
      } else if (profileData.role === 'employer') {
        const updatedData: Partial<EmployerProfile> = {
          username: profileData.username,
          email: profileData.email,
          timezone: profileData.timezone,
          currency: profileData.currency,
          company_name: (profileData as EmployerProfile).company_name,
          company_info: (profileData as EmployerProfile).company_info,
          referral_link: (profileData as EmployerProfile).referral_link,
        };
        const updatedProfile = await updateProfile(updatedData);
        setProfileData(updatedProfile);
      } else {
        const updatedData: Partial<Profile> = {
          username: profileData.username,
          email: profileData.email,
          timezone: profileData.timezone,
          currency: profileData.currency,
        };
        const updatedProfile = await updateProfile(updatedData);
        setProfileData(updatedProfile);
      }
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
      alert('Avatar uploaded successfully!');
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
      alert('Document uploaded successfully!');
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
        {formError && <p className="error-message">{formError}</p>}
        <div className="profile-content">
          <div className="profile-details">
            <div className="profile-avatar-section">
              {profileData.avatar ? (
                <img src={`https://jobforge.net${profileData.avatar}`} alt="Avatar" className="profile-avatar" />
              ) : (
                <FaUserCircle className="profile-avatar-icon" />
              )}
            </div>
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
                    value={profileData.email || ''}
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
                        value={(profileData as EmployerProfile).company_name || ''}
                        onChange={(e) => setProfileData({ ...profileData, company_name: e.target.value })}
                        placeholder="Enter company name"
                      />
                    </div>
                    <div className="form-group">
                      <label>Company Info:</label>
                      <textarea
                        value={(profileData as EmployerProfile).company_info || ''}
                        onChange={(e) => setProfileData({ ...profileData, company_info: e.target.value })}
                        placeholder="Enter company information"
                      />
                    </div>
                    <div className="form-group">
                      <label>Referral Link:</label>
                      <input
                        type="text"
                        value={(profileData as EmployerProfile).referral_link || ''}
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
                        value={(profileData as JobSeekerProfile).skills?.join(', ') || ''}
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
                      <label>Categories:</label>
                      <select
                        multiple
                        value={selectedCategoryIds}
                        onChange={(e) =>
                          setSelectedCategoryIds(
                            Array.from(e.target.selectedOptions, (option) => option.value)
                          )
                        }
                        className="multi-select"
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Experience:</label>
                      <input
                        type="text"
                        value={(profileData as JobSeekerProfile).experience || ''}
                        onChange={(e) => setProfileData({ ...profileData, experience: e.target.value })}
                        placeholder="Enter your experience"
                      />
                    </div>
                    <div className="form-group">
                      <label>Portfolio:</label>
                      <input
                        type="text"
                        value={(profileData as JobSeekerProfile).portfolio || ''}
                        onChange={(e) => setProfileData({ ...profileData, portfolio: e.target.value })}
                        placeholder="Enter portfolio URL"
                      />
                    </div>
                    <div className="form-group">
                      <label>Video Introduction:</label>
                      <input
                        type="text"
                        value={(profileData as JobSeekerProfile).video_intro || ''}
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
                <div className="action-buttons">
                  <button onClick={handleUpdateProfile} className="action-button success">
                    Save Profile
                  </button>
                  <button onClick={() => setIsEditing(false)} className="action-button">
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p><strong>Username:</strong> {profileData.username}</p>
                <p><strong>Email:</strong> {profileData.email || 'Not visible'}</p>
                {profileData.role === 'employer' && (
                  <>
                    <p><strong>Company Name:</strong> {(profileData as EmployerProfile).company_name || 'Not specified'}</p>
                    <p><strong>Company Info:</strong> {(profileData as EmployerProfile).company_info || 'Not specified'}</p>
                    <p><strong>Referral Link:</strong> {(profileData as EmployerProfile).referral_link || 'Not specified'}</p>
                  </>
                )}
                {profileData.role === 'jobseeker' && (
                  <>
                    <p><strong>Skills:</strong> {(profileData as JobSeekerProfile).skills?.join(', ') || 'Not specified'}</p>
                    <p>
                      <strong>Categories:</strong>{' '}
                      {(profileData as JobSeekerProfile).categories?.map((category) => category.name).join(', ') || 'Not specified'}
                    </p>
                    <p><strong>Experience:</strong> {(profileData as JobSeekerProfile).experience || 'Not specified'}</p>
                    <p><strong>Portfolio:</strong> {(profileData as JobSeekerProfile).portfolio || 'Not specified'}</p>
                    <p><strong>Video Introduction:</strong> {(profileData as JobSeekerProfile).video_intro || 'Not specified'}</p>
                  </>
                )}
                <p><strong>Timezone:</strong> {profileData.timezone || 'Not specified'}</p>
                <p><strong>Currency:</strong> {profileData.currency || 'Not specified'}</p>
                {(profileData.role === 'employer' || profileData.role === 'jobseeker') && (
                  <>
                    <p><strong>Average Rating:</strong> {profileData.average_rating || 'Not rated'}</p>
                    <p><strong>Identity Verified:</strong> {profileData.identity_verified ? 'Yes' : 'No'}</p>
                    <p>
                      <strong>Identity Document:</strong>{' '}
                      {profileData.identity_document ? (
                        <div className="document-preview">
                          {profileData.identity_document.endsWith('.pdf') ? (
                            <a href={`https://jobforge.net${profileData.identity_document}`} target="_blank" rel="noopener noreferrer">
                              <FaFilePdf size={50} />
                              <span>View PDF</span>
                            </a>
                          ) : (
                            <a href={`https://jobforge.net${profileData.identity_document}`} target="_blank" rel="noopener noreferrer">
                              <img
                                src={`https://jobforge.net${profileData.identity_document}`}
                                alt="Identity Document"
                                className="document-thumbnail"
                              />
                            </a>
                          )}
                        </div>
                      ) : (
                        'Not uploaded'
                      )}
                    </p>
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
                    <p><strong>Reviews:</strong> <Link to={`/reviews/${profileData.id}`}>View all reviews</Link></p>
                  </>
                )}
              </>
            )}
          </div>
          <div className="profile-actions">
            {(profileData.role === 'jobseeker' || profileData.role === 'employer') && (
              <>
                <h3>Upload Avatar</h3>
                <div className="form-group">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleAvatarChange}
                  />
                  <button onClick={handleUploadAvatar} disabled={!avatarFile} className="action-button">
                    Upload Avatar
                  </button>
                </div>
                <h3>Upload Identity Document</h3>
                <div className="form-group">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    onChange={handleDocumentChange}
                  />
                  <button onClick={handleUploadDocument} disabled={!documentFile} className="action-button">
                    Upload Document
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        {!isEditing && (
          <div className="profile-buttons">
            <button onClick={() => setIsEditing(true)} className="action-button">
              Edit Profile
            </button>
            <button onClick={handleDeleteAccount} className="action-button danger">
              Delete Account
            </button>
          </div>
        )}
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default ProfilePage;