import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';

const Careers: React.FC = () => {
  return (
    <div>
      <Header />
      <div className="container">
        <h2>Careers</h2>
        <p>Join our team and help shape the future of remote work.</p>
        <div className="job-grid">
          <div className="job-card">
            <div className="job-title-row">
              <h3>Frontend Developer</h3>
            </div>
            <p><strong>Location:</strong> Remote</p>
            <p><strong>Description:</strong> Build innovative web applications.</p>
            <div className="job-card-footer">
              <a href="/apply" className="view-details-button">Apply Now</a>
            </div>
          </div>
          <div className="job-card">
            <div className="job-title-row">
              <h3>Customer Success Manager</h3>
            </div>
            <p><strong>Location:</strong> Remote</p>
            <p><strong>Description:</strong> Support our clients to achieve their goals.</p>
            <div className="job-card-footer">
              <a href="/apply" className="view-details-button">Apply Now</a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default Careers;