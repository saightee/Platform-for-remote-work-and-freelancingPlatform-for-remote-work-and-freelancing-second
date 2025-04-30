import React from 'react';
import './App.css';
import Header from './components/Header';
import Hero from './components/Hero';
import JobPostings from './components/JobPostings';
import WhyChoose from './components/WhyChoose';
import PopularProfessions from './components/PopularProfessions';
import CTA from './components/CTA';
import Footer from './components/Footer';

const App: React.FC = () => {
  return (
    <div className="App">
      <Header />
      <Hero />
      <JobPostings />
      <WhyChoose />
      <PopularProfessions />
      <CTA />
      <Footer />
    </div>
  );
};

export default App;