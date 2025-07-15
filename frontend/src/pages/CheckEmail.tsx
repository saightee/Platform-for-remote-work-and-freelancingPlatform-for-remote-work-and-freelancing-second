import { Link } from 'react-router-dom';



const CheckEmail: React.FC = () => {
  return (
    <div className="container verify-email-container">
      <div className="check-email-content">
        <h2>Thank You for Registering!</h2>
        <p>Please check your email to verify your account. Follow the link in the email to complete your registration.</p>
        <p>If you don’t see the email, check your spam or junk folder.</p>
        <p>
          Already verified? <Link to="/login">Go to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default CheckEmail;