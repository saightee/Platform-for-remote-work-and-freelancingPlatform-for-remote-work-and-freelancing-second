import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';

const CheckEmail: React.FC = () => {
  return (
    <div className="container verify-email-container">
      <Header />
      <div className="check-email-content">
        <h2>Thank You for Registering!</h2>
        <p>Please check your email to verify your account. Follow the link in the email to complete your registration.</p>
        <p>If you don’t see the email, check your spam or junk folder.</p>
        <p>
          Already verified? <Link to="/login">Go to Login</Link>
        </p>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default CheckEmail;