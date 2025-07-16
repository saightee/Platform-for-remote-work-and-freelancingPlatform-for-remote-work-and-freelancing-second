import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';


const AboutUs: React.FC = () => {
  return (
    <div>
      <Header />
      <div className="container">
        <h2>About Us</h2>
        <p>We are a platform dedicated to connecting talented virtual assistants with employers worldwide.</p>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>Our Mission</h3>
            <p>Empower individuals and businesses through seamless job connections.</p>
          </div>
          <div className="feature-card">
            <h3>Our Vision</h3>
            <p>Create a global community of opportunity and growth.</p>
          </div>
          <div className="feature-card">
            <h3>Our Values</h3>
            <p>Integrity, innovation, and inclusivity drive everything we do.</p>
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default AboutUs;