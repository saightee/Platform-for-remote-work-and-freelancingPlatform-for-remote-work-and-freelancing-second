import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';

const SuccessStories: React.FC = () => {
  return (
    <div>
      <Header />
      <div className="container">
        <h2>Success Stories</h2>
        <p>Discover how virtual assistants have transformed their careers with our platform.</p>
        <div className="review-list">
          <div className="review-item">
            <img src="/placeholder.jpg" alt="User" className="review-image" />
            <div className="review-content">
              <h3>Anna's Journey</h3>
              <p>From part-time freelancer to full-time VA, Anna landed her dream job.</p>
            </div>
          </div>
          <div className="review-item">
            <img src="/placeholder.jpg" alt="User" className="review-image" />
            <div className="review-content">
              <h3>Mark's Breakthrough</h3>
              <p>Mark used skill tests to showcase his expertise and secured a high-paying role.</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default SuccessStories;