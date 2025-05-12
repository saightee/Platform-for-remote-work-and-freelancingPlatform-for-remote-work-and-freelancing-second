import React from 'react';
import '../styles/JobSeekerNavbar.css';

const JobSeekerNavbar: React.FC = () => {
  return (
    <nav className="jobseeker-navbar">
      <div className="navbar-brand">Hirevolve</div>
      <div className="navbar-links">
        <a href="/jobs">Find a Job</a>
        <a href="/workers">Workers</a>
        <a href="/login">Login</a>
        <a href="/register">Register</a>
      </div>
    </nav>
  );
};

export default JobSeekerNavbar;