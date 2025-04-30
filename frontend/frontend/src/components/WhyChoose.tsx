import React from 'react';
import '../styles/WhyChoose.css';

const WhyChoose: React.FC = () => {
  return (
    <section className="why-choose">
      <h2>Why Choose VAConnect</h2>
      <div className="features">
        <div className="feature">
          <div className="icon">🔍</div>
          <h3>Smart Matching</h3>
          <p>Our platform matches you with the most suitable jobs based on your requirements.</p>
        </div>
        <div className="feature">
          <div className="icon">💳</div>
          <h3>Secure Payments</h3>
          <p>Protected transactions with escrow system and dispute resolution.</p>
        </div>
        <div className="feature">
          <div className="icon">🌐</div>
          <h3>Global Network</h3>
          <p>Access professionals from 85+ countries, all time zones.</p>
        </div>
        <div className="feature">
          <div className="icon">📊</div>
          <h3>Performance Tracking</h3>
          <p>Monitor work progress and productivity with our built-in tools.</p>
        </div>
      </div>
    </section>
  );
};

export default WhyChoose;