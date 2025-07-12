import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright'; // Добавили импорт

const Pricing: React.FC = () => {
  return (
    <div>
      <Header />
      <div className="container">
        <h1>Pricing Plans</h1>
        <h2>Choose the plan that fits your needs</h2>
        <div className="pricing-grid">
          <div className="pricing-card">
            <h3>Free Plan</h3>
            <p className="price">$0/month</p>
            <ul>
              <li>Post up to 1 job per month</li>
              <li>Access to basic candidate search</li>
              <li>Email support</li>
              <li>Limited application tracking</li>
              <li>No analytics</li>
            </ul>
            <button>Get Started</button>
          </div>
          <div className="pricing-card">
            <h3>Pro Plan</h3>
            <p className="price">$29/month</p>
            <ul>
              <li>Post up to 10 jobs per month</li>
              <li>Advanced candidate search</li>
              <li>Priority email support</li>
              <li>Full application tracking</li>
              <li>Basic analytics</li>
            </ul>
            <button>Choose Pro</button>
          </div>
          <div className="pricing-card">
            <h3>Enterprise Plan</h3>
            <p className="price">$99/month</p>
            <ul>
              <li>Unlimited job postings</li>
              <li>Premium candidate search</li>
              <li>Dedicated support</li>
              <li>Full application tracking</li>
              <li>Advanced analytics</li>
            </ul>
            <button>Choose Enterprise</button>
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default Pricing;