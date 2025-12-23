import { Link } from 'react-router-dom';
import { JobPost } from '@types';
import { formatDateInTimezone } from '../utils/dateUtils';
import {
  FaEye,
  FaUserCircle,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaBriefcase,
  FaBuilding,
} from 'react-icons/fa';
import { MapPin, DollarSign, Clock, Briefcase as BriefcaseLucide } from 'lucide-react';
import { useRole } from '../context/RoleContext';

import sanitizeHtml from 'sanitize-html';
import { brandBackendOrigin } from '../brand';
import '../styles/lovable-home.css';
import '../styles/job-card-list.css';

interface JobCardProps {
  job: JobPost;
  variant?: 'home' | 'find-jobs';
  onApply?: (job: any) => void;
}

const decodeEntities = (s: string) => {
  if (!s) return s;
  if (typeof window === 'undefined') return s;
  const el = document.createElement('textarea');
  el.innerHTML = s;
  return el.value;
};

const renderSalary = (j: JobPost): string => {
  const st = String(j.salary_type ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ');

  if (st === 'negotiable') return 'Negotiable';

  const min = j.salary != null ? Number(j.salary) : NaN;
  const max = (j as any).salary_max != null ? Number((j as any).salary_max) : NaN;

  const currencyRaw = (
    (j as any).currency ||
    (j as any).salary_currency ||
    ''
  ).trim().toUpperCase();

  // Мапа валют → символы
  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    RUB: '₽',
    UAH: '₴',
    PLN: 'zł',
    BRL: 'R$',
    INR: '₹',
    JPY: '¥',
    CNY: '¥',
    KRW: '₩',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'CHF',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    TRY: '₺',
    MXN: 'MX$',
    ARS: 'ARS$',
  };

  const symbol = currencySymbols[currencyRaw] || currencyRaw || '$';

  // Сокращения для типа зарплаты
  const unitShort =
    st === 'per hour' ? '/hr' :
    st === 'per month' ? '/month' :
    st ? `/${st}` : '';

  if (!Number.isFinite(min) && !Number.isFinite(max)) return 'Not specified';

  // Диапазон
  if (Number.isFinite(min) && Number.isFinite(max) && max !== min) {
    return `${symbol}${min.toLocaleString()}–${symbol}${max.toLocaleString()}${unitShort}`;
  }

  // Одно значение
  const value = Number.isFinite(min) ? min : max;
  if (Number.isFinite(value)) {
    return `${symbol}${value.toLocaleString()}${unitShort}`;
  }

  return 'Not specified';
};

const getJobCategories = (job: JobPost): string[] => {
  const anyJob: any = job;

  // multi
  if (Array.isArray(anyJob.categories) && anyJob.categories.length) {
    return anyJob.categories
      .map((c: any) => (typeof c === 'string' ? c : c?.name))
      .filter(Boolean);
  }

  // single fallback
  if (anyJob.category) {
    if (typeof anyJob.category === 'string') return [anyJob.category];
    if (anyJob.category?.name) return [anyJob.category.name];
  }
  if (anyJob.category_name) return [anyJob.category_name];

  return [];
};


const getDisplayCompanyName = (job: JobPost): string => {
  const j = job as JobPost & { company_name?: string | null; companyName?: string | null };
  const byCompanyField = j.company_name ?? j.companyName;
  const byEmployer =
    j.employer?.username ||
    (j as any).employer_username ||
    (j as any).owner_username ||
    (j as any).created_by_username ||
    (j as any).posted_by_username ||
    'Unknown';

  return (byCompanyField && byCompanyField.trim()) || byEmployer;
};

const renderPosted = (job: JobPost): string => {
  const raw: any =
    (job as any).created_at ||
    (job as any).posted_at ||
    (job as any).updated_at;

  if (!raw) return 'Posted recently';

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return 'Posted recently';

  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Posted today';
  if (diffDays === 1) return 'Posted 1 day ago';
  if (diffDays < 30) return `Posted ${diffDays} days ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return 'Posted 1 month ago';
  return `Posted ${diffMonths} months ago`;
};

const renderApplicants = (job: JobPost): string => {
  const n =
    (job as any).applicants_count ??
    (job as any).applications_count ??
    (job as any).applicants;

  if (typeof n === 'number' && n >= 0) {
    return n === 1 ? '1 applicant' : `${n} applicants`;
  }
  return 'Be the first applicant';
};

const getViewsCount = (job: JobPost): number | null => {
  const n =
    (job as any).views ??
    (job as any).views_count ??
    (job as any).views_total;
  return typeof n === 'number' && n >= 0 ? n : null;
};

const JobCard: React.FC<JobCardProps> = ({ job, onApply, variant = 'find-jobs' }) => {
  const truncateDescription = (description: string | undefined, maxLength: number) => {
    const clean = sanitizeHtml(description || '', { allowedTags: [], allowedAttributes: {} });
    const decoded = decodeEntities(clean);
    return decoded.length > maxLength ? decoded.slice(0, maxLength) + '…' : decoded;
  };

  const slugOrId = (job as any).slug_id || job.id;
  const { profile } = useRole();
  const isJobseeker = profile?.role === 'jobseeker';
  const viewPath = `/vacancy/${slugOrId}`;

  if (variant === 'home') {
    return (
      <article className="oj-job-card" role="article">
        <div className="oj-job-card-main">
          <div className="oj-job-card-header">
            <h3 className="oj-job-title" title={job.title}>
              {job.title}
            </h3>
            {job.job_type && <span className="oj-job-badge">{job.job_type}</span>}
          </div>

          <p className="oj-job-company">{getDisplayCompanyName(job)}</p>

          <div className="oj-job-meta">
            {job.location && (
              <div className="oj-job-meta-item">
                <MapPin /> <span>{job.location}</span>
              </div>
            )}

            <div className="oj-job-meta-item">
              <DollarSign className="oj-job-meta-icon" />
              <span>{renderSalary(job)}</span>
            </div>

            <div className="oj-job-meta-item">
              <Clock /> <span>{renderPosted(job)}</span>
            </div>
          </div>

          <p className="oj-job-desc">{truncateDescription(job.description, 160)}</p>

          {getJobCategories(job).length > 0 && (
  <div className="oj-job-cats">
    {getJobCategories(job).slice(0, 3).map((cat, i) => (
      <span key={i} className="oj-job-cat">
        {cat}
      </span>
    ))}
    {getJobCategories(job).length > 3 && (
      <span className="oj-job-cat oj-job-cat--more">
        +{getJobCategories(job).length - 3}
      </span>
    )}
  </div>
)}


          {job.required_skills && job.required_skills.length > 0 && (
            <div className="oj-job-tags">
              {job.required_skills.slice(0, 3).map((skill, i) => (
                <span key={i} className="oj-job-tag">
                  {skill}
                </span>
              ))}
              {job.required_skills.length > 3 && (
                <span className="oj-job-tag oj-job-tag--more">
                  +{job.required_skills.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

       <div className="oj-job-card-footer">
  <div className="oj-job-footer-meta">
    <BriefcaseLucide />
    <span>{renderApplicants(job)}</span>
  </div>
<div className="oj-job-card-btn">
  <Link to={viewPath} className="oj-btn oj-btn--primary oj-job-btn oj-view-btn">
    View
  </Link>

{isJobseeker && (
  <button
    type="button"
    className="oj-btn oj-btn--primary oj-job-btn"
    onClick={() => onApply?.(job)}
  >
    Apply Now
  </button>
)}
</div>

</div>

      </article>
    );
  }

  // Вариант для /find-job
  const companyName = getDisplayCompanyName(job);
  const salary = renderSalary(job);
  const skills = Array.isArray(job.required_skills) ? job.required_skills : [];
  const views = getViewsCount(job);
  const location = job.location || 'Remote';
  const posted = renderPosted(job);

  return (
    <article className="jc-card jc-card--list" role="article">
      <div className="jc-card-inner">
        <div className="jc-card-avatar-wrap">
          <div className="jc-card-avatar-circle">
            {companyName.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="jc-card-main">
          <div className="jc-card-header-row">
            <div className="jc-card-title-block">
              <h3 className="jc-job-title" title={job.title}>
                <Link to={`/vacancy/${slugOrId}`}>{job.title}</Link>
              </h3>
              <p className="jc-job-company">{companyName}</p>
              <p className="jc-job-posted">{posted}</p>
              {getJobCategories(job).length > 0 && (
  <div className="jc-job-cats">
    {getJobCategories(job).slice(0, 3).map((cat, i) => (
      <span key={i} className="jc-job-cat">
        {cat}
      </span>
    ))}
    {getJobCategories(job).length > 3 && (
      <span className="jc-job-cat jc-job-cat--more">
        +{getJobCategories(job).length - 3}
      </span>
    )}
  </div>
)}

            </div>

            {job.job_type && (
              <div className="jc-card-type-wrap">
                <span className="jc-card-type-pill">{job.job_type}</span>
              </div>
            )}
          </div>

          {skills.length > 0 && (
            <div className="jc-job-tags">
              {skills.slice(0, 3).map((skill, index) => (
                <span key={index} className="jc-job-tag">
                  {skill}
                </span>
              ))}
              {skills.length > 3 && (
                <span className="jc-job-tag jc-job-tag--more">
                  +{skills.length - 3}
                </span>
              )}
            </div>
          )}

          <div className="jc-card-bottom">
            <div className="jc-card-info">
              {location && (
                <span className="jc-card-info-item">
                  <MapPin className="jc-card-info-icon" />
                  {location}
                </span>
              )}
              

              {views !== null && (
                <span className="jc-card-info-item">
                  <FaEye className="jc-card-info-icon" />
                  {views}
                </span>
              )}
              <span className="jc-card-info-item jc-card-info-salary">{salary}</span>
            </div>

            <div className="jc-card-actions">
  <Link
    to={viewPath}
    className="fj-btn-main-view fj-button-outline"
  >
    View
  </Link>

  {isJobseeker && (
   <button
  type="button"
  className="fj-btn-main fj-button-outline-main fj-job-btn-second"
  onClick={() => onApply?.(job)}
>
  Apply
</button>
  )}
</div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default JobCard;
