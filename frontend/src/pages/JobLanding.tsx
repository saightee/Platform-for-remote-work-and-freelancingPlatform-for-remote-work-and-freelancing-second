import { Link, useLocation, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import sanitizeHtml from 'sanitize-html';
import {
  FaArrowRight,
  FaBolt,
  FaShieldAlt,
  FaMoneyBillWave,
  FaHandshake,
  FaBriefcase,
  FaClock,
  FaMapMarkerAlt,
} from 'react-icons/fa';
import { brand, brandOrigin } from '../brand';

import { getJobBySlugOrId, trackReferralClick } from '../services/api';
import type { JobPost } from '@types';

import '../styles/job-landing.css';
import '../styles/promo-latam.css';
import promoJobLP from '../assets/promoJobLP.png';
import Copyright from '../components/Copyright';

type Props = {
  /** опционально — если когда-нибудь будет серверный пререндер с префетчем */
  prefetchedJob?: JobPost;
};

export default function JobLanding({ prefetchedJob }: Props) {
  const { slugId = '' } = useParams();
  const location = useLocation();

  const [job, setJob] = useState<JobPost | null>(prefetchedJob ?? null);

  const params = new URLSearchParams(location.search);
  const isDemo = params.has('demo');

  const descText = useMemo(
    () =>
      sanitizeHtml(job?.description || '', {
        allowedTags: [],
        allowedAttributes: {},
      }).slice(0, 160),
    [job?.description]
  );

const pageUrl = `${brandOrigin()}/job/${slugId}`;
const ogImage = `${brandOrigin()}${brand.ogImagePath}`;

  // =========================
  // Загрузка данных (с поддержкой ?demo=1 и fallback)
  // =========================
  useEffect(() => {
    if (prefetchedJob) return;

    const mkDemoJob = (): JobPost => ({
      id: 'demo1',
      title: 'Social Media Manager',
      description: '<p>We need a creative SMM specialist for TikTok/Instagram.</p>',
      location: 'LATAM',
      salary: 1200,
      salary_type: 'per month', // 'per hour' | 'per month' | 'negotiable'
      category_id: undefined,
      category_ids: [],
      category: null,
      job_type: 'Full-time', // 'Full-time' | 'Part-time' | 'Project-based'
      employer_id: 'demo-employer',
      employer: null,
      pending_review: false,
      applicationLimit: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      views: 0,
      status: 'Active',
      required_skills: ['TikTok', 'Instagram', 'Video Editing'],
      excluded_locations: [],
    });

    if (isDemo) {
      setJob(mkDemoJob());
      return;
    }

    let alive = true;
    (async () => {
      try {
        const data = await getJobBySlugOrId(slugId);
        if (alive) setJob(data);
      } catch (e) {
        console.warn('API not available, fallback to demo job:', e);
        if (alive) setJob(mkDemoJob());
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugId, isDemo, prefetchedJob]);

  // =========================
  // Рефкод: трекинг + сохранение в cookie + чистка URL
  // =========================
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const ref = qs.get('ref');
    if (!ref) return;

    // 1) Трекнем клик один раз за сессию
    const key = `ref-tracked-${ref}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      trackReferralClick(ref).catch(() => {});
    }

    // 2) Сохраним в cookie (30 дней) — регистрацию привяжем к этому рефу
    try {
      document.cookie = `jf_ref=${encodeURIComponent(ref)}; Max-Age=${
        60 * 60 * 24 * 30
      }; Path=/; SameSite=Lax`;
      localStorage.setItem('referralCode', ref);
    } catch {
      /* no-op */
    }

    // 3) Очистим URL (оставим только canonical без query)
    const clean = location.pathname + (location.hash || '');
    window.history.replaceState(null, '', clean);
  }, [location.search, location.pathname, location.hash]);

  if (!job) return null;

  // === возврат на страницу вакансии после регистрации ===
  const returnTo = slugId ? `/vacancy/${slugId}` : `/jobs/${job.id}`;

  // CTA: реф не добавляем — используем cookie jf_ref; передаём return
  const applyHref = `/register/jobseeker?utm_source=job_lp&job=${encodeURIComponent(
    job.id
  )}&return=${encodeURIComponent(returnTo)}`;

  // JSON-LD (минимальный JobPosting)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: sanitizeHtml(job.description || '', { allowedTags: [], allowedAttributes: {} }),
    employmentType: job.job_type || undefined,
    datePosted: job.created_at,
    validThrough: undefined,
    hiringOrganization: {
      '@type': 'Organization',
      name: brand.name,
      sameAs: brandOrigin(),
    },
    jobLocationType: 'TELECOMMUTE',
    applicantLocationRequirements: job.location || undefined,
    url: pageUrl,
  };

  return (
    <div className="jl-root">
      <Helmet>
       <title>{`${job.title} — Remote Job | ${brand.name}`}</title>
<meta
  name="description"
  content={descText || `${job.title} remote job on ${brand.name}.`}
/>

        {/* Canonical/OG — без ?ref */}
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={brand.name} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={`${job.title} — Remote Job`} />
        <meta
  property="og:description"
  content={descText || `${job.title} on ${brand.name}.`}
/>
        <meta property="og:image" content={ogImage} />
<meta property="og:image:alt" content={`${brand.name} — remote jobs`} />

        {/* демо-страницу не индексируем */}
        {isDemo && <meta name="robots" content="noindex,nofollow" />}

        {/* JSON-LD */}
        {job && (
          <script type="application/ld+json">
            {JSON.stringify(jsonLd).replace(/</g, '\\u003c')}
          </script>
        )}
      </Helmet>

      {/* HERO */}
      <section className="jl-hero">
        <div className="jl-shell">
          <div className="jl-hero-grid">
            <div className="jl-hero-left">
              <Link to="/" className="plf-brand" aria-label={`Go to ${brand.name} home`}>
  <div className="plf-brand-text">{brand.wordmark}</div>
</Link>

              <h1 className="plf-title">{job.title}</h1>

              <p className="jl-sub">
                Live, transparent vacancy. Create your profile, apply in one click, chat directly with the employer.
              </p>

              <div className="jl-cta">
                <Link
                  to={applyHref}
                  className="plf-btn plf-btn--primary plf-btn--xl plf-btn--pulse"
                >
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

      {/* SNAPSHOT */}
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
    <strong>Pay:</strong>{' '}
    {job.salary_type.toLowerCase() === 'negotiable'
      ? 'Negotiable'
      : `${String(job.salary ?? 'Negotiable')} ${job.salary_type}`}
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
              to={applyHref}
              className="jl-btn jl-btn--primary jl-btn--xl jl-btn--block"
            >
              I’m interested
            </Link>
          </div>

          <div className="jl-snapshot-desc">
            <h4 className="jl-desc-heading">About the role</h4>
            <div dangerouslySetInnerHTML={{ __html: job.description || '' }} />
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="plf-benefits">
        <div className="plf-shell">
          <h2 className="plf-h2">Why freelancers choose {brand.name}</h2>
          <div className="plf-cards">
            <div className="plf-card">
              <div className="plf-card-ico">
                <FaBolt />
              </div>
              <h3>Setup in minutes</h3>
              <p>Build a compelling profile, add your portfolio, and start applying instantly.</p>
            </div>
            <div className="plf-card">
              <div className="plf-card-ico">
                <FaShieldAlt />
              </div>
              <h3>Trusted by teams</h3>
              <p>Moderation tools and safe messaging keep conversations professional.</p>
            </div>
            <div className="plf-card">
              <div className="plf-card-ico">
                <FaMoneyBillWave />
              </div>
              <h3>Real offers</h3>
              <p>Live, transparent vacancies — no gimmicks, just real opportunities.</p>
            </div>
            <div className="plf-card">
              <div className="plf-card-ico">
                <FaHandshake />
              </div>
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
              to={applyHref}
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
            <p>Join {brand.name} today and access remote opportunities from anywhere.</p>
          </div>
          <div className="plf-cta-actions">
            <Link to={applyHref} className="plf-btn plf-btn--inverse plf-btn--xl">
              Register
            </Link>
            <Link to="/find-job?utm_source=job_lp" className="plf-btn plf-btn--ghost plf-btn--lg">
              Explore jobs
            </Link>
          </div>
        </div>
      </section>

      <Copyright />
    </div>
  );
}
