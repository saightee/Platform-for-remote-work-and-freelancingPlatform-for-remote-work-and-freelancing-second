import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';

const SkillTests: React.FC = () => {
  return (
    <div>
      <Header />
      <div className="container">
        <h2>Skill Tests</h2>
        <p>Validate your skills with our comprehensive skill tests to impress employers.</p>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>Technical Skills</h3>
            <p>Test your coding, design, or data analysis skills.</p>
          </div>
          <div className="feature-card">
            <h3>Soft Skills</h3>
            <p>Assess communication, teamwork, and problem-solving abilities.</p>
          </div>
          <div className="feature-card">
            <h3>Industry-Specific</h3>
            <p>Take tests tailored to your industry, like marketing or finance.</p>
          </div>
        </div>
        <div className="cta-section">
          <div className="cta-content">
            <h2>Ready to Prove Your Skills?</h2>
            <a href="/skill-tests" className="cta-button cta-button-filled">Start Testing</a>
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default SkillTests;