import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer>
      <div className="footer-content">
        <div className="footer-column">
          <div className="footer-logo">HireValve</div>
          <p className="footer-description">
            The leading platform for connecting businesses with professional virtual assistants worldwide.
          </p>
        </div>
        <div className="footer-column">
          <h3>For Employers</h3>
          <Link to="/how-it-works/employer-faq">How to Hire</Link>
          <Link to="/pricing">Pricing Plans</Link>
          <Link to="/categories">VA Categories</Link>
          <Link to="/real-results">Client Stories</Link>
        </div>
        <div className="footer-column">
          <h3>For VAs</h3>
          <Link to="/find-job">Find Jobs</Link>
          <Link to="/profile">Profile Tips</Link>
          <Link to="/skill-tests">Skill Tests</Link>
          <Link to="/success-stories">Success Stories</Link>
        </div>
        <div className="footer-column">
          <h3>Company</h3>
          <Link to="/about-us">About Us</Link>
          <Link to="/careers">Careers</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;