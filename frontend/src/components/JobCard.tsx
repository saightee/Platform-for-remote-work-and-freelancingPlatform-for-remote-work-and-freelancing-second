import { Link } from 'react-router-dom';
import { JobPost } from '@types';
import { formatDateInTimezone } from '../utils/dateUtils';
import { FaEye, FaUserCircle, FaMapMarkerAlt, FaCalendarAlt, FaBriefcase, FaBuilding } from 'react-icons/fa';
import sanitizeHtml from 'sanitize-html';

interface JobCardProps {
  job: JobPost;
  variant?: 'home' | 'find-jobs';
}

const renderSalary = (j: JobPost): string => {
  const st = String(j.salary_type ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ');

  if (st === 'negotiable') return 'Negotiable';

  const num = j.salary != null ? Number(j.salary) : NaN;
  if (Number.isFinite(num) && num > 0) {
    const unit =
      st === 'per hour' ? '/ hour' :
      st === 'per month' ? '/ month' :
      '';
    const currency =
      (j as any).currency ||
      (j as any).salary_currency ||
      '$';
    return `${currency}${num} ${unit}`.trim();
  }

  return 'Not specified';
};


const JobCard: React.FC<JobCardProps> = ({ job, variant = 'find-jobs' }) => {
  const truncateDescription = (description: string, maxLength: number) => {
    const cleanDescription = sanitizeHtml(description, {
      allowedTags: [],
      allowedAttributes: {},
    });
    if (cleanDescription.length > maxLength) {
      return cleanDescription.substring(0, maxLength) + '...';
    }
    return cleanDescription;
  };

  if (variant === 'home') {
    return (
      <div className="job-card job-card-home jc-card jc-card--home" role="article">
        <div className="jc-body">
          <div className="jc-row jc-row--title">
            <h3 className="jc-title" title={job.title}>{job.title}</h3>
            <span className="jc-views" aria-label="views">
              <FaEye /> {job.views || 0}
            </span>
          </div>

          <div className="jc-meta jc-meta--compact">
            <span className="jc-chip">
              <FaBriefcase /> {job.job_type || 'Not specified'}
            </span>
            <span className="jc-chip">
              <FaBuilding /> {job.location || 'Not specified'}
            </span>
          </div>

          <p className="jc-employer">
            <strong className="jc-employer-name">{job.employer?.username || 'Unknown'}</strong>
            {' '}|{' '}
            <span className="jc-date"><FaCalendarAlt /> {formatDateInTimezone(job.created_at)}</span>
          </p>

          <p className="jc-desc">
            {truncateDescription(job.description, 100)}
          </p>

          {job.required_skills && job.required_skills.length > 0 && (
            <div className="jc-tags" aria-label="required skills">
              {job.required_skills.map((skill, i) => (
                <span key={i} className="jc-tag">{skill}</span>
              ))}
            </div>
          )}
        </div>

        <div className="jc-footer">
          <span className="jc-salary">
           {renderSalary(job)}
          </span>
         {(() => {
  const slugOrId = (job as any).slug_id || job.id;
  return (
    <Link to={`/vacancy/${slugOrId}`}>
      <button className="jc-btn jc-btn--primary" type="button">View Details</button>
    </Link>
  );
})()}
        </div>
      </div>
    );
  }

  return (
    <div className="job-card job-card-find-jobs jc-card jc-card--list" role="article">
      <div className="jc-avatar">
        {job.employer?.avatar ? (
          <img
            src={`https://jobforge.net/backend${job.employer.avatar}`}
            alt="Employer Avatar"
            className="jc-avatar-img"
          />
        ) : (
          <FaUserCircle className="jc-avatar-icon" />
        )}
      </div>

      <div className="jc-body">
        <div className="jc-row jc-row--title">
          <h3 className="jc-title" title={job.title}>{job.title}</h3>
          <span className="jc-views" aria-label="views">
            <FaEye /> {job.views || 0}
          </span>
        </div>

        <div className="jc-meta">
          <span className="jc-chip"><FaBriefcase /> {job.job_type || 'Not specified'}</span>
          <span className="jc-divider">•</span>
          <span className="jc-employer-name">{job.employer?.username || 'Unknown'}</span>
          <span className="jc-divider">|</span>
          <span className="jc-date"><FaCalendarAlt /> {formatDateInTimezone(job.created_at)}</span>
        </div>

        <p className="jc-desc">
          {truncateDescription(job.description, 150)}
        </p>

        <p className="jc-location"><FaMapMarkerAlt /> {job.location || 'Not specified'}</p>

                {(() => {
          // back-compat mapping per spec:
          const categories =
            (job as any).categories?.length
              ? (job as any).categories as { id: string; name?: string }[]
              : ((job as any).category_id ? [{ id: (job as any).category_id, name: (job as any).category?.name }] : []);

          if (!categories.length) return null;

          return (
            <div className="jc-tags" aria-label="categories" style={{ marginTop: 8 }}>
              {categories.map((c) => (
                <span key={c.id} className="jc-tag">{c.name || 'Category'}</span>
              ))}
            </div>
          );
        })()}


        {job.required_skills && job.required_skills.length > 0 && (
          <div className="jc-tags" aria-label="required skills">
            {job.required_skills.map((skill, i) => (
              <span key={i} className="jc-tag">{skill}</span>
            ))}
          </div>
        )}

        <div className="jc-footer">
          <span className="jc-salary">
            {renderSalary(job)}
          </span>
        {(() => {
  const slugOrId = (job as any).slug_id || job.id;
  return (
    <Link to={`/vacancy/${slugOrId}`}>
      <button className="jc-btn jc-btn--primary" type="button">View Details</button>
    </Link>
  );
})()}
        </div>
      </div>
    </div>
  );
};

export default JobCard;
