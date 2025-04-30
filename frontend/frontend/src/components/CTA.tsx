import React from 'react';
import '../styles/CTA.css';

const CTA: React.FC = () => {
  return (
    <section className="cta">
      <h2>Ready to Get Started?</h2>
      <p>Join thousands of professionals who found their perfect match through the platform.</p>
      <div className="cta-buttons">
        <button className="primary">Post a Job</button>
        <button className="secondary">Create Profile</button>
      </div>
    </section>
  );
};

export default CTA;