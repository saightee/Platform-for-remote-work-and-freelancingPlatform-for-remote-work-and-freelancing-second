import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/RegisterPage.css';

const RegisterPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<'employer' | 'jobseeker' | null>(null);
  const navigate = useNavigate();

  const handleRoleSelection = (role: 'employer' | 'jobseeker') => {
    setSelectedRole(role);
    navigate(`/register/${role}`);
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <h1>Register</h1>
        <p>Choose your account type to get started</p>
        <div className="role-selection">
          <button
            className={`role-button ${selectedRole === 'employer' ? 'selected' : ''}`}
            onClick={() => handleRoleSelection('employer')}
          >
            <h2>Employer</h2>
            <p>Post jobs and hire talent for your business</p>
          </button>
          <button
            className={`role-button ${selectedRole === 'jobseeker' ? 'selected' : ''}`}
            onClick={() => handleRoleSelection('jobseeker')}
          >
            <h2>Job Seeker</h2>
            <p>Find jobs and apply for opportunities</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;