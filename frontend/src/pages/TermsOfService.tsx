// src/pages/TermsOfService.tsx
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
        <p><em>Last updated: November 12, 2025</em></p>

        <p>
          These Terms of Service (“Terms”) govern your access to and use of {brand.name} (the “Service”), a global
          online platform that connects job seekers (“Jobseekers”) and employers (“Employers”). The Service is
          provided by <strong>Online Jobs Media LLC</strong>, 30 N Gould ST STE R, Sheridan, WY 82801, USA (“Company,” “we,” “us,” “our”).
          By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service.
        </p>

        <h2>1) The Service</h2>
        <ul>
          <li>
            The Service includes features such as profile creation, job posting, search and matching tools, messaging,
            and other functionality we may introduce. We may modify, suspend, or discontinue any feature at any time,
            with or without notice.
          </li>
          <li>
            The Service is provided on an <strong>“AS IS”</strong> and <strong>“AS AVAILABLE”</strong> basis. We do not guarantee uninterrupted,
            error-free, or secure operation.
          </li>
          <li>
            We may impose limits on usage (e.g., search volume, messaging limits) or refuse Service at our discretion
            to protect the platform and users.
          </li>
        </ul>

        <h2>2) Eligibility & Accounts</h2>
        <ul>
          <li>You must be at least 18 years old to use the Service.</li>
          <li>
            You agree to provide accurate information and keep it updated. You are responsible for all activity under
            your account and for maintaining the confidentiality of your password. Notify us immediately of unauthorized use.
          </li>
          <li>
            One account per person. Jobseekers may only represent themselves (no agency or shared accounts). Employers must
            use their account solely to hire for their own organization; recruiting for third parties through a single
            Employer account is not permitted.
          </li>
          <li>
            Using bots, scrapers, or other automated means to access the Service without written permission is prohibited.
          </li>
        </ul>

        <h2>3) Acceptable Use & Prohibited Content</h2>
        <p>You agree not to post, solicit, or engage in any activity that:</p>
        <ul>
          <li>is illegal or encourages illegal conduct, fraud, or deception;</li>
          <li>
            involves adult/sexually explicit work, hateful or discriminatory content, violence, defamation, or harassment;
          </li>
          <li>
            requires money transfers, cryptocurrency handling, purchasing goods on behalf of an Employer, or similar
            risky practices;
          </li>
          <li>
            is primarily promotional (e.g., “be your own boss,” pyramid/network marketing) or aims to recruit users off
            the platform for competing services;
          </li>
          <li>
            offers unpaid trials/training or compensation <em>only</em> via commission; all interview/trial/training hours must be paid,
            and roles must include a base pay (commission may be added on top);
          </li>
          <li>
            infringes intellectual property or privacy rights, interferes with platform security, or attempts to reverse engineer the Service.
          </li>
        </ul>

        <h2>4) Subscriptions, Prices, and Payments</h2>
        <ul>
          <li>
            Some features may require a paid subscription. Prices are shown at checkout and may change before purchase.
            Taxes may apply. Payment is due in full at order time and is processed by third-party payment processors.
          </li>
          <li>
            You authorize us (and our payment processors) to charge your payment method for recurring subscription terms
            until you cancel. You can cancel at any time effective at the end of the current billing period.
          </li>
          <li>
            We may reject or cancel orders, or place reasonable limits to prevent abuse.
          </li>
        </ul>

        <h2>5) Refund Policy</h2>
        <p>
          We offer a <strong>30-day satisfaction guarantee</strong> on the most recent subscription payment. Only your latest payment
          within the last 30 days is eligible for refund. No refunds are granted for violations of these Terms, abusive
          behavior, or after access continues following a ban. To request a refund, contact <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>

        <h2>6) Intellectual Property</h2>
        <ul>
          <li>
            We and our licensors retain all rights, title, and interest in the Service and all associated technology,
            software, designs, and content. These Terms do not transfer any ownership rights to you.
          </li>
          <li>
            {brand.name}, related logos, and brand elements are trademarks or service marks of their respective owners.
            No license is granted except as expressly provided.
          </li>
        </ul>

        <h2>7) Your Content</h2>
        <ul>
          <li>
            You retain ownership of content you submit (profiles, job posts, messages, résumés). You grant us a worldwide,
            non-exclusive, royalty-free license to host, store, reproduce, and display such content as needed to operate,
            improve, and promote the Service.
          </li>
          <li>
            You represent you have all rights to submit the content and that it does not infringe others’ rights or violate these Terms.
          </li>
        </ul>

        <h2>8) Third-Party Services</h2>
        <p>
          We may link to or integrate third-party sites and services (e.g., payment processors, analytics, communication
          tools). We are not responsible for third-party content, policies, or practices. Your use of third-party
          services is governed by their terms and policies.
        </p>

        <h2>9) Disclaimers</h2>
        <p>
          YOUR USE OF THE SERVICE IS AT YOUR OWN RISK. THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE”
          WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE
          SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE, OR THAT DEFECTS WILL BE CORRECTED.
        </p>

        <h2>10) Internet Delays</h2>
        <p>
          The Service may be subject to limitations, delays, and other issues inherent in the use of the Internet and
          electronic communications. We are not responsible for such delays or failures.
        </p>

        <h2>11) Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL OUR AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO
          THE SERVICE EXCEED THE AMOUNTS YOU PAID TO US IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE TO THE
          CLAIM. WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY OR PUNITIVE
          DAMAGES, OR FOR LOST PROFITS, LOST DATA, OR BUSINESS INTERRUPTION, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
          DAMAGES.
        </p>

        <h2>12) Indemnification</h2>
        <p>
          You will indemnify and hold harmless Online Jobs Media LLC and its officers, directors, employees, and agents
          from and against all claims, liabilities, damages, losses, and expenses (including reasonable attorneys’ fees)
          arising from your content, your use of the Service, or your violation of these Terms or applicable law.
        </p>

        <h2>13) Termination</h2>
        <ul>
          <li>You may cancel your subscription at any time; access will continue through the current paid term.</li>
          <li>
            We may suspend or terminate your access for any violation of these Terms or to protect the platform or users.
            Upon termination, you must stop using the Service and delete any data obtained through it (except your own content that you independently possess).
          </li>
        </ul>

        <h2>14) Notices</h2>
        <p>
          We may send notices to your account email. You may contact us at <a href={`mailto:${supportEmail}`}>{supportEmail}</a> or by mail:
          Online Jobs Media LLC, 30 N Gould ST STE R, Sheridan, WY 82801, USA.
        </p>

        <h2>15) Governing Law & Venue</h2>
        <p>
          These Terms are governed by the laws of the State of Wyoming, USA, without regard to conflict-of-laws rules.
          You agree to the exclusive jurisdiction and venue of courts located in Sheridan County, Wyoming, for any dispute
          not subject to arbitration where applicable law permits.
        </p>

        <h2>16) Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. We will post the updated Terms with an updated “Last updated” date.
          Changes take effect upon posting unless otherwise stated. Your continued use constitutes acceptance.
        </p>

        <h2>17) Miscellaneous</h2>
        <ul>
          <li>If any provision is unenforceable, it will be modified to reflect the parties’ intent; the remainder remains in effect.</li>
          <li>No waiver of any term is a continuing waiver.</li>
          <li>These Terms constitute the entire agreement between you and us regarding the Service.</li>
          <li>You may not assign these Terms without our consent; we may assign them in connection with a merger, sale, or reorganization.</li>
        </ul>

        <h2>Contact</h2>
        <p>
          Questions? Contact <a href={`mailto:${supportEmail}`}>{supportEmail}</a> or write to:
          Online Jobs Media LLC, 30 N Gould ST STE R, Sheridan, WY 82801, USA.
        </p>
      </div>

      <Footer />
      <Copyright />
    </div>
  );
};

export default TermsOfService;
