import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import sanitizeHtml from 'sanitize-html';

import { getJobBySlugOrId } from '../services/api';
import type { JobPost } from '@types';
import { brand, brandOrigin } from '../brand';

const Vacancy: React.FC = () => {
  const { slugId = '' } = useParams();
  const location = useLocation();

  const [job, setJob] = useState<JobPost | null>(null);

  const isDemo = new URLSearchParams(location.search).has('demo');
  const origin = brandOrigin();
  const pageUrl = `${origin}/vacancy/${slugId}`;
  const ogImage = `${origin}${brand.ogImagePath || '/static/og/default.png'}`;

  const descText = useMemo(
    () =>
      sanitizeHtml(job?.description || '', {
        allowedTags: [],
        allowedAttributes: {},
      }).slice(0, 160),
    [job?.description]
  );

  // Load job (with demo fallback)
  useEffect(() => {
    const mkDemoJob = (): JobPost => ({
      id: 'demo1',
      title: 'Social Media Manager',
      description:
        '<p>We need a creative SMM specialist for TikTok/Instagram. Create and schedule posts, edit short videos, track performance.</p>',
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
        console.warn('Vacancy: API not available, fallback to demo job:', e);
        if (alive) setJob(mkDemoJob());
      }
    })();

    return () => {
      alive = false;
    };
  }, [slugId, isDemo]);

  if (!job) return null;

  // JSON-LD (no referral params)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: sanitizeHtml(job.description || '', { allowedTags: [], allowedAttributes: {} }),
    employmentType: job.job_type || undefined,
    datePosted: job.created_at,
    hiringOrganization: {
      '@type': 'Organization',
      name: brand.name,
      sameAs: origin,
    },
    jobLocationType: 'TELECOMMUTE',
    applicantLocationRequirements: job.location || undefined,
    url: pageUrl,
  };

  return (
    <div className="vacancy-shell" style={{ maxWidth: 960, margin: '24px auto', padding: '0 16px' }}>
      <Helmet>
        <title>{`${job.title} | ${brand.name}`}</title>
        <meta
          name="description"
          content={descText || `${job.title} vacancy on ${brand.name}.`}
        />

        {/* canonical/OG url — clean URL without query */}
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={brand.name} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={`${job.title} | ${brand.name}`} />
        <meta
          property="og:description"
          content={descText || `${job.title} vacancy on ${brand.name}.`}
        />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:alt" content={`${brand.name} — remote jobs`} />

        {/* demo page: noindex */}
        {isDemo && <meta name="robots" content="noindex,nofollow" />}

        {/* JSON-LD */}
        {job && (
          <script type="application/ld+json">
            {JSON.stringify(jsonLd).replace(/</g, '\\u003c')}
          </script>
        )}
      </Helmet>

      <header style={{ marginBottom: 16 }}>
        <Link
          to="/"
          style={{ textDecoration: 'none', color: '#4e74c8', fontWeight: 800 }}
          aria-label={`Go to ${brand.name} home`}
          title={brand.name}
        >
          {brand.wordmark || brand.name}
        </Link>
        <h1 style={{ margin: '8px 0 6px' }}>{job.title}</h1>
        <div style={{ color: '#64748b', fontSize: 14 }}>
          {job.location && (
            <span>
              <strong>Location:</strong> {job.location}
            </span>
          )}
          {job.job_type && (
            <span style={{ marginLeft: 12 }}>
              <strong>Type:</strong> {job.job_type}
            </span>
          )}
          {job.salary_type && (
            <span style={{ marginLeft: 12 }}>
              <strong>Pay:</strong> {String(job.salary ?? 'Negotiable')} {job.salary_type}
            </span>
          )}
          {job.status && (
            <span style={{ marginLeft: 12 }}>
              <strong>Status:</strong> {job.status}
            </span>
          )}
        </div>
      </header>

      <article
        dangerouslySetInnerHTML={{ __html: job.description || '' }}
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: 16,
        }}
      />

      <div style={{ marginTop: 16 }}>
        <Link
          to={`/register/jobseeker?utm_source=vacancy&job=${encodeURIComponent(
            job.id
          )}&return=${encodeURIComponent(slugId ? `/vacancy/${slugId}` : `/jobs/${job.id}`)}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            borderRadius: 999,
            background: '#4e74c8',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 700,
            boxShadow: '0 8px 22px rgba(18,33,73,.12)',
          }}
        >
          Apply for this role
        </Link>
      </div>
    </div>
  );
};

export default Vacancy;
