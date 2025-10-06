import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { Helmet } from 'react-helmet-async';
import { brand, brandOrigin } from '../brand';

const TermsOfService: React.FC = () => {
  const origin = brandOrigin();
  const supportEmail = `support@${new URL(origin).host}`;

  return (
    <div>
      <Helmet>
        <title>Terms of Service | {brand.name}</title>
        <meta
          name="description"
          content={`Terms of Service for ${brand.name}. Read the rules for using our website and services.`}
        />
        <link rel="canonical" href={`${origin}/terms-of-service`} />
        <meta property="og:site_name" content={brand.name} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`Terms of Service | ${brand.name}`} />
        <meta
          property="og:description"
          content={`Terms of Service for ${brand.name}. Read the rules for using our website and services.`}
        />
        <meta property="og:url" content={`${origin}/terms-of-service`} />
      </Helmet>

      <Header />

      <div className="container">
        <h1>Terms of Service</h1>
        <p>Last updated: May 20, 2025</p>

        <h2>Acceptance of Terms</h2>
        <p>
          By accessing or using {brand.name} (the “Service”), you agree to be bound by these Terms of
          Service (“Terms”). If you do not agree to these Terms, please do not use the Service.
        </p>

        <h2>Use of the Service</h2>
        <p>
          You agree to use the Service only for lawful purposes and in accordance with these Terms.
          You are responsible for maintaining the confidentiality of your account and password and
          for all activities that occur under your account.
        </p>

        <h2>User Responsibilities</h2>
        <ul>
          <li>Provide accurate and complete information when creating an account.</li>
          <li>Not post false, misleading, or inappropriate content.</li>
          <li>Not engage in any activity that disrupts or interferes with the Service.</li>
        </ul>

        <h2>Termination</h2>
        <p>
          We may suspend or terminate your access to the Service at our sole discretion, with or
          without notice, if you violate these Terms or engage in prohibited activities.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, {brand.name} shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages, or any loss of profits or
          revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or
          other intangible losses, resulting from your use of (or inability to use) the Service.
        </p>

        <h2>Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. We will post the updated Terms on this page,
          and any changes become effective when posted unless otherwise stated.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have questions about these Terms, please contact us at{' '}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
      </div>

      <Footer />
      <Copyright />
    </div>
  );
};

export default TermsOfService;
