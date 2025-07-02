import { useNavigate } from 'react-router-dom';

const RoleSelection: React.FC = () => {
  const navigate = useNavigate();

  const handleRoleSelection = (role: 'employer' | 'jobseeker') => {
    navigate(`/register/${role}`);
  };

  return (
    <div className="role-selection-container">
      <div className="role-selection-box">
        <h2>Who are you?</h2>
        <div className="role-buttons">
          <button
            className="role-button"
            onClick={() => handleRoleSelection('employer')}
          >
            I am an Employer
          </button>
          <button
            className="role-button"
            onClick={() => handleRoleSelection('jobseeker')}
          >
            I am a Jobseeker
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;