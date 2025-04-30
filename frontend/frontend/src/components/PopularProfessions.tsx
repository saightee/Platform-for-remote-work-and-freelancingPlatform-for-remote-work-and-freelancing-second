import React from 'react';
import '../styles/PopularProfessions.css';

const professions = [
  'Virtual Assistant',
  'Social Media Manager',
  'Data Entry Specialist',
  'Customer Support Representative',
  'Graphic Designer',
  'Bookkeeper',
  'Project Coordinator',
  'E-Commerce Assistant',
  'Research Assistant',
  'Transcription Specialist',
  'Travel Planner',
  'Personal Assistant',
];

const PopularProfessions: React.FC = () => {
  return (
    <section className="popular-professions">
      <h2>Popular Virtual Professions</h2>
      <p>Browse the most in-demand remote job categories</p>
      <div className="professions-list">
        {professions.map((profession, index) => (
          <span key={index} className="profession">{profession}</span>
        ))}
      </div>
    </section>
  );
};

export default PopularProfessions;