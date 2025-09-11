import { Link, useLocation, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ReactCountryFlag from 'react-country-flag';
import { FaArrowRight, FaBolt, FaShieldAlt, FaMoneyBillWave, FaHandshake, FaBriefcase, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import { getJobBySlugOrId, trackReferralClick } from '../services/api';
import type { JobPost } from '@types';
import sanitizeHtml from 'sanitize-html';
import '../styles/job-landing.css';                     // ОТДЕЛЬНЫЙ CSS
import promoJobLP from '../assets/promoJobLP.png';        // как в LATAM LP  :contentReference[oaicite:4]{index=4}
import Copyright from '../components/Copyright';
import '../styles/promo-latam.css';
import logo from '../assets/logo.png';


export default function JobLanding() {
  const { slugId = '' } = useParams();
  const location = useLocation();
  const [job, setJob] = useState<JobPost | null>(null);
  const descText = useMemo(
    () => sanitizeHtml(job?.description || '', { allowedTags: [], allowedAttributes: {} }).slice(0, 160),
    [job?.description]
  );

  // 1) загрузка вакансии
//   useEffect(() => {
//     (async () => {
//       const data = await getJobBySlugOrId(slugId);
//       setJob(data);
//     })();
//   }, [slugId]);

// 1) загрузка вакансии (с поддержкой ?demo=1)
// 1) загрузка вакансии (поддержка ?demo=1 + корректный мок под JobPost)
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const demo = params.get("demo");

  const mkDemoJob = (): JobPost => ({
    id: "demo1",
    title: "Social Media Manager",
    description: "<p>We need We need a creative SMM specialist for TikTok/Instagram.</p>",
    location: "LATAM",
    salary: 1200,
    salary_type: "per month",            // ← из SalaryType: 'per hour' | 'per month' | 'negotiable'
    category_id: undefined,
    category_ids: [],
    category: null,
    job_type: "Full-time",               // ← из union: 'Full-time' | 'Part-time' | 'Project-based'
    employer_id: "demo-employer",
    employer: null,
    pending_review: false,
    applicationLimit: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    views: 0,
    status: "Active",
    required_skills: ["TikTok", "Instagram", "Video Editing"],
    excluded_locations: [],
  });

  if (demo) {
    setJob(mkDemoJob());
    return;
  }

  (async () => {
    try {
      const data = await getJobBySlugOrId(slugId);
      setJob(data);
    } catch (e) {
      console.warn("API not available, fallback to demo job:", e);
      setJob(mkDemoJob());
    }
  })();
}, [slugId, location.search]);



  // 2) трекинг рефки (один раз при маунте с этим ref)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (!ref) return;
    const key = `ref-tracked-${ref}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    trackReferralClick(ref).catch(() => {});
  }, [location.search]);

  if (!job) return null;

  const h1Title = `${job.title}: Work remotely. Earn globally.`; // в духе LP
  const pageUrl = `https://jobforge.net/job/${slugId}`;

  return (
    <div className="jl-root">
      <Helmet>
        <title>{job.title} — Remote Job | Jobforge</title>
        <meta name="description" content={descText || `${job.title} remote job on Jobforge.`} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content={`${job.title} — Remote Job`} />
        <meta property="og:description" content={descText} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={logo} />
      </Helmet>

      {/* HERO */}
      <section className="jl-hero">
        <div className="jl-shell">
          <div className="jl-hero-grid">
            <div className="jl-hero-left">
             <Link to="/" className="plf-brand" aria-label="Go to JobForge home">
                <div className="plf-brand-text">Jobforge_</div>
              </Link>
              <h1 className="plf-title">
                {job.title}
              </h1>
              {/* <p className="plf-title1">Work remotely. Earn globally.</p> */}
              <p className="jl-sub">
                Live, transparent vacancy. Create your profile, apply in one click, chat directly with the employer.
              </p>
              <div className="jl-cta">
                <Link to={`/register/jobseeker?utm_source=job_lp&job=${encodeURIComponent(job.id)}`} className="plf-btn plf-btn--primary plf-btn--xl plf-btn--pulse">
                  Apply now <FaArrowRight />
                </Link>
                <Link to="/find-job?utm_source=job_lp" className="jl-btn jl-btn--ghost jl-btn--lg">
                  Browse more jobs
                </Link>
              </div>

             
            </div>
            <div className="jl-hero-media">
              <img src={promoJobLP} alt="Happy freelancer" className="jl-hero-img" />
            </div>
          </div>
        </div>
      </section>

      
<section className="jl-snapshot">
  <div className="jl-shell jl-snapshot-inner">
    <div className="jl-snapshot-box">
      <h3 className="jl-snapshot-title">Role snapshot</h3>
      <ul className="jl-snapshot-list">
        <li>
          <FaBriefcase className="jl-ico" />
          <strong>Title:</strong> {job.title}
        </li>
        {job.salary_type && (
          <li>
            <FaMoneyBillWave className="jl-ico" />
            <strong>Pay:</strong> {String(job.salary ?? "Negotiable")} {job.salary_type}
          </li>
        )}
        {job.job_type && (
          <li>
            <FaClock className="jl-ico" />
            <strong>Type:</strong> {job.job_type}
          </li>
        )}
        {job.location && (
          <li>
            <FaMapMarkerAlt className="jl-ico" />
            <strong>Location:</strong> {job.location}
          </li>
        )}
      </ul>
      <Link
        to={`/register/jobseeker?utm_source=job_lp&job=${encodeURIComponent(job.id)}`}
        className="jl-btn jl-btn--primary jl-btn--xl jl-btn--block"
      >
        I’m interested
      </Link>
    </div>

    <div className="jl-snapshot-desc">
      <h4 className="jl-desc-heading">About the role</h4>
      <div dangerouslySetInnerHTML={{ __html: job.description || "" }} />
    </div>
  </div>
</section>


      {/* BENEFITS */}
       <section className="plf-benefits">
        <div className="plf-shell">
          <h2 className="plf-h2">Why freelancers from LATAM choose JobForge</h2>
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
      {/* CTA BAND */}
    
            <section className="plf-cta-band">
        <div className="plf-shell plf-cta-band-inner">
          <div className="plf-cta-text">
            <span className="plf-cta-eyebrow">Fresh remote roles weekly</span>
            <h3>Ready to work with global clients?</h3>
            <p>Join JobForge today and access remote opportunities from anywhere in LATAM.</p>
          </div>
          <div className="plf-cta-actions">
           <Link to={`/register/jobseeker?utm_source=job_lp&job=${encodeURIComponent(job.id)}`} className="plf-btn plf-btn--inverse plf-btn--xl">Register</Link>
            <Link to="/find-job?utm_source=job_lp" className="plf-btn plf-btn--ghost plf-btn--lg">Explore jobs</Link>
          </div>
        </div>
      </section>

      {/* <Footer /> */}
      <Copyright />
    </div>
  );
}
