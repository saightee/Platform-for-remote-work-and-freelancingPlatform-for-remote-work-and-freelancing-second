import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { getJobPost, applyToJobPost, incrementJobView, checkJobApplicationStatus, applyToJobPostExtended } from '../services/api';
import { JobPost } from '@types';
import { useRole } from '../context/RoleContext';
import { FaEye, FaBriefcase, FaDollarSign, FaMapMarkerAlt, FaCalendarAlt, FaUserCircle, FaTools, FaFolder, FaSignInAlt, FaUserPlus } from 'react-icons/fa';
import { format, utcToZonedTime } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import sanitizeHtml from 'sanitize-html';
import Loader from '../components/Loader';
import { Helmet } from 'react-helmet-async';
import '../styles/promo-latam.css';




const JobDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useRole();
  const [job, setJob] = useState<JobPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState<boolean | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
const [fullName, setFullName] = useState<string>('');        // NEW
const [referredBy, setReferredBy] = useState<string>('');    // NEW
const [applyError, setApplyError] = useState<string | null>(null); // NEW (ошибки модалки)
const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const viewed = useRef(false); // Добавлено для предотвращения double increment

  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref) {
    localStorage.setItem('referralCode', ref);
    if (id) localStorage.setItem('referralJobId', id);
  }
}, [id]);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        if (id) {
          setLoading(true);
          setError(null);
          setHasApplied(null);
          const jobData = await getJobPost(id);
          setJob(jobData);
          if (!viewed.current) {
            viewed.current = true;
            try {
              const response = await incrementJobView(id);
              setJob((prev) => (prev ? { ...prev, views: response.views || (jobData.views || 0) + 1 } : prev));
            } catch (viewError) {
              console.error('Error incrementing job view:', viewError);
            }
          }
         if (profile?.role === 'jobseeker') {
  try {
    const applicationStatus = await checkJobApplicationStatus(id);
    setHasApplied(applicationStatus.hasApplied);
  } catch (e) {
    console.warn('check status failed → assume not applied', e);
    // если проверка упала (например, 404), не ломаем UI — показываем кнопку Apply
    setHasApplied(false);
  }
}
        }
      } catch (err: any) {
        console.error('Error fetching job:', err);
        setError(err.response?.data?.message || 'Failed to load job details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id, profile]);

const handleApply = async () => {
  if (hasApplied) return;
  if (!profile) { navigate('/login'); return; }
  if (profile.role !== 'jobseeker') { setError('Only job seekers can apply for jobs.'); return; }

  // reset перед открытием
  setApplyError(null);
  setFullName('');
  setReferredBy('');
  setCoverLetter('');
  setIsApplyModalOpen(true);
};

useEffect(() => {
  if (!isApplyModalOpen) return;
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsApplyModalOpen(false); };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [isApplyModalOpen]);

const submitApply = async () => {
  // локальная валидация модалки
  if (!coverLetter.trim()) {
    setApplyError('Cover letter is required.');
    return;
  }

  try {
    if (id) {
      await applyToJobPostExtended({
        job_post_id: id,
        cover_letter: coverLetter,
        full_name: fullName.trim() ? fullName.trim() : undefined,
        referred_by: referredBy.trim() ? referredBy.trim() : undefined,
      });
      setHasApplied(true);
      setIsApplyModalOpen(false);
      navigate('/my-applications');
    }
  } catch (err: any) {
    console.error('Error applying to job:', err);
    const msg: string = err?.response?.data?.message || '';

    if ((err?.response?.status === 400 || err?.response?.status === 409) && /already applied/i.test(msg)) {
      setHasApplied(true);
      setIsApplyModalOpen(false);
      return;
    }

    setApplyError(msg || 'Failed to apply. Please try again.');
  }
};

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

  const goBackToSearch: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault();
    navigate('/find-job', { state: { scrollPosition: location.state?.scrollPosition || 0 } });
  };

  if (loading) return <Loader />;
  if (!job) return <div>Job not found.</div>;


const renderSalary = (j: JobPost): string => {
  // страхуемся от пробелов, регистра и подчеркиваний
  const st = String(j.salary_type ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ');

  if (st === 'negotiable') return 'Negotiable';

  // salary может прийти строкой — нормализуем
  const num = j.salary != null ? Number(j.salary) : NaN;
  if (Number.isFinite(num) && num > 0) {
    const unit = st === 'per hour' ? '/ hour' : st === 'per month' ? '/ month' : '';
    const currency =
      (j as any).currency ||
      (j as any).salary_currency ||
      '$';
    return `${currency}${num} ${unit}`.trim();
  }

  return 'Not specified';
};

// локальный доп. тип — НЕ меняем глобальный JobPost
type JobExtras = {
  company_name?: string;
  companyName?: string;
  expires_at?: string;
};

const cleanedDesc = sanitizeHtml(job.description || '', { allowedTags: [], allowedAttributes: {} });
const salary = job.salary ?? null;

const unitMap: Record<string, "HOUR" | "MONTH" | "YEAR"> = {
  "per hour": "HOUR",
  "per month": "MONTH"
};

// пересечение типов: у объекта теперь опционально есть нужные поля
const j = job as typeof job & JobExtras;

const companyName =
  j.company_name ??
  j.companyName ??
  'Jobforge Employer';

const validThrough = j.expires_at;

// формируем JSON-LD без undefined-полей
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": job.title,
  "description": cleanedDesc,
  "datePosted": job.created_at,
  "employmentType": job.job_type || "CONTRACTOR",
  "jobLocationType": job.location === "Remote" ? "TELECOMMUTE" : "ON_SITE",
  ...(job.location === "Remote"
    ? { "applicantLocationRequirements": [{ "@type": "Country", "name": "Remote" }] }
    : {}),
  "hiringOrganization": {
    "@type": "Organization",
    "name": companyName,
    "sameAs": "https://jobforge.net/"
  },
  ...(validThrough ? { "validThrough": validThrough } : {}),
  ...(salary
    ? {
        "baseSalary": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": {
            "@type": "QuantitativeValue",
            "value": salary,
            "unitText": unitMap[job.salary_type || "per month"] || "MONTH"
          }
        }
      }
    : {})
};



const backAfterReport =
  profile?.role === 'employer'
    ? '/employer-dashboard'
    : profile?.role === 'jobseeker'
    ? '/jobseeker-dashboard'
    : '/';


  return (
    <div>
      <Helmet>
  <title>{job.title} | Jobforge</title>
  <meta name="description" content={cleanedDesc.slice(0, 160)} />
  <link rel="canonical" href={`https://jobforge.net/jobs/${job.id}`} />
  <meta property="og:title" content={`${job.title} | Jobforge`} />
  <meta property="og:description" content={cleanedDesc.slice(0, 160)} />
  <meta property="og:url" content={`https://jobforge.net/jobs/${job.id}`} />
  <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
  <script type="application/ld+json">{JSON.stringify({
    "@context":"https://schema.org",
    "@type":"BreadcrumbList",
    "itemListElement":[
      {"@type":"ListItem","position":1,"name":"Jobs","item":"https://jobforge.net/find-job"},
      {"@type":"ListItem","position":2,"name":job.title,"item":`https://jobforge.net/jobs/${job.id}`}
    ]
  })}</script>
</Helmet>

      <Header />
      <div className="container job-details-container">
        <div className="job-details-header">
          <a
            href="/find-job"
            onClick={goBackToSearch}
            className="back-link"
            aria-label="Back to search results"
          >
            Back to search results
          </a>
          <h1>{job.title}</h1>
          <div className="employer-info">
            {job.employer?.avatar ? (
              <img
                src={`https://jobforge.net/backend${job.employer.avatar}`}
                alt="Employer Avatar"
                className="employer-avatar"
              />
            ) : (
              <FaUserCircle className="employer-avatar" />
            )}
            <span className="employer-name">{job.employer?.username || 'Unknown'}</span>

          </div>
                     {!profile && (
<div><p className="login-prompt">
  <span>Please</span>
  <Link to="/login" className="lp-btn lp-primary"><FaSignInAlt /> Log in</Link>
  <span>or</span>
  <Link to="/register/jobseeker" className="lp-btn lp-outline"><FaUserPlus /> Register</Link>
  <span>as jobseeker to apply for this job.</span>
</p></div>
)}
        </div>
        <div className="job-details-panel">
          <div className="job-detail-item">
            <FaBriefcase /> <strong>Type of Work:</strong> {job.job_type || 'Not specified'}
          </div>
<div className="job-detail-item">
  <FaDollarSign /> <strong>Salary:</strong> {renderSalary(job)}
</div>
          <div className="job-detail-item">
            <FaMapMarkerAlt /> <strong>Location:</strong> {job.location || 'Not specified'}
          </div>
          <div className="job-detail-item">
            <FaFolder /> <strong>Category:</strong> {job.category?.name || 'Not specified'}
          </div>
          <div className="job-detail-item">
            <FaCalendarAlt /> <strong>Date Updated:</strong>{' '}
            {formatDateInTimezone(job.updated_at, profile?.timezone) || 'Not specified'}
          </div>
          <div className="job-detail-item">
            <FaEye /> <strong>Views:</strong> {job.views || 0}
          </div>
        </div>
        <div className="job-details-content">
          <div className="job-details-info">
            
             {!profile && job.status === 'Active' && (
      <div style={{ display: 'flex', justifyContent: 'center', fontWeight: 'bold' }}>
        <button
          onClick={() => navigate('/register/jobseeker')}
          className="action-button"
          style={{
            fontSize: '15px',
            padding: '4px 12px',
            borderRadius: '10px',
            minWidth: '223px',
            height: '47px',
            lineHeight: '20px'
          }}
         aria-label="Register to apply for this job"
        >
          Register to Apply for Job
        </button>
      </div>
    )}

            <h2>Job Overview</h2>
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.description) }} />
            {job.required_skills && job.required_skills.length > 0 && (
              <div className="skill-requirement">
                <FaTools className="skill-icon" />
                <strong>Skill requirement:</strong>
                <div className="skill-tags">
                  {job.required_skills.map((skill, idx) => (
                    <span key={idx} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
<div className="job-details-actions">
  {profile?.role === 'jobseeker' && job.status === 'Active' ? (
    hasApplied === true ? (
      <div className="jd-applied-pill" role="status" aria-live="polite">
        You’ve already applied to this job
      </div>
    ) : hasApplied === false ? (
      <button onClick={handleApply} className="action-button">
        Apply Now
      </button>
    ) : null /* пока статус неизвестен — ничего не показываем, чтобы не мигало */
  ) : !profile ? (
    <button onClick={() => navigate('/login')} className="action-button">
      Login to Apply
    </button>
  ) : null}

  {profile && profile.id !== job.employer?.id && (
    <Link
      to={`/complaint?type=job_post&id=${job.id}&return=${encodeURIComponent(backAfterReport)}`}
      className="report-link"
    >
      Report Job Post
    </Link>
  )}
</div>

        </div>
{isApplyModalOpen && (
  <div
    className="modal"
    onClick={(e) => {
      // клик по «подложке» закрывает модалку
      if (e.target === e.currentTarget) setIsApplyModalOpen(false);
    }}
  >
    <div
      className="modal-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="applyTitle"
      onClick={(e) => e.stopPropagation()} // не даём всплывать клику по контенту
    >
      <button className="close" onClick={() => setIsApplyModalOpen(false)} aria-label="Close">×</button>
      <h3 id="applyTitle">Apply</h3>

      {applyError && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 12 }}>
          {applyError}
        </div>
      )}

      <form
        className="apply-form"
        onSubmit={(e) => {
          e.preventDefault();
          submitApply();
        }}
        noValidate
      >
        {/* Full Name (optional) */}
        <div className="apply-row">
          <label className="apply-label" htmlFor="fullName">Full Name (optional)</label>
     <input
  id="fullName"
  type="text"
  className="apply-input"
  value={fullName}
  onChange={(e) => { setFullName(e.target.value); if (applyError) setApplyError(null); }}
  placeholder="Your full name"
/>
        </div>

        {/* Referred By (optional) */}
        <div className="apply-row">
          <label className="apply-label" htmlFor="referredBy">Referred By (optional)</label>
          <input
            id="referredBy"
            type="text"
            className="apply-input"
            value={referredBy}
            onChange={(e) => setReferredBy(e.target.value)}
            placeholder="The name/email of the person who recommended you"
          />
        </div>

        {/* Cover Letter (required) */}
        <div className="apply-row">
          <label className="apply-label" htmlFor="coverLetter">Cover Letter *</label>
          <textarea
            id="coverLetter"
            className="apply-textarea"
            rows={6}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder="Write your cover letter here…"
            required
          />
        </div>

        <p className="apply-help">Your resume from profile will be attached automatically.</p>

        <div className="apply-actions">
          <button type="submit" className="apply-btn">
            Submit Application
          </button>
        </div>
      </form>
    </div>
  </div>
)}
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default JobDetails;