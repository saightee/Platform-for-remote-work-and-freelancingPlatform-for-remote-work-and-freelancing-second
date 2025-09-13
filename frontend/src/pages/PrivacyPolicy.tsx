import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { Helmet } from 'react-helmet-async';

const PrivacyPolicy: React.FC = () => {
  return (
    <div>
      <Helmet>
  <title>Privacy Policy | Jobforge</title>
  <meta name="description" content="How Jobforge collects, uses, and protects your data." />
  <link rel="canonical" href="https://jobforge.net/privacy-policy" />
</Helmet>

      <Header />
      <div className="container">
        <h1>Privacy Policy</h1>
        <p>Last updated: May 20, 2025</p>
        <h2>Introduction</h2>
        <p>
          HireValve ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.
        </p>
        <h2>Information We Collect</h2>
        <p>
          We may collect the following types of information:
          <ul>
            <li>Personal Information: Name, email address, phone number, and other identifiable information you provide.</li>
            <li>Job Application Data: Resume, cover letter, and other information related to job applications.</li>
            <li>Usage Data: Information about how you interact with our website, such as IP address, browser type, and pages visited.</li>
          </ul>
        </p>
        <h2>How We Use Your Information</h2>
        <p>
          We use the information we collect to:
          <ul>
            <li>Provide and improve our services.</li>
            <li>Match job seekers with employers.</li>
            <li>Send you updates, notifications, and marketing communications.</li>
            <li>Ensure the security of our platform.</li>
          </ul>
        </p>
        <h2>Sharing Your Information</h2>
        <p>
          We may share your information with:
          <ul>
            <li>Employers, when you apply for a job.</li>
            <li>Third-party service providers who assist us in operating our platform.</li>
            <li>Law enforcement or regulatory authorities, if required by law.</li>
          </ul>
        </p>
        <h2>Your Rights</h2>
        <p>
          You have the right to:
          <ul>
            <li>Access, update, or delete your personal information.</li>
            <li>Opt-out of marketing communications.</li>
            <li>Request information about how your data is processed.</li>
          </ul>
        </p>
        <h2>Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at support@hirevalve.com.
        </p>
      </div>
      <Footer />
       <Copyright />
    </div>
  );
};

export default PrivacyPolicy;