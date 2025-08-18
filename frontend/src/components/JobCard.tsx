import { Link } from 'react-router-dom';
import { JobPost } from '@types';
import { formatDateInTimezone } from '../utils/dateUtils';
import { FaEye, FaUserCircle, FaMapMarkerAlt, FaCalendarAlt, FaBriefcase, FaBuilding } from 'react-icons/fa';
import sanitizeHtml from 'sanitize-html';

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
            {job.salary !== null ? `$${job.salary} ${job.salary_type || 'per hour'}` : 'Not specified'}
          </span>
          <Link to={`/jobs/${job.id}`}>
            <button className="jc-btn jc-btn--primary" type="button">View Details</button>
          </Link>
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

        <p className="jc-category"><strong>Category:</strong> {job.category?.name || 'Not specified'}</p>

        {job.required_skills && job.required_skills.length > 0 && (
          <div className="jc-tags" aria-label="required skills">
            {job.required_skills.map((skill, i) => (
              <span key={i} className="jc-tag">{skill}</span>
            ))}
          </div>
        )}

        <div className="jc-footer">
          <span className="jc-salary">
            {job.salary !== null ? `$${job.salary} ${job.salary_type || 'per hour'}` : 'Not specified'}
          </span>
          <Link to={`/jobs/${job.id}`}>
            <button className="jc-btn jc-btn--primary" type="button">View Details</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
