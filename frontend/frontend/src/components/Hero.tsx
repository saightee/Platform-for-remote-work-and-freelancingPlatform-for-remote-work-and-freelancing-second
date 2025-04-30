import React from 'react';
import '../styles/Hero.css';

const Hero: React.FC = () => {
  return (
    <section className="hero">
      <h1>Professional Virtual Assistant Platform</h1>
      <p>Connect with top assistants worldwide, find your perfect remote job opportunity.</p>
      <div className="search-bar">
        <input type="text" placeholder="Find work, job, skills, by keywords" />
        <button>Hire Talent</button>
      </div>
    </section>
  );
};

export default Hero;