import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import Hero from '../components/Hero';
import HowItWorks from '../components/HowItWorks';
import FeaturedJobs from '../components/FeaturedJobs';
import FeaturedFreelancers from '../components/FeaturedFreelancers.tsx';
import Benefits from '../components/Benefits';
import Footer from '../components/Footer';
import { brand } from '../brand';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import "../styles/lovable-home.css";
import ApplyJobModal from '../components/ApplyJobModal';

type JwtPayload = { exp?: number };

const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  const t = localStorage.getItem('token');
  if (!t) return false;
  try {
    const { exp } = jwtDecode<JwtPayload>(t);
    return !exp || exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

const COOKIE_KEY = 'cookieConsent';
const CONSENT_TTL_DAYS = 365;


const Home: React.FC = () => {
  const authed = isAuthenticated();
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  const [applyOpen, setApplyOpen] = useState(false);
const [applyJob, setApplyJob] = useState<any | null>(null);

const openApply = (job: any) => {
  setApplyJob(job);
  setApplyOpen(true);
};

const closeApply = () => {
  setApplyOpen(false);
  setApplyJob(null);
};


  // cookie-баннер (оставляем твою логику)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(COOKIE_KEY);
      if (!raw) {
        setShowCookieBanner(true);
        return;
      }
      if (raw === 'accepted') {
        setShowCookieBanner(false);
        return;
      }
      const parsed = JSON.parse(raw) as { value: 'accepted'; ts: number };
      const age = Date.now() - (parsed?.ts || 0);
      const fresh = age < CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000;
      setShowCookieBanner(!fresh);
    } catch {
      setShowCookieBanner(true);
    }
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === COOKIE_KEY) setShowCookieBanner(false);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleCookieConsent = () => {
    try {
      localStorage.setItem(
        COOKIE_KEY,
        JSON.stringify({ value: 'accepted', ts: Date.now() })
      );
    } catch {
      localStorage.setItem(COOKIE_KEY, 'accepted');
    }
    setShowCookieBanner(false);
  };

  return (
    <div className="oj-home">
    <div className="oj-app">
      <Helmet>
        <title>{brand.siteTitle}</title>
        <meta name="description" content={brand.siteDescription} />
        <link rel="canonical" href={`https://${brand.domain}/`} />
        <meta property="og:title" content={brand.ogTitle} />
        <meta property="og:description" content={brand.ogDescription} />
        <meta property="og:url" content={`https://${brand.domain}/`} />
      </Helmet>

      <Header />

      <main>
        <Hero />
        {!authed && <HowItWorks />}
        <FeaturedJobs onApply={openApply} />
        <FeaturedFreelancers />
        <Benefits />
      </main>
<ApplyJobModal isOpen={applyOpen} job={applyJob} onClose={closeApply} />

      <Footer />
    
      {/* cookie banner как был */}
      {showCookieBanner && (
        <div
          className="cb-banner"
          role="dialog"
          aria-live="polite"
          aria-label="Cookie notice"
        >
          <div className="cb-container">
            <div className="cb-text">
              <strong>We use cookies</strong> to keep the site working properly and to analyze
              traffic. Read our&nbsp;
              <Link to="/privacy-policy" className="cb-link">
                Privacy &amp; Data Policy
              </Link>
              .
            </div>

            <div className="cb-actions">
              <button
                className="cb-btn"
                onClick={handleCookieConsent}
                type="button"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default Home;
