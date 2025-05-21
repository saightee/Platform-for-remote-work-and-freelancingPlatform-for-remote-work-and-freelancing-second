import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getProfile, updateProfile, uploadAvatar, uploadIdentityDocument } from '../services/api';
import { Profile } from '@types';
import { useRole } from '../context/RoleContext';
import Copyright from '../components/Copyright';

const ProfilePage: React.FC = () => {
  const { profile: initialProfile } = useRole();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setProfile(profileData);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (initialProfile) {
      setProfile(initialProfile);
      setIsLoading(false);
    } else {
      fetchProfile();
    }
  }, [initialProfile]);

  const handleUpdateProfile = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const updatedProfile = await updateProfile(profile);
      setProfile(updatedProfile);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile.');
    }
  };

  const handleUploadAvatar = async () => {
    try {
      const updatedProfile = await uploadAvatar(avatarUrl);
      setProfile(updatedProfile);
      setAvatarUrl('');
      alert('Avatar uploaded successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar.');
    }
  };

  const handleUploadDocument = async () => {
    try {
      const updatedProfile = await uploadIdentityDocument(documentUrl);
      setProfile(updatedProfile);
      setDocumentUrl('');
      alert('Document uploaded successfully!');
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document.');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!profile) return <div>No profile data available.</div>;

  return (
    <div>
      <Header />
      <div className="container">
        <h2>My Profile (Role: {profile.role})</h2>
        <div>
          <div className="form-group">
            <label>Username:</label>
            <input
              type="text"
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </div>
          {profile.role === 'employer' && (
            <>
              <div className="form-group">
                <label>Company Name:</label>
                <input
                  type="text"
                  value={profile.company_name || ''}
                  onChange={(e) =>
                    setProfile({ ...profile, company_name: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Company Info:</label>
                <textarea
                  value={profile.company_info || ''}
                  onChange={(e) =>
                    setProfile({ ...profile, company_info: e.target.value })
                  }
                />
              </div>
            </>
          )}
          {profile.role === 'jobseeker' && (
            <>
              <div className="form-group">
                <label>Skills (comma-separated):</label>
                <input
                  type="text"
                  value={profile.skills?.join(', ') || ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      skills: e.target.value.split(',').map((s) => s.trim()),
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Experience:</label>
                <input
                  type="text"
                  value={profile.experience || ''}
                  onChange={(e) =>
                    setProfile({ ...profile, experience: e.target.value })
                  }
                />
              </div>
            </>
          )}
          <div className="form-group">
            <label>Timezone:</label>
            <input
              type="text"
              value={profile.timezone || ''}
              onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Currency:</label>
            <input
              type="text"
              value={profile.currency || ''}
              onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
            />
          </div>
          <button onClick={handleUpdateProfile}>Update Profile</button>

          <div style={{ marginTop: '20px' }}>
            <h3>Upload Avatar</h3>
            <div className="form-group">
              <label>Avatar URL:</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>
            <button onClick={handleUploadAvatar}>Upload Avatar</button>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h3>Upload Identity Document</h3>
            <div className="form-group">
              <label>Document URL:</label>
              <input
                type="text"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
              />
            </div>
            <button onClick={handleUploadDocument}>Upload Document</button>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h3>Reviews</h3>
            {profile.reviews.length > 0 ? (
              <ul>
                {profile.reviews.map((review) => (
                  <li key={review.id}>
                    {review.rating} stars - {review.comment} (by {review.reviewer_id})
                  </li>
                ))}
              </ul>
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

export default ProfilePage;