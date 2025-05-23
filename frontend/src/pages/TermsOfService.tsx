import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';

const TermsOfService: React.FC = () => {
  return (
    <div>
      <Header />
      <div className="container">
        <h1>Terms of Service</h1>
        <p>Last updated: May 20, 2025</p>
        <h2>Acceptance of Terms</h2>
        <p>
          By accessing or using HireValve ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.
        </p>
        <h2>Use of the Service</h2>
        <p>
          You agree to use the Service only for lawful purposes and in accordance with these Terms. You are responsible for maintaining the confidentiality of your account and password.
        </p>
        <h2>User Responsibilities</h2>
        <p>
          As a user, you agree to:
          <ul>
            <li>Provide accurate and complete information when creating an account.</li>
            <li>Not post false, misleading, or inappropriate content.</li>
            <li>Not engage in any activity that disrupts the Service.</li>
          </ul>
        </p>
        <h2>Termination</h2>
        <p>
          We may terminate or suspend your account at our discretion, with or without notice, if you violate these Terms or engage in prohibited activities.
        </p>
        <h2>Limitation of Liability</h2>
        <p>
          HireValve shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.
        </p>
        <h2>Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. We will notify you of any changes by posting the new Terms on this page.
        </p>
        <h2>Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at support@hirevalve.com.
        </p>
      </div>
      <Footer />
       <Copyright />
    </div>
  );
};

export default TermsOfService;