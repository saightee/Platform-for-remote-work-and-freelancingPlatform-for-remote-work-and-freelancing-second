import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { Helmet } from 'react-helmet-async';
import { brand, brandOrigin } from '../brand';
import React from 'react';

const PrivacyPolicy: React.FC = () => {
  // аккуратно получаем почту поддержки из brand, иначе строим из домена,
  // и в крайнем случае — fallback.
  const supportEmail = React.useMemo(() => {
    try {
      const fromBrand = (brand as any).supportEmail;
      if (fromBrand && typeof fromBrand === 'string') return fromBrand;
      const host = new URL(brandOrigin()).hostname;
      return `support@${host}`;
    } catch {
      return 'support@example.com';
    }
  }, []);

  return (
    <div>
      <Helmet>
        <title>Privacy Policy | {brand.name}</title>
        <meta
          name="description"
          content={`How ${brand.name} collects, uses, and protects your data.`}
        />
        <link rel="canonical" href={`${brandOrigin()}/privacy-policy`} />
      </Helmet>

      <Header />

      <div className="container">
        <h1>Privacy Policy</h1>
        <p>Last updated: May 20, 2025</p>

        <h2>Introduction</h2>
        <p>
          {brand.name} (“we”, “us”, or “our”) is committed to protecting your
          privacy. This Privacy Policy explains how we collect, use, disclose,
          and safeguard your information when you visit our website or use our
          services.
        </p>

        <h2>Information We Collect</h2>
        <p>We may collect the following types of information:</p>
        <ul>
          <li>
            <strong>Personal Information:</strong> name, email address, phone
            number, and other identifiable information you provide.
          </li>
          <li>
            <strong>Job Application Data:</strong> resume, cover letter, and
            other information related to job applications.
          </li>
          <li>
            <strong>Usage Data:</strong> information about how you interact with
            our website, such as IP address, browser type, and pages visited.
          </li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide and improve our services.</li>
          <li>Match job seekers with employers.</li>
          <li>Send you updates, notifications, and marketing communications.</li>
          <li>Ensure the security of our platform.</li>
        </ul>

        <h2>Sharing Your Information</h2>
        <p>We may share your information with:</p>
        <ul>
          <li>Employers, when you apply for a job.</li>
          <li>
            Third-party service providers who assist us in operating our
            platform.
          </li>
          <li>
            Law enforcement or regulatory authorities, if required by law.
          </li>
        </ul>

        <h2>Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access, update, or delete your personal information.</li>
          <li>Opt out of marketing communications.</li>
          <li>Request information about how your data is processed.</li>
        </ul>

        <h2>Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us
          at <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
      </div>

      <Footer />
      <Copyright />
    </div>
  );
};

export default PrivacyPolicy;
