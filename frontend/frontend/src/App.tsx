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
import SelectRolePage from './components/SelectRolePage';
import CompleteProfilePage from './components/CompleteProfilePage';
import VerifyEmailPage from './components/VerifyEmailPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';

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
        console.log('Page loaded from BFCache, forcing reload');
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
          {/* Маршруты с Layout (с навбаром и футером) */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/post-job" element={<div className="section-post-job"><div className="container"><PostJobForm /></div></div>} />
            <Route path="/jobs" element={<div className="section-job-search"><div className="container"><JobSearchPage /></div></div>} />
            <Route path="/jobs/:id" element={<div className="section-job-details"><div className="container"><JobDetailsPage /></div></div>} />
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/myaccount" element={<div className="section-myaccount"><div className="container"><MyAccount /></div></div>} />
          </Route>

          {/* Маршруты без Layout (без навбара и футера) */}
          <Route path="/register" element={<div className="section-register"><div className="container"><RegisterPage /></div></div>} />
          <Route path="/verify-email/:token" element={<div className="section-verify-email"><div className="container"><VerifyEmailPage /></div></div>} />
          <Route path="/select-role" element={<div className="section-select-role"><div className="container"><SelectRolePage /></div></div>} />
          <Route path="/complete-profile" element={<div className="section-complete-profile"><div className="container"><CompleteProfilePage /></div></div>} />
          <Route path="/login" element={<div className="section-login"><div className="container"><Login /></div></div>} />
          <Route path="/logout" element={<div className="section-logout"><div className="container"><Logout /></div></div>} />
          <Route path="/forgot-password" element={<div className="section-forgot-password"><div className="container"><ForgotPasswordPage /></div></div>} />
          <Route path="/reset-password/:token" element={<div className="section-reset-password"><div className="container"><ResetPasswordPage /></div></div>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;