import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Hero from './components/Hero';
import JobPostings from './components/JobPostings';
import WhyChoose from './components/WhyChoose';
import PopularProfessions from './components/PopularProfessions';
import CTA from './components/CTA';
import Footer from './components/Footer';
import Register from './components/Register';
import Logout from './components/Logout';
import './App.css';

const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="App">
      <Header />
      <main>
        <Hero />
        <JobPostings />
        <WhyChoose />
        <PopularProfessions />
        <div className="auth-links" style={{ textAlign: 'center', padding: '1rem' }}>
          {user ? (
            <>
              <p style={{ marginBottom: '0.5rem' }}>Welcome, {user.email}</p>
              <Link to="/logout" style={{ color: '#007bff', textDecoration: 'none' }}>
                Logout
              </Link>
            </>
          ) : (
            <Link to="/register" style={{ color: '#007bff', textDecoration: 'none' }}>
              Register
            </Link>
          )}
        </div>
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/logout" element={<Logout />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;