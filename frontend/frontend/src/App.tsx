import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Hero from './components/Hero';
import JobPostings from './components/JobPostings';
import WhyChoose from './components/WhyChoose';
import PopularProfessions from './components/PopularProfessions';
import CTA from './components/CTA';
import RegisterPage from './components/RegisterPage';
import Login from './components/Login';
import Logout from './components/Logout';
import PostJobForm from './components/PostJobForm';
import JobSearchPage from './components/JobSearchPage';
import JobDetailsPage from './components/JobDetailsPage';
import MyAccount from './components/MyAccount';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import AuthCallBack from './components/AuthCallBack';
import Pricing from './components/Pricing';
import Profile from './components/Profile';
import Upgrade from './components/Upgrade';
import BrowseResumes from './components/BrowseResumes';

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
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log(
          'Page loaded from BFCache, forcing reload at',
          new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }),
        );
        window.location.reload();
      }
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/post-a-job" element={<div className="section-post-job"><div className="container"><PostJobForm /></div></div>} />
            <Route path="/jobs" element={<div className="section-job-search"><div className="container"><JobSearchPage /></div></div>} />
            <Route path="/jobs/:id" element={<div className="section-job-details"><div className="container"><JobDetailsPage /></div></div>} />
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/myaccount" element={<div className="section-myaccount"><div className="container"><MyAccount /></div></div>} />
            <Route path="/pricing" element={<div className="section-pricing"><div className="container"><Pricing /></div></div>} />
            <Route path="/profile/:id" element={<div className="section-profile"><div className="container"><Profile /></div></div>} />
            <Route path="/upgrade" element={<div className="section-upgrade"><div className="container"><Upgrade /></div></div>} />
            <Route path="/browse-resumes" element={<div className="section-browse-resumes"><div className="container"><BrowseResumes /></div></div>} />
          </Route>
          <Route path="/register" element={<div className="section-register"><div className="container"><RegisterPage /></div></div>} />
          <Route path="/login" element={<div className="section-login"><div className="container"><Login /></div></div>} />
          <Route path="/logout" element={<div className="section-logout"><div className="container"><Logout /></div></div>} />
          <Route path="/forgot-password" element={<div className="section-forgot-password"><div className="container"><ForgotPasswordPage /></div></div>} />
          <Route path="/reset-password/:token" element={<div className="section-reset-password"><div className="container"><ResetPasswordPage /></div></div>} />
          <Route path="/auth/callback" element={<AuthCallBack />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;