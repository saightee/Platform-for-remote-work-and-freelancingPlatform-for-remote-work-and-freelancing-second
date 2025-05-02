import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Hero from './components/Hero';
import JobPostings from './components/JobPostings';
import WhyChoose from './components/WhyChoose';
import PopularProfessions from './components/PopularProfessions';
import CTA from './components/CTA';
import Footer from './components/Footer';
import Register from './components/Register';
import Login from './components/Login'; // Импортируем новый компонент
import Logout from './components/Logout';
import './App.css';

const Home: React.FC = () => {
  const containerStyles: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem',
  };

  return (
    <div className="App">
      <div style={{ backgroundColor: '#fff' }}>
        <div style={containerStyles}>
          <Header />
        </div>
      </div>
      <div style={{ backgroundColor: '#f5f6fa' }}>
        <div style={containerStyles}>
          <Hero />
        </div>
      </div>
      <div style={{ backgroundColor: '#f5f6fa' }}>
        <div style={containerStyles}>
          <JobPostings />
        </div>
      </div>
      <div style={{ backgroundColor: '#fff' }}>
        <div style={containerStyles}>
          <WhyChoose />
        </div>
      </div>
      <div style={{ backgroundColor: '#fff' }}>
        <div style={containerStyles}>
          <PopularProfessions />
        </div>
      </div>
      <div style={{ backgroundColor: '#34495e' }}>
        <div style={containerStyles}>
          <CTA />
        </div>
      </div>
      <div style={{ backgroundColor: '#2c3e50' }}>
        <div style={containerStyles}>
          <Footer />
        </div>
      </div>
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
          <Route path="/login" element={<Login />} /> {/* Добавляем маршрут для логина */}
          <Route path="/logout" element={<Logout />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;