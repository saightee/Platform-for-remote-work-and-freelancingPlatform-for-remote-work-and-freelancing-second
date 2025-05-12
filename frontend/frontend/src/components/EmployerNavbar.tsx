import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/EmployerNavbar.css';

const EmployerNavbar: React.FC = () => {
  return (
    <nav className="employer-navbar">
      <div className="navbar-brand">OnlineJobs.ph</div>
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
      </div>
    </nav>
  );
};

export default EmployerNavbar;