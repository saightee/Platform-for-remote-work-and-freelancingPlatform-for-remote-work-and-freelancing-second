import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/DefaultNavbar.css';

const DefaultNavbar: React.FC = () => {
  return (
    <nav className="default-navbar">
      <div className="navbar-brand">Hirevolve</div>
      <div className="navbar-links">
        <NavLink to="/jobs" className={({ isActive }) => (isActive ? 'active' : '')}>
          Find a Job
        </NavLink>
        <NavLink to="/post-job" className={({ isActive }) => (isActive ? 'active' : '')}>
          Post a Job
        </NavLink>
        <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : '')}>
          Login
        </NavLink>
        <NavLink to="/register" className={({ isActive }) => (isActive ? 'active' : '')}>
          Register
        </NavLink>
      </div>
    </nav>
  );
};

export default DefaultNavbar;