import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/CompleteProfile.css';

const CompleteProfilePage: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const [jobSeekerData, setJobSeekerData] = useState({
    fullName: '',
    experience: '',
    skills: '',
  });

  const [employerData, setEmployerData] = useState({
    companyName: '',
    companyAddress: '',
    website: '',
  });

  const handleJobSeekerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setJobSeekerData({
      ...jobSeekerData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEmployerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmployerData({
      ...employerData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (role === 'jobseeker') {
        console.log('Saving job seeker profile:', jobSeekerData);
      } else if (role === 'employer') {
        console.log('Saving employer profile:', employerData);
      }
      navigate('/myaccount');
    } catch (error: any) {
      console.error('Error saving profile:', error);
    }
  };

  return (
    <div className="complete-profile-page">
      <h2>Complete Your Profile</h2>
      <form onSubmit={handleSubmit} className="profile-form">
        {role === 'jobseeker' && (
          <>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                placeholder="Enter your full name"
                value={jobSeekerData.fullName}
                onChange={handleJobSeekerChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="experience">Experience</label>
              <input
                type="text"
                id="experience"
                name="experience"
                placeholder="Enter your experience"
                value={jobSeekerData.experience}
                onChange={handleJobSeekerChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="skills">Skills</label>
              <input
                type="text"
                id="skills"
                name="skills"
                placeholder="Enter your skills (comma-separated)"
                value={jobSeekerData.skills}
                onChange={handleJobSeekerChange}
                required
              />
            </div>
          </>
        )}
        {role === 'employer' && (
          <>
            <div className="form-group">
              <label htmlFor="companyName">Company Name</label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                placeholder="Enter your company name"
                value={employerData.companyName}
                onChange={handleEmployerChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="companyAddress">Company Address</label>
              <input
                type="text"
                id="companyAddress"
                name="companyAddress"
                placeholder="Enter your company address"
                value={employerData.companyAddress}
                onChange={handleEmployerChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input
                type="text"
                id="website"
                name="website"
                placeholder="Enter your company website"
                value={employerData.website}
                onChange={handleEmployerChange}
                required
              />
            </div>
          </>
        )}
        <button type="submit" className="submit-btn">
          Save Profile
        </button>
      </form>
    </div>
  );
};

export default CompleteProfilePage;