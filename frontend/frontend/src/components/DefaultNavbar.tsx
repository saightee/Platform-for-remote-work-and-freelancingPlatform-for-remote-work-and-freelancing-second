import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/DefaultNavbar.css';

const DefaultNavbar: React.FC = () => {
  return (
    <nav className="default-navbar">
      <NavLink to="/" className="navbar-brand">
        Hirevolve
      </NavLink>
      <div className="navbar-links">
        <NavLink to="/jobs" className={({ isActive }) => (isActive ? 'active' : '')}>
          Find a Job
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