import React from 'react';
import { useAuth } from '../context/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';
import '../styles/JobSeekerNavbar.css';

const JobSeekerNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="jobseeker-navbar">
      <NavLink to="/" className="navbar-brand">
        Hirevolve
      </NavLink>
      <div className="navbar-links">
        <NavLink to="/jobs" className={({ isActive }) => (isActive ? 'active' : '')}>
          Find a Job
        </NavLink>
        <NavLink to="/workers" className={({ isActive }) => (isActive ? 'active' : '')}>
          Workers
        </NavLink>
        <NavLink to="/my-applications" className={({ isActive }) => (isActive ? 'active' : '')}>
          My Applications
        </NavLink>
        <span className="navbar-user">Welcome, {user?.name || user?.email}</span>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default JobSeekerNavbar;