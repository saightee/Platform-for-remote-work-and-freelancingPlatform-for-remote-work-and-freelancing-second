import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

const SelectRolePage: React.FC = () => {
  const [role, setRole] = useState('jobseeker');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { selectRole } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await selectRole(role);
      setSuccess('Role selected! Redirecting to your account...');
      setTimeout(() => navigate('/myaccount'), 2000);
    } catch (err: any) {
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
        <button type="submit" className="login-button">Select Role</button>
      </form>
    </div>
  );
};

export default SelectRolePage;