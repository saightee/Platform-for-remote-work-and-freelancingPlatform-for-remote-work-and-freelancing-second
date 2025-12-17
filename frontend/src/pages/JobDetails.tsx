import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

import {
  getJobBySlugOrId,
  applyToJobPostExtended,
  incrementJobView,
  checkJobApplicationStatus,
} from '../services/api';
import { JobPost } from '@types';
import { useRole } from '../context/RoleContext';

import {
  Eye,
  Briefcase,
  DollarSign,
  MapPin,
  CalendarDays,
  FolderClosed,
  UserCircle,
  LogIn,
  UserPlus,
  ArrowLeft,
} from 'lucide-react';

import { format, utcToZonedTime } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import sanitizeHtml from 'sanitize-html';
import Loader from '../components/Loader';
import { Helmet } from 'react-helmet-async';
import { brand, brandOrigin, brandBackendOrigin } from '../brand';
import '../styles/job-details.css';

type JobExtras = {
  company_name?: string;
  companyName?: string;
  expires_at?: string;
};

const JobDetails: React.FC = () => {
  const { id, slugId } = useParams<{ id?: string; slugId?: string }>();
  const slugOrId = (slugId || id || '').trim();

  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useRole();

  const [job, setJob] = useState<JobPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState<boolean | null>(null);

  const [coverLetter, setCoverLetter] = useState('');
  const [relevantExperience, setRelevantExperience] = useState('');
  const [fullName, setFullName] = useState<string>('');
  const [referredBy, setReferredBy] = useState<string>('');
  const [applyError, setApplyError] = useState<string | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const viewed = useRef(false);

  // ===== LOAD JOB =====
  useEffect(() => {
    if (!slugOrId) return;

    let alive = true;

    const fetchJob = async () => {
      try {
        setLoading(true);
        setError(null);
        setHasApplied(null);

        // --- 1) Load job by slug or id ---
        const jobData = await getJobBySlugOrId(slugOrId);
        if (!alive) return;

        const normalizeJob = (raw: any): JobPost => {
          const empObj =
            raw.employer ??
            raw.owner ??
            raw.created_by ??
            raw.createdBy ??
            raw.posted_by ??
            raw.postedBy ??
            ((raw.employer_id ||
              raw.employer_username ||
              raw.employer_avatar ||
              raw.owner_id ||
              raw.owner_username ||
              raw.owner_avatar ||
              raw.created_by_id ||
              raw.created_by_username ||
              raw.created_by_avatar ||
              raw.posted_by_id ||
              raw.posted_by_username ||
              raw.posted_by_avatar) && {
              id:
                raw.employer_id ??
                raw.owner_id ??
                raw.created_by_id ??
                raw.posted_by_id ??
                raw.employer?.id ??
                null,
              username:
                raw.employer_username ??
                raw.owner_username ??
                raw.created_by_username ??
                raw.posted_by_username ??
                raw.employer?.username ??
                null,
              avatar:
                raw.employer_avatar ??
                raw.owner_avatar ??
                raw.created_by_avatar ??
                raw.posted_by_avatar ??
                raw.employer?.avatar ??
                null,
            });

          return {
            ...raw,
            employer: empObj,
          };
        };

        const normalized = normalizeJob(jobData);
        setJob(normalized);

        const jobId = jobData.id;

        // --- 2) Referral code from ?ref ---
        const refFromUrl = new URLSearchParams(window.location.search).get('ref');
        if (refFromUrl && jobId) {
          localStorage.setItem('referralCode', refFromUrl);
          localStorage.setItem('referralJobId', jobId);
          const clean = location.pathname + (location.hash || '');
          window.history.replaceState(null, '', clean);
        }

        // --- 3) Increment views (once) ---
        if (!viewed.current && jobId) {
          viewed.current = true;
          try {
            const response = await incrementJobView(jobId);
            if (!alive) return;
            setJob(prev =>
              prev
                ? { ...prev, views: response?.views ?? (jobData.views || 0) + 1 }
                : prev,
            );
          } catch (viewError) {
            console.error('Error incrementing job view:', viewError);
          }
        }

        // --- 4) Application status for jobseeker ---
        if (profile?.role === 'jobseeker' && jobId) {
          try {
            const applicationStatus = await checkJobApplicationStatus(jobId);
            if (!alive) return;
            setHasApplied(applicationStatus.hasApplied);
          } catch (e) {
            console.warn('check status failed → assume not applied', e);
            if (!alive) return;
            setHasApplied(false);
          }
        }
      } catch (err: any) {
        console.error('Error fetching job:', err);
        if (!alive) return;
        setError(
          err?.response?.data?.message ||
            'Failed to load job details. Please try again.',
        );
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchJob();
    return () => {
      alive = false;
    };
  }, [slugOrId, profile, location.pathname, location.hash]);

  // ===== REFERRAL PRESENCE (for register URL) =====
  const [hasReferral, setHasReferral] = useState(false);
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const refQ = qs.get('ref');
    const refLS = localStorage.getItem('referralCode');
    const refCookie = document.cookie.split('; ').some(s => s.startsWith('jf_ref='));
    setHasReferral(Boolean(refQ || refLS || refCookie));
  }, [location.search]);

  // ===== APPLY HANDLERS =====
  const handleApply = async () => {
    if (hasApplied) return;
    if (!profile) {
      navigate('/login');
      return;
    }
    if (profile.role !== 'jobseeker') {
      setError('Only job seekers can apply for jobs.');
      return;
    }

    setApplyError(null);
    setFullName('');
    setReferredBy('');
    setCoverLetter('');
    setRelevantExperience('');
    setIsApplyModalOpen(true);
  };

  useEffect(() => {
    if (!isApplyModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsApplyModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isApplyModalOpen]);

  const submitApply = async () => {
    if (!coverLetter.trim()) {
      setApplyError('Cover letter is required.');
      return;
    }
    if (!relevantExperience.trim()) {
      setApplyError('Relevant experience is required.');
      return;
    }

    try {
      const jobId = job?.id;
      if (jobId) {
        await applyToJobPostExtended({
          job_post_id: jobId,
          cover_letter: coverLetter.trim(),
          relevant_experience: relevantExperience.trim(),
          full_name: fullName.trim() || undefined,
          referred_by: referredBy.trim() || undefined,
        });
        setHasApplied(true);
        setIsApplyModalOpen(false);

        navigate('/jobseeker-dashboard/messages', {
          replace: true,
          state: { jobPostId: jobId },
        });
      }
    } catch (err: any) {
      console.error('Error applying to job:', err);
      const msg: string = err?.response?.data?.message || '';

      if (
        (err?.response?.status === 400 || err?.response?.status === 409) &&
        /already applied/i.test(msg)
      ) {
        setHasApplied(true);
        setIsApplyModalOpen(false);
        navigate('/jobseeker-dashboard/my-applications', { replace: true });
        return;
      }

      setApplyError(msg || 'Failed to apply. Please try again.');
    }
  };

  // ===== HELPERS =====
  const formatDateInTimezone = (dateString?: string, timezone?: string): string => {
    if (!dateString) return 'Not specified';
    try {
      const date = parseISO(dateString);
      const d = timezone ? utcToZonedTime(date, timezone) : date;
      return format(d, 'PPpp', { timeZone: timezone });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const goBackToSearch: React.MouseEventHandler<HTMLAnchorElement> = e => {
    e.preventDefault();
    navigate('/find-job', {
      state: { scrollPosition: (location.state as any)?.scrollPosition || 0 },
    });
  };

  if (loading) return <Loader />;
  if (!job) return <div>Job not found.</div>;

  const renderSalary = (j: JobPost): string => {
    const st = String(j.salary_type ?? '')
      .trim()
      .toLowerCase()
      .replace(/_/g, ' ');

    if (st === 'negotiable') return 'Negotiable';

    const unit =
      st === 'per hour'
        ? 'per hour'
        : st === 'per month'
        ? 'per month'
        : st || '';

    const min = j.salary != null ? Number(j.salary) : NaN;
    const max = (j as any).salary_max != null ? Number((j as any).salary_max) : NaN;

    const currency =
      (j as any).currency ||
      (j as any).salary_currency ||
      '';

    if (!Number.isFinite(min) && !Number.isFinite(max)) return 'Not specified';

    if (Number.isFinite(min) && Number.isFinite(max) && max !== min) {
      const prefix = currency ? `${currency}` : '';
      return `${prefix}${min}–${max} ${unit}`.trim();
    }

    const value = Number.isFinite(min) ? min : max;
    if (Number.isFinite(value)) {
      const prefix = currency ? `${currency}` : '';
      return unit ? `${prefix}${value} ${unit}`.trim() : `${prefix}${value}`;
    }

    return 'Not specified';
  };

  const cleanedDesc = sanitizeHtml(job.description || '', {
    allowedTags: [],
    allowedAttributes: {},
  });
  const salary = job.salary ?? null;

  const unitMap: Record<string, 'HOUR' | 'MONTH' | 'YEAR'> = {
    'per hour': 'HOUR',
    'per month': 'MONTH',
  };

  const j = job as typeof job & JobExtras;

  const companyName =
    j.company_name ??
    j.companyName ??
    `${brand.name} Employer`;

  const validThrough = j.expires_at;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: cleanedDesc,
    datePosted: job.created_at,
    employmentType: job.job_type || 'CONTRACTOR',
    jobLocationType: job.location === 'Remote' ? 'TELECOMMUTE' : 'ON_SITE',
    ...(job.location === 'Remote'
      ? { applicantLocationRequirements: [{ '@type': 'Country', name: 'Remote' }] }
      : {}),
    hiringOrganization: {
      '@type': 'Organization',
      name: companyName,
      sameAs: `${brandOrigin()}/`,
    },
    ...(validThrough ? { validThrough } : {}),
    ...(salary
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: 'USD',
            value: {
              '@type': 'QuantitativeValue',
              value: salary,
              unitText: unitMap[job.salary_type || 'per month'] || 'MONTH',
            },
          },
        }
      : {}),
  };

  const backAfterReport =
    profile?.role === 'employer'
      ? '/employer-dashboard'
      : profile?.role === 'jobseeker'
      ? '/jobseeker-dashboard'
      : '/';

  const employerAvatar =
    job.employer?.avatar ??
    (job as any).employer_avatar ??
    (job as any).owner_avatar ??
    (job as any).created_by_avatar ??
    (job as any).posted_by_avatar ??
    null;

  const displayEmployer = (() => {
    const jj = job as JobPost & { company_name?: string | null; companyName?: string | null };

    const byCompanyField = jj.company_name ?? jj.companyName;

    const byEmployerUsername =
      jj.employer?.username ??
      (jj as any).employer_username ??
      (jj as any).owner_username ??
      (jj as any).created_by_username ??
      (jj as any).posted_by_username ??
      (jj as any).employer?.name ??
      (jj as any).employer?.company_name ??
      'Unknown';

    const display =
      (byCompanyField && byCompanyField.trim()) || byEmployerUsername;

    return display;
  })();

  const primaryCategoryName = (() => {
    const anyJob: any = job;
    if (Array.isArray(anyJob.categories) && anyJob.categories.length > 0) {
      return anyJob.categories[0].name;
    }
    return anyJob.category?.name || 'Not specified';
  })();

  const registerUrl = (() => {
    const base = '/register/jobseeker';
    const ret = slugId
      ? `/vacancy/${slugId}`
      : job?.id
      ? `/jobs/${job.id}`
      : '/find-job';
    return hasReferral
      ? `${base}?utm_source=job_details&job=${encodeURIComponent(
          job?.id || '',
        )}&return=${encodeURIComponent(ret)}`
      : `${base}?utm_source=job_details`;
  })();

  const isJobOpen = job.status === 'Active';

  return (
    <div>
      <Helmet>
        <title>{`${job.title} | ${brand.name}`}</title>
        <meta name="description" content={cleanedDesc.slice(0, 160)} />
        {(() => {
          const canonical = slugId
            ? `${brandOrigin()}/vacancy/${slugId}`
            : `${brandOrigin()}/jobs/${job.id}`;
          return (
            <>
              <link rel="canonical" href={canonical} />
              <meta property="og:title" content={`${job.title} | ${brand.name}`} />
              <meta
                property="og:description"
                content={cleanedDesc.slice(0, 160)}
              />
              <meta property="og:url" content={canonical} />
              <meta property="og:site_name" content={brand.name} />
            </>
          );
        })()}
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      <Header />

      <div className="jd-shell">
        <div className="jd-shell-inner">
          {/* HEADER */}
          <div className="jd-header">
            <a
              href="/find-job"
              onClick={goBackToSearch}
              className="jd-back-link"
              aria-label="Back to search results"
            >
              <ArrowLeft />
              Back to search results
            </a>
            {/* <h1 className="jd-title">{job.title}</h1> */}

            {/* {!profile && (
              <p className="login-prompt">
                <span>Please</span>
                <Link to="/login" className="lp-btn lp-primary">
                  <LogIn /> Log in
                </Link>
                <span>or</span>
                <Link to={registerUrl} className="lp-btn lp-outline">
                  <UserPlus /> Register
                </Link>
                <span>as jobseeker to apply for this job.</span>
              </p>
            )} */}

            {error && (
              <p
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: '#b91c1c',
                }}
              >
                {error}
              </p>
            )}
          </div>

          {/* TOP GRID: LEFT DETAILS + RIGHT CARD */}
          <div className="jd-top">
            {/* LEFT: Job Details */}
            <aside className="jd-card jd-details-card">
              <h3 className="jd-details-title">Job Details</h3>
              <div className="jd-details-list">
                <div className="jd-detail-row">
                  <div className="jd-detail-icon">
                    <Briefcase />
                  </div>
                  <div className="jd-detail-text">
                    <div className="jd-detail-label">Type of Work</div>
                    <div className="jd-detail-value">
                      {job.job_type || 'Not specified'}
                    </div>
                  </div>
                </div>

                <div className="jd-detail-row">
                  <div className="jd-detail-icon">
                    <DollarSign />
                  </div>
                  <div className="jd-detail-text">
                    <div className="jd-detail-label">Salary</div>
                    <div className="jd-detail-value">{renderSalary(job)}</div>
                  </div>
                </div>

                <div className="jd-detail-row">
                  <div className="jd-detail-icon">
                    <MapPin />
                  </div>
                  <div className="jd-detail-text">
                    <div className="jd-detail-label">Location</div>
                    <div className="jd-detail-value">
                      {job.location || 'Not specified'}
                    </div>
                  </div>
                </div>

                <div className="jd-detail-row">
                  <div className="jd-detail-icon">
                    <FolderClosed />
                  </div>
                  <div className="jd-detail-text">
                    <div className="jd-detail-label">Category</div>
                    <div className="jd-detail-value">{primaryCategoryName}</div>
                  </div>
                </div>

                <div className="jd-detail-row">
                  <div className="jd-detail-icon">
                    <CalendarDays />
                  </div>
                  <div className="jd-detail-text">
                    <div className="jd-detail-label">Date Updated</div>
                    <div className="jd-detail-value">
                      {formatDateInTimezone(job.updated_at, profile?.timezone)}
                    </div>
                  </div>
                </div>

                <div className="jd-detail-row">
                  <div className="jd-detail-icon">
                    <Eye />
                  </div>
                  <div className="jd-detail-text">
                    <div className="jd-detail-label">Views</div>
                    <div className="jd-detail-value">{job.views || 0}</div>
                  </div>
                </div>
              </div>
            </aside>

            {/* RIGHT: main job card with Apply */}
            <section className="jd-card jd-main-card">
              <div className="jd-main-top">
                <div className="jd-employer-avatar-wrap">
                  {employerAvatar ? (
                    <img
                      src={
                        String(employerAvatar).startsWith('http')
                          ? employerAvatar
                          : `${brandBackendOrigin()}${employerAvatar}`
                      }
                      alt="Employer Avatar"
                      className="jd-employer-avatar"
                    />
                  ) : (
                    <UserCircle className="jd-employer-avatar-fallback" />
                  )}
                </div>

                <div className="jd-main-text">
                  <h1 className="jd-main-title">{job.title}</h1>

                  {isJobOpen && (
                    <span className="jd-status-pill jd-status-pill--open">
                      Open to offers
                    </span>
                  )}
                  {!isJobOpen && job.status && (
                    <span className="jd-status-pill jd-status-pill--closed">
                      {job.status}
                    </span>
                  )}

                  <div className="jd-main-company">{displayEmployer}</div>
                </div>
              </div>

              {Array.isArray(job.required_skills) &&
                job.required_skills.length > 0 && (
                  <div className="jd-skill-chips">
                    {job.required_skills.map((skill, idx) => (
                      <span key={idx} className="jd-skill-chip">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

              <div className="jd-main-actions">
                {profile?.role === 'jobseeker' && isJobOpen ? (
                  hasApplied === true ? (
                    <div
                      className="jd-applied-pill"
                      role="status"
                      aria-live="polite"
                    >
                      You’ve already applied to this job
                    </div>
                  ) : hasApplied === false ? (
                    <button
                      type="button"
                      onClick={handleApply}
                      className="jd-btn jd-btn-primary"
                    >
                      Apply Now
                    </button>
                  ) : null
                ) : !profile ? (
                  <button
                    type="button"
                    onClick={() => navigate(registerUrl)}
                    className="jd-btn jd-btn-primary"
                    aria-label="Register to apply for this job"
                  >
                    Register to Apply for Job
                  </button>
                ) : null}

                {/* View company – пока заглушка */}
                <button
                  type="button"
                  className="jd-btn jd-btn-secondary"
                  disabled
                >
                  View Company
                </button>

                {profile && profile.id !== job.employer?.id && (
                  <Link
                    to={`/complaint?type=job_post&id=${job.id}&return=${encodeURIComponent(
                      backAfterReport,
                    )}`}
                    className="jd-report-link"
                  >
                    Report Job Post
                  </Link>
                )}
              </div>
            </section>
          </div>

          {/* DESCRIPTION */}
          <section className="jd-card jd-body-card">
            <h2 className="jd-section-title">Job Overview</h2>
            <div
              className="jd-body-text"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(job.description),
              }}
            />
          </section>

          {/* CTA только для неавторизованных */}
          {!profile && (
            <section className="jd-cta">
              <div className="jd-cta-inner">
                <h3 className="jd-cta-title">
                  Ready to apply for this position?
                </h3>
                <p className="jd-cta-text">
                  Create your free account to submit your application and get
                  noticed by employers.
                </p>
                <button
                  type="button"
                  className="jd-cta-btn"
                  onClick={() => navigate(registerUrl)}
                >
                  Register to Apply
                </button>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* APPLY MODAL (логика и разметка сохранены) */}
      {isApplyModalOpen && (
        <div
          className="modal"
          onClick={e => {
            if (e.target === e.currentTarget) setIsApplyModalOpen(false);
          }}
        >
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="applyTitle"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="close"
              onClick={() => setIsApplyModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h3 id="applyTitle">Apply</h3>

            {applyError && (
              <div
                className="alert alert-error"
                role="alert"
                style={{ marginBottom: 12 }}
              >
                {applyError}
              </div>
            )}

            <form
              className="apply-form"
              onSubmit={e => {
                e.preventDefault();
                submitApply();
              }}
              noValidate
            >
              <div className="apply-row">
                <label className="apply-label" htmlFor="fullName">
                  Full Name (optional)
                </label>
                <input
                  id="fullName"
                  type="text"
                  className="apply-input"
                  value={fullName}
                  onChange={e => {
                    setFullName(e.target.value);
                    if (applyError) setApplyError(null);
                  }}
                  placeholder="Your full name"
                />
              </div>

              <div className="apply-row">
                <label className="apply-label" htmlFor="referredBy">
                  Referred By (optional)
                </label>
                <input
                  id="referredBy"
                  type="text"
                  className="apply-input"
                  value={referredBy}
                  onChange={e => setReferredBy(e.target.value)}
                  placeholder="The name/email/ref code of who recommended you"
                />
              </div>

              <div className="apply-row">
                <label
                  className="apply-label"
                  htmlFor="relevantExperience"
                >
                  Relevant experience *
                  <span
                    className="apply-hint"
                    style={{
                      display: 'block',
                      fontSize: 12,
                      opacity: 0.8,
                    }}
                  >
                    Describe relevant experience: companies, roles, tasks,
                    stack, achievements.
                  </span>
                </label>
                <textarea
                  id="relevantExperience"
                  className="apply-textarea"
                  rows={6}
                  value={relevantExperience}
                  onChange={e => setRelevantExperience(e.target.value)}
                  placeholder="Describe relevant experience (companies, roles, tasks, stack, achievements…)"
                  required
                />
              </div>

              <div className="apply-row">
                <label className="apply-label" htmlFor="coverLetter">
                  Why are you a good fit for this role? *
                </label>
                <textarea
                  id="coverLetter"
                  className="apply-textarea"
                  rows={6}
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                  placeholder="Explain why you’re a strong fit for the role…"
                  required
                />
              </div>

              <p className="apply-help">
                Your resume from profile will be attached automatically.
              </p>

              <div className="apply-actions">
                <button type="submit" className="apply-btn">
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default JobDetails;
