// src/pages/PrivacyPolicy.tsx
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { Helmet } from 'react-helmet-async';
import { brand, brandOrigin } from '../brand';
import React from 'react';

const PrivacyPolicy: React.FC = () => {
  // prefer brand.supportEmail, else build from current origin, else fallback
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
        <p><em>Last updated: November 12, 2025</em></p>

        <p>
          This Privacy Policy explains how {brand.name} (“{brand.name},” “we,” “us,” or “our”) collects, uses,
          discloses, and safeguards personal information in connection with our global online platform that connects
          Jobseekers and Employers. The controller is <strong>Online Jobs Media LLC</strong>, 30 N Gould ST STE R,
          Sheridan, WY 82801, USA.
        </p>

        <h2>Information We Collect</h2>
        <ul>
          <li>
            <strong>Account & Profile Data:</strong> name, username, email address, password, country, languages,
            work experience, skills, résumé/CV details, links to social profiles, and any content you submit (e.g., job posts,
            messages, portfolio items).
          </li>
          <li>
            <strong>Application & Hiring Data:</strong> applications, interview scheduling, offers, employment status
            updates provided through the platform.
          </li>
          <li>
            <strong>Payment & Subscription Data:</strong> purchase history, plan type, limited billing details. Card data
            is processed and stored by our payment processors (we do not store full card numbers).
          </li>
          <li>
            <strong>Usage & Device Data:</strong> IP address, device/browser type, pages visited, referral URLs,
            timestamps, approximate location (derived from IP), cookies and similar technologies.
          </li>
          <li>
            <strong>Third-Party Sources:</strong> if you choose to connect a social account (e.g., Google/Facebook),
            we may receive basic profile info (like your name and email) as permitted by that service.
          </li>
        </ul>

        <h2>How We Use Information</h2>
        <ul>
          <li>Provide, operate, secure, and improve the Service.</li>
          <li>Match Jobseekers and Employers and enable communications.</li>
          <li>Process payments and manage subscriptions.</li>
          <li>Send transactional messages (e.g., account, security, billing), platform updates, and (with your consent or as permitted) marketing communications.</li>
          <li>Enforce our Terms of Service, prevent fraud/abuse, and comply with legal obligations.</li>
          <li>Analyze usage to develop new features and improve user experience.</li>
        </ul>

        <h2>Legal Bases (where applicable)</h2>
        <p>
          Depending on your region, our legal bases may include: contract performance, legitimate interests (e.g., to secure and
          improve the Service), consent (e.g., certain marketing), and compliance with legal obligations.
        </p>

        <h2>How We Share Information</h2>
        <ul>
          <li>
            <strong>With Other Users:</strong> information in your profile, applications, and job posts is shared as needed
            to facilitate hiring (e.g., Employers can view a Jobseeker’s profile/résumé when applying; Jobseekers can view job details).
          </li>
          <li>
            <strong>Service Providers:</strong> trusted vendors that help us operate the Service (e.g., hosting, analytics,
            customer support, email delivery, payment processing). They may only use data to perform services for us.
          </li>
          <li>
            <strong>Legal & Safety:</strong> to comply with law, legal process, or lawful requests; to protect rights,
            safety, and security of users, our Company, or others; to detect and prevent fraud, security, or technical issues.
          </li>
          <li>
            <strong>Business Transfers:</strong> in connection with a merger, acquisition, financing, or sale of assets,
            your information may be transferred as part of that transaction.
          </li>
        </ul>

        <h2>Cookies & Similar Technologies</h2>
        <p>
          We use cookies and similar technologies to operate the Service (e.g., session management, authentication),
          remember preferences, and measure performance. You can control cookies via your browser settings; however,
          essential cookies are required for core functionality (e.g., staying logged in).
        </p>

        <h2>Email Communications</h2>
        <ul>
          <li>
            <strong>Transactional:</strong> account, security, and service-related emails (you cannot opt out of these essential messages).
          </li>
          <li>
            <strong>Notifications & Marketing:</strong> you can manage preferences or unsubscribe using links in the message footer.
          </li>
          <li>
            We do not sell or rent email addresses.
          </li>
        </ul>

        <h2>Data Retention</h2>
        <p>
          We retain personal information for as long as necessary to provide the Service, comply with legal obligations,
          resolve disputes, and enforce agreements. Retention periods vary by data type and purpose.
        </p>

        <h2>Security</h2>
        <p>
          We implement administrative, technical, and physical safeguards designed to protect personal information.
          However, no system can be guaranteed 100% secure. You are responsible for maintaining your password security.
        </p>

        <h2>Your Choices & Rights</h2>
        <ul>
          <li>
            <strong>Access/Update:</strong> you can review and update profile information in your account.
          </li>
          <li>
            <strong>Delete:</strong> you may request deletion of your account/data, subject to necessary retention (e.g., legal, fraud prevention).
          </li>
          <li>
            <strong>Opt-Out:</strong> you can opt out of marketing emails at any time via unsubscribe links.
          </li>
          <li>
            <strong>Regional Rights:</strong> depending on your location, you may have additional rights (e.g., to object, restrict, portability).
            We will honor requests as required by applicable law.
          </li>
        </ul>

        <h2>Children’s Privacy</h2>
        <p>
          The Service is not intended for individuals under 18. We do not knowingly collect personal information from
          anyone under 18. If you believe a minor has provided personal information, contact us to request deletion.
        </p>

        <h2>International Transfers</h2>
        <p>
          We are a global platform and may process information in the United States and other countries. By using the Service,
          you understand your information may be transferred to jurisdictions with different data protection laws.
          Where required, we will implement appropriate safeguards.
        </p>

        <h2>Third-Party Websites</h2>
        <p>
          The Service may link to third-party sites. We are not responsible for their privacy practices. Review their policies
          before providing personal information.
        </p>

        <h2>Changes to this Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Changes are effective when posted, as indicated by the
          “Last updated” date above. Your continued use of the Service signifies acceptance of the updated Policy.
        </p>

        <h2>Contact Us</h2>
        <p>
          For questions, requests, or complaints regarding privacy, contact us at{' '}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a> or by mail:
          Online Jobs Media LLC, 30 N Gould ST STE R, Sheridan, WY 82801, USA.
        </p>
      </div>

      <Footer />
      <Copyright />
    </div>
  );
};

export default PrivacyPolicy;
