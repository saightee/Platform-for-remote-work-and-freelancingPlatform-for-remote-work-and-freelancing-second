// src/pages/ProfilePage.tsx
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getProfile, updateProfile, uploadAvatar, uploadIdentityDocument } from '../services/api';
import { Profile, SkillCategory } from '@types';
import { useRole } from '../context/RoleContext';
import Copyright from '../components/Copyright';

const ProfilePage: React.FC = () => {
  const { profile: initialProfile } = useRole();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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
      setIsEditing(false);
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
          {isEditing ? (
            <>
              <div className="form-group">
                <label>Username:</label>
                <input
                  type="text"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  placeholder="Enter your username"
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="Enter your email"
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
                      placeholder="Enter company name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Company Info:</label>
                    <textarea
                      value={profile.company_info || ''}
                      onChange={(e) =>
                        setProfile({ ...profile, company_info: e.target.value })
                      }
                      placeholder="Enter company info"
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
                      placeholder="e.g., JavaScript, Python"
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
                      placeholder="Enter your experience"
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
                  placeholder="Enter your timezone"
                />
              </div>
              <div className="form-group">
                <label>Currency:</label>
                <input
                  type="text"
                  value={profile.currency || ''}
                  onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
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
              <p><strong>Username:</strong> {profile.username}</p>
              <p><strong>Email:</strong> {profile.email}</p>
              {profile.role === 'employer' && (
                <>
                  <p><strong>Company Name:</strong> {profile.company_name || 'Not specified'}</p>
                  <p><strong>Company Info:</strong> {profile.company_info || 'Not specified'}</p>
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
                </>
              )}
              <p><strong>Timezone:</strong> {profile.timezone || 'Not specified'}</p>
              <p><strong>Currency:</strong> {profile.currency || 'Not specified'}</p>
              <button onClick={() => setIsEditing(true)}>Edit Profile</button>
            </>
          )}
        </div>

        <h3>Upload Avatar</h3>
        <div className="form-group">
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="Enter avatar URL"
          />
          <button onClick={handleUploadAvatar}>Upload Avatar</button>
        </div>

        {profile.role === 'jobseeker' && (
          <>
            <h3>Upload Identity Document</h3>
            <div className="form-group">
              <input
                type="text"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="Enter document URL"
              />
              <button onClick={handleUploadDocument}>Upload Document</button>
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