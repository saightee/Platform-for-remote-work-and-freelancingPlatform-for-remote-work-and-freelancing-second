import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/EmployerNavbar.css';

const EmployerNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="employer-navbar">
      <NavLink to="/" className="navbar-brand">
        OnlineJobs.ph
      </NavLink>
      <div className="navbar-links">
        <NavLink to="/myaccount" className={({ isActive }) => (isActive ? 'active' : '')}>
          My Account
        </NavLink>
        <NavLink to="/post-job" className={({ isActive }) => (isActive ? 'active' : '')}>
          Post a Job
        </NavLink>
        <NavLink to="/workers" className={({ isActive }) => (isActive ? 'active' : '')}>
          Find a Worker
        </NavLink>
        <a href="#">Pay a Worker</a>
        <a href="#">TimeProof</a>
        <a href="#">ID Proof</a>
        <a href="#">Training</a>
        <a href="#">Blog</a>
        <span className="navbar-user">Welcome, {user?.name || user?.email}</span>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default EmployerNavbar;