import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';


const Footer: React.FC = () => {
  const [openColumns, setOpenColumns] = useState<{ [key: string]: boolean }>({
    employers: false,
    vas: false,
    company: false,
  });

  const toggleColumn = (column: string) => {
    setOpenColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  return (
    <footer>
      <div className="footer-content">
        <div className="footer-column">
          <div className="footer-logo">Jobforge_</div>
          <p className="footer-description">
            The leading platform for connecting businesses with professional virtual assistants worldwide.
          </p>
        </div>
        <div className="footer-column">
          <h3 onClick={() => toggleColumn('employers')}>
            For Employers <span className="toggle-icon">{openColumns.employers ? <FaChevronUp /> : <FaChevronDown />}</span>
          </h3>
          <div className={`footer-links ${openColumns.employers ? 'open' : ''}`}>
            <Link to="/how-it-works/employer-faq">How to Hire</Link>
            <Link to="/pricing">Pricing Plans</Link>
            <Link to="/va-categories">VA Categories</Link>
            <Link to="/real-results">Client Stories</Link>
          </div>
        </div>
        <div className="footer-column">
          <h3 onClick={() => toggleColumn('vas')}>
            For VAs <span className="toggle-icon">{openColumns.vas ? <FaChevronUp /> : <FaChevronDown />}</span>
          </h3>
          <div className={`footer-links ${openColumns.vas ? 'open' : ''}`}>
            <Link to="/find-job">Find Jobs</Link>
            <Link to="/profile-tips">Profile Tips</Link>
            <Link to="/skill-tests">Skill Tests</Link>
            <Link to="/success-stories">Success Stories</Link>
          </div>
        </div>
        <div className="footer-column">
          <h3 onClick={() => toggleColumn('company')}>
            Company <span className="toggle-icon">{openColumns.company ? <FaChevronUp /> : <FaChevronDown />}</span>
          </h3>
          <div className={`footer-links ${openColumns.company ? 'open' : ''}`}>
            <Link to="/about-us">About Us</Link>
            <Link to="/careers">Careers</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;