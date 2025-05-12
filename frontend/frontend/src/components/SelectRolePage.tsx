import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/SelectRole.css';

const SelectRolePage: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  if (!auth) {
    console.error('Auth context is undefined in SelectRolePage');
    return <div>Error: Auth context is not available</div>;
  }

  const { setRole } = auth;

  const handleRoleSelection = (role: 'employer' | 'jobseeker') => {
    setRole(role);
    navigate('/complete-profile');
  };

  return (
    <div className="select-role-page">
      <h2>Select Your Role</h2>
      <p>Please choose whether you are a job seeker or an employer.</p>
      <div className="role-buttons">
        <button onClick={() => handleRoleSelection('jobseeker')} className="role-btn">
          Job Seeker
        </button>
        <button onClick={() => handleRoleSelection('employer')} className="role-btn">
          Employer
        </button>
      </div>
    </div>
  );
};

export default SelectRolePage;