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
import sanitizeHtml from 'sanitize-html';
import '../styles/job-card.css';

interface JobCardProps {
  job: JobPost;
  variant?: 'home' | 'find-jobs';
}

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
      <article className="jcx-card jcx-card--home" role="article" aria-label={job.title}>
        <div className="jcx-body">
          <div className="jcx-row jcx-row--title">
            <h3 className="jcx-title" title={job.title}>{job.title}</h3>
            <span className="jcx-views" aria-label="views">
              <FaEye /> {job.views || 0}
            </span>
          </div>

          <div className="jcx-meta jcx-meta--compact">
            <span className="jcx-chip">
              <FaBriefcase /> {job.job_type || 'Not specified'}
            </span>
            <span className="jcx-chip">
              <FaBuilding /> {job.location || 'Not specified'}
            </span>
          </div>

          <p className="jcx-employer">
            <strong className="jcx-employer-name">{job.employer?.username || 'Unknown'}</strong>
            {' '}|{' '}
            <span className="jcx-date">
              <FaCalendarAlt /> {formatDateInTimezone(job.created_at)}
            </span>
          </p>

          <p className="jcx-desc">
            {truncateDescription(job.description, 100)}
          </p>

          {job.required_skills && job.required_skills.length > 0 && (
            <div className="jcx-tags" aria-label="required skills">
              {job.required_skills.map((skill, i) => (
                <span key={i} className="jcx-tag">{skill}</span>
              ))}
            </div>
          )}
        </div>

        <div className="jcx-footer">
          <span className="jcx-salary">
            {job.salary_type === 'negotiable'
              ? 'Negotiable'
              : (job.salary !== null
                ? `$${job.salary} ${job.salary_type || 'per hour'}`
                : 'Not specified')}
          </span>
          <Link to={`/jobs/${job.id}`}>
            <button className="jcx-btn jcx-btn--primary" type="button">View Details</button>
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="jcx-card jcx-card--list" role="article" aria-label={job.title}>
      <div className="jcx-left">
        <div className="jcx-avatar">
          {job.employer?.avatar ? (
            <img
              src={`https://jobforge.net/backend${job.employer.avatar}`}
              alt="Employer Avatar"
              className="jcx-avatar-img"
            />
          ) : (
            <FaUserCircle className="jcx-avatar-icon" />
          )}
        </div>
      </div>

      <div className="jcx-body">
        <div className="jcx-row jcx-row--title">
          <h3 className="jcx-title" title={job.title}>{job.title}</h3>
          <span className="jcx-views" aria-label="views">
            <FaEye /> {job.views || 0}
          </span>
        </div>

        <div className="jcx-meta">
          <span className="jcx-chip"><FaBriefcase /> {job.job_type || 'Not specified'}</span>
          <span className="jcx-divider">•</span>
          <span className="jcx-employer-name">{job.employer?.username || 'Unknown'}</span>
          <span className="jcx-divider">|</span>
          <span className="jcx-date"><FaCalendarAlt /> {formatDateInTimezone(job.created_at)}</span>
        </div>

        <p className="jcx-desc">
          {truncateDescription(job.description, 150)}
        </p>

        <p className="jcx-location">
          <FaMapMarkerAlt /> {job.location || 'Not specified'}
        </p>

        <p className="jcx-category">
          <strong>Category:</strong> {job.category?.name || 'Not specified'}
        </p>

        {job.required_skills && job.required_skills.length > 0 && (
          <div className="jcx-tags" aria-label="required skills">
            {job.required_skills.map((skill, i) => (
              <span key={i} className="jcx-tag">{skill}</span>
            ))}
          </div>
        )}

        <div className="jcx-footer">
          <span className="jcx-salary">
            {job.salary_type === 'negotiable'
              ? 'Negotiable'
              : (job.salary !== null
                ? `$${job.salary} ${job.salary_type || 'per hour'}`
                : 'Not specified')}
          </span>
          <Link to={`/jobs/${job.id}`}>
            <button className="jcx-btn jcx-btn--primary" type="button">View Details</button>
          </Link>
        </div>
      </div>
    </article>
  );
};

export default JobCard;
