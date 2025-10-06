// src/pages/promoLatamFreelancer.tsx
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import ReactCountryFlag from 'react-country-flag';
import {
  FaGlobeAmericas,
  FaBolt,
  FaShieldAlt,
  FaUserCheck,
  FaClock,
  FaMoneyBillWave,
  FaHandshake,
  FaArrowRight
} from 'react-icons/fa';
import '../styles/promo-latam.css';
import heroImgGirl from '../assets/6863216.png';
import { Helmet } from 'react-helmet-async';
import { brand, brandOrigin } from '../brand';

const PromoLatamFreelancer: React.FC = () => {
  return (
    <div className="plf-root">
<Helmet>
  <title>LATAM freelancers: Remote jobs with USD pay | {brand.name}</title>
  <meta
    name="description"
    content={`Find well-paid remote projects from LATAM. Apply fast and chat directly with employers on ${brand.name}.`}
  />
  <link rel="canonical" href={`${brandOrigin()}/latam-freelancer/`} />
  <meta property="og:url" content={`${brandOrigin()}/latam-freelancer/`} />
</Helmet>

      {/* <Header /> */}

      {/* HERO with grid: 2/3 text, 1/3 image */}
      <section className="plf-hero">
        <div className="plf-shell">
          <div className="plf-hero-grid">
            {/* LEFT: content */}
            <div className="plf-hero-left">
           <Link to="/" className="plf-brand" aria-label={`Go to ${brand.name} home`}>
  <div className="plf-brand-text">{brand.wordmark}</div>
</Link>


              <h1 className="plf-title">
                LATAM freelancers: <span>Work remotely. Earn globally.</span>
              </h1>

           <p className="plf-sub">
  {brand.name} helps top talent from Latin America land real, well-paid remote projects.
</p>

              <div className="plf-cta">
                <Link
                  to="/register/jobseeker?utm_source=latam_lp"
                  className="plf-btn plf-btn--primary plf-btn--xl plf-btn--pulse"
                >
                  Register now <FaArrowRight />
                </Link>
                <Link
                  to="/find-job?utm_source=latam_lp"
                  className="plf-btn plf-btn--ghost plf-btn--lg"
                >
                  Browse jobs
                </Link>
              </div>

              <div className="plf-flags">
                <span className="plf-flags-label">Built for LATAM:</span>
                <ReactCountryFlag countryCode="MX" svg title="Mexico" className="plf-flag" />
                <ReactCountryFlag countryCode="BR" svg title="Brazil" className="plf-flag" />
                <ReactCountryFlag countryCode="AR" svg title="Argentina" className="plf-flag" />
                <ReactCountryFlag countryCode="CO" svg title="Colombia" className="plf-flag" />
                <ReactCountryFlag countryCode="PE" svg title="Peru" className="plf-flag" />
                <ReactCountryFlag countryCode="CL" svg title="Chile" className="plf-flag" />
              </div>
            </div>

            {/* RIGHT: image (hidden on tablet/mobile) */}
            <div className="plf-hero-media">
              <img src={heroImgGirl} alt="Happy freelancer" className="plf-hero-img" />
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="plf-benefits">
        <div className="plf-shell">
          <h2 className="plf-h2">Why freelancers from LATAM choose {brand.name}</h2>
          <div className="plf-cards">
            <div className="plf-card">
              <div className="plf-card-ico"><FaBolt /></div>
              <h3>Setup in minutes</h3>
              <p>Build a compelling profile, add your portfolio, and start applying instantly.</p>
            </div>
            <div className="plf-card">
              <div className="plf-card-ico"><FaShieldAlt /></div>
              <h3>Trusted by teams</h3>
              <p>Moderation tools and safe messaging keep conversations professional.</p>
            </div>
            <div className="plf-card">
              <div className="plf-card-ico"><FaMoneyBillWave /></div>
              <h3>Real offers</h3>
              <p>Live, transparent vacancies – no gimmicks, just real opportunities.</p>
            </div>
            <div className="plf-card">
              <div className="plf-card-ico"><FaHandshake /></div>
              <h3>Direct connection</h3>
              <p>Negotiate terms quickly and move projects forward without friction.</p>
            </div>
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section className="plf-steps">
        <div className="plf-shell">
          <h2 className="plf-h2">Get started in 3 steps</h2>
          <ol className="plf-steps-grid">
            <li>
              <span className="plf-step-num">1</span>
              <h4>Register</h4>
              <p>Create your profile with skills, languages, and availability.</p>
            </li>
            <li>
              <span className="plf-step-num">2</span>
              <h4>Apply</h4>
              <p>Use filters to find jobs that match your strengths.</p>
            </li>
            <li>
              <span className="plf-step-num">3</span>
              <h4>Connect</h4>
              <p>Chat with employers and secure your next contract.</p>
            </li>
          </ol>

          <div className="plf-center">
            <Link
              to="/register/jobseeker?utm_source=latam_lp"
              className="plf-btn plf-btn--primary plf-btn--xl plf-btn--pulse"
            >
              Create my free profile
            </Link>
          </div>
        </div>
      </section>

      {/* CTA BAND — with image background */}
      <section className="plf-cta-band">
        <div className="plf-shell plf-cta-band-inner">
          <div className="plf-cta-text">
            <span className="plf-cta-eyebrow">Fresh remote roles weekly</span>
            <h3>Ready to work with global clients?</h3>
            <p>Join {brand.name} today and access remote opportunities from anywhere in LATAM.</p>
          </div>
          <div className="plf-cta-actions">
            <Link
              to="/register/jobseeker?utm_source=latam_lp"
              className="plf-btn plf-btn--inverse plf-btn--xl"
            >
              Register
            </Link>
            <Link
              to="/find-job?utm_source=latam_lp"
              className="plf-btn plf-btn--ghost plf-btn--lg"
            >
              Explore jobs
            </Link>
          </div>
        </div>
      </section>

      {/* <Footer /> */}
      <Copyright />
    </div>
  );
};

export default PromoLatamFreelancer;
