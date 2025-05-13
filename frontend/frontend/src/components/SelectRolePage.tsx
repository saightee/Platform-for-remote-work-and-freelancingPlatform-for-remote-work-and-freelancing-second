import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

const SelectRolePage: React.FC = () => {
  const [role, setRole] = useState('jobseeker');
  const [companyName, setCompanyName] = useState('');
  const [skills, setSkills] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { selectRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tempToken = searchParams.get('tempToken');

  useEffect(() => {
    if (!tempToken) {
      setError('Invalid or missing temp token');
      setTimeout(() => navigate('/register'), 2000);
    }
  }, [tempToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!tempToken) {
      setError('Temp token is missing');
      return;
    }

    const additionalData = role === 'employer' ? { companyName } : { skills };
    try {
      await selectRole(role, tempToken, additionalData);
      setSuccess('Role selected! Redirecting to your account...');
      setTimeout(() => navigate('/myaccount'), 2000);
    } catch (err: any) {
      console.error('Role selection failed:', err.message);
      setError(err.message || 'Failed to select role');
    }
  };

  return (
    <div className="login-container">
      <h2 className="login-title">Select Role</h2>
      {error && <p className="login-error">{error}</p>}
      {success && <p className="login-success">{success}</p>}
      <form onSubmit={handleSubmit} className="login-form">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="login-input"
        >
          <option value="jobseeker">Job Seeker</option>
          <option value="employer">Employer</option>
        </select>
        {role === 'employer' ? (
          <input
            type="text"
            placeholder="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="login-input"
          />
        ) : (
          <input
            type="text"
            placeholder="Skills (comma-separated)"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="login-input"
          />
        )}
        <button type="submit" className="login-button">Select Role</button>
      </form>
    </div>
  );
};

export default SelectRolePage;