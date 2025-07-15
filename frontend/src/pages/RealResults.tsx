import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright'; // Добавили импорт

const RealResults: React.FC = () => {
  return (
    <div>
      <Header />
      <div className="container">
        <h1>Real Results</h1>
        <h2>Hear from our users</h2>
        <div className="review-list">
          <div className="review-item">
            <img src="https://via.placeholder.com/80" alt="User" className="review-image" />
            <div className="review-content">
              <h3>Emily Johnson</h3>
              <p>"SilverGoldReview helped me find my dream job in just two weeks! The platform is easy to use and the job recommendations were spot on."</p>
            </div>
          </div>
          <div className="review-item">
            <img src="https://via.placeholder.com/80" alt="User" className="review-image" />
            <div className="review-content">
              <h3>Michael Brown</h3>
              <p>"As an employer, I found the perfect candidate for my project within days. The application process is seamless and efficient."</p>
            </div>
          </div>
          <div className="review-item">
            <img src="https://via.placeholder.com/80" alt="User" className="review-image" />
            <div className="review-content">
              <h3>Sarah Davis</h3>
              <p>"I love how I can track my applications and communicate with employers directly. It made my job search so much easier!"</p>
            </div>
          </div>
          <div className="review-item">
            <img src="https://via.placeholder.com/80" alt="User" className="review-image" />
            <div className="review-content">
              <h3>David Wilson</h3>
              <p>"The analytics feature helped me understand how my job postings were performing. Highly recommend for any business!"</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default RealResults;