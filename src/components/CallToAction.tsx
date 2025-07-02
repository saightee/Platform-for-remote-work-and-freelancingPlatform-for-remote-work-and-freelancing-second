import { Link } from 'react-router-dom';

const CallToAction: React.FC = () => {
  return (
    <div className="cta-section">
      <div className="cta-content">
        <h2>Ready to Get Started?</h2>
        <p className='cta-highlite' >Just thousands of businesses and professionals who found their perfect match <br></br> through our platform.</p>
        <div className="cta-buttons">
          <Link to="/role-selection" className="cta-button cta-button-filled">Post a Job</Link>
          <Link to="/role-selection" className="cta-button cta-button-outline">Create a Profile</Link>
        </div>
      </div>
    </div>
  );
};

export default CallToAction;