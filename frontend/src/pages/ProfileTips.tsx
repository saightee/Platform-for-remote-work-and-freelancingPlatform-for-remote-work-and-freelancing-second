import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';

const ProfileTips: React.FC = () => {
  return (
    <div>
      <Header />
      <div className="container">
        <h2>Profile Tips</h2>
        <p>Maximize your chances of landing a job with these profile optimization tips.</p>
        <div className="faq-list">
          <div className="faq-item">
            <h3>Complete Your Profile</h3>
            <p>Fill out all sections, including skills, experience, and portfolio, to stand out.</p>
          </div>
          <div className="faq-item">
            <h3>Add a Professional Photo</h3>
            <p>Upload a clear, professional avatar to build trust with employers.</p>
          </div>
          <div className="faq-item">
            <h3>Highlight Key Skills</h3>
            <p>List specific, relevant skills that match the jobs you're targeting.</p>
          </div>
          <div className="faq-item">
            <h3>Write a Compelling Bio</h3>
            <p>Craft a concise bio that showcases your expertise and personality.</p>
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default ProfileTips;