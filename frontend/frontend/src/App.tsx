import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Hero from './components/Hero';
import JobPostings from './components/JobPostings';
import WhyChoose from './components/WhyChoose';
import PopularProfessions from './components/PopularProfessions';
import CTA from './components/CTA';
import RegisterPage from './components/RegisterPage';
import EmployerRegisterForm from './components/EmployerRegisterForm';
import JobSeekerRegisterForm from './components/JobSeekerRegisterForm';
import Login from './components/Login';
import Logout from './components/Logout';
import PostJobForm from './components/PostJobForm';
import JobSearchPage from './components/JobSearchPage';
import JobDetailsPage from './components/JobDetailsPage';
import './App.css';
import './index.css';

const WorkersPage: React.FC = () => {
  return (
    <div className="section-workers">
      <div className="container">
        <div>Workers search page (to be implemented)</div>
      </div>
    </div>
  );
};

const Home: React.FC = () => {
  return (
    <>
      <div className="section-hero">
        <div className="container">
          <Hero />
        </div>
      </div>
      <div className="section-job-postings">
        <div className="container">
          <JobPostings />
        </div>
      </div>
      <div className="section-why-choose">
        <div className="container">
          <WhyChoose />
        </div>
      </div>
      <div className="section-popular-professions">
        <div className="container">
          <PopularProfessions />
        </div>
      </div>
      <div className="section-cta">
        <div className="container">
          <CTA />
        </div>
      </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<div className="section-register"><div className="container"><RegisterPage /></div></div>} />
            <Route path="/register/employer" element={<div className="section-register-employer"><div className="container"><EmployerRegisterForm /></div></div>} />
            <Route path="/register/jobseeker" element={<div className="section-register-jobseeker"><div className="container"><JobSeekerRegisterForm /></div></div>} />
            <Route path="/login" element={<div className="section-login"><div className="container"><Login /></div></div>} />
            <Route path="/logout" element={<div className="section-logout"><div className="container"><Logout /></div></div>} />
            <Route path="/post-job" element={<div className="section-post-job"><div className="container"><PostJobForm /></div></div>} />
            <Route path="/jobs" element={<div className="section-job-search"><div className="container"><JobSearchPage /></div></div>} />
            <Route path="/jobs/:id" element={<div className="section-job-details"><div className="container"><JobDetailsPage /></div></div>} />
            <Route path="/workers" element={<WorkersPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;