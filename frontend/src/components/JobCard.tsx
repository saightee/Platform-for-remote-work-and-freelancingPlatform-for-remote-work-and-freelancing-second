import { Link } from 'react-router-dom';
import { JobPost } from '@types';
import { formatDateInTimezone } from '../utils/dateUtils';
import { FaEye, FaUserCircle, FaMapMarkerAlt, FaCalendarAlt, FaBriefcase, FaBuilding } from 'react-icons/fa';
import { MapPin, DollarSign, Clock, Briefcase} from "lucide-react";

import sanitizeHtml from 'sanitize-html';
import { brandBackendOrigin } from '../brand';
import '../styles/lovable-home.css';

interface JobCardProps {
  job: JobPost;
  variant?: 'home' | 'find-jobs';
}


// наверх файла
const decodeEntities = (s: string) => {
  if (!s) return s;
  if (typeof window === 'undefined') return s; // SSR-guard
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

  const unit =
    st === 'per hour' ? 'per hour' :
    st === 'per month' ? 'per month' :
    st || '';

  // min и max из API: salary — минимум, salary_max — максимум (может быть null)
  const min = j.salary != null ? Number(j.salary) : NaN;
  const max = (j as any).salary_max != null ? Number((j as any).salary_max) : NaN;

  const currency =
    (j as any).currency ||
    (j as any).salary_currency ||
    ''; // если хочешь — можно вернуть '$' как дефолт

  // если вообще нет чисел
  if (!Number.isFinite(min) && !Number.isFinite(max)) return 'Not specified';

  // оба есть и разные → диапазон "5–8 per hour"
  if (Number.isFinite(min) && Number.isFinite(max) && max !== min) {
    const prefix = currency ? `${currency}` : '';
    return `${prefix}${min}–${max} ${unit}`.trim();
  }

  // только одна сторона (по идее у нас всегда есть min, но на всякий случай)
  const value = Number.isFinite(min) ? min : max;
  if (Number.isFinite(value)) {
    const prefix = currency ? `${currency}` : '';
    return unit ? `${prefix}${value} ${unit}`.trim() : `${prefix}${value}`;
  }

  return 'Not specified';
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





const JobCard: React.FC<JobCardProps> = ({ job, variant = 'find-jobs' }) => {
  const truncateDescription = (description: string | undefined, maxLength: number) => {
    const clean = sanitizeHtml(description || '', { allowedTags: [], allowedAttributes: {} });
    const decoded = decodeEntities(clean);
    return decoded.length > maxLength ? decoded.slice(0, maxLength) + '…' : decoded;
  };

  const slugOrId = (job as any).slug_id || job.id;

if (variant === 'home') {
  // helper'ы прямо над return или выше файла
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
    // заглушка, если числа нет
    return 'Be the first applicant';
  };

  // Lovable-card style
  return (
    <article className="oj-job-card" role="article">
      <div className="oj-job-card-main">
        <div className="oj-job-card-header">
          <h3 className="oj-job-title" title={job.title}>
            {job.title}
          </h3>
          {job.job_type && (
            <span className="oj-job-badge">
              {job.job_type}
            </span>
          )}
        </div>

        <p className="oj-job-company">
          {getDisplayCompanyName(job)}
        </p>

        {/* блок как на скрине: location / salary / posted */}
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

        <p className="oj-job-desc">
          {truncateDescription(job.description, 160)}
        </p>

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

      {/* нижняя часть: иконка портфеля + количество аппликантов, справа кнопка */}
      <div className="oj-job-card-footer">
        <div className="oj-job-footer-meta">
          <Briefcase />
          <span>{renderApplicants(job)}</span>
        </div>
        <Link
          to={`/vacancy/${slugOrId}`}
          className="oj-btn oj-btn--primary oj-job-btn"
        >
          Apply Now
        </Link>
      </div>
    </article>
  );
}


  // find-jobs вариант можно пока оставить близким к тому, что был
  return (
    <article className="jc-card jc-card--list" role="article">
      {/* оставь здесь свой текущий верст, если он уже работает на странице поиска */}
      {/* при желании его тоже можно потом привести к oj-стилю */}
      {/* ... */}
    </article>
  );
};

export default JobCard;
