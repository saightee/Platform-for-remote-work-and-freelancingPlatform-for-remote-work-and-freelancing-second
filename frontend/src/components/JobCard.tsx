import { Link } from 'react-router-dom';
import { JobPost } from '@types';
import { formatDateInTimezone } from '../utils/dateUtils';
import { FaEye, FaUserCircle } from 'react-icons/fa';

interface JobCardProps {
  job: JobPost;
  variant?: 'home' | 'find-jobs';
}

const JobCard: React.FC<JobCardProps> = ({ job, variant = 'find-jobs' }) => {
  const truncateDescription = (description: string, maxLength: number) => {
    if (description.length > maxLength) {
      return description.substring(0, maxLength) + '...';
    }
    return description;
  };

  if (variant === 'home') {
    return (
      <div className="job-card job-card-home">
        <div className="job-card-content">
          <div className="job-title-row">
            <h3>{job.title}</h3>
            <span className="job-type">{job.job_type || 'Not specified'}</span>
            <span className="view-counter">
              <FaEye /> {job.views || 0}
            </span>
          </div>
          <p className="employer-info">
            <strong>{job.employer?.username || 'Unknown'}</strong> | Posted on: {formatDateInTimezone(job.created_at)}
          </p>
          <p className="description"><strong>Description:</strong> {truncateDescription(job.description, 100)}</p>
          <p><strong>Location:</strong> {job.location || 'Remote'}</p>
        </div>
        <div className="job-card-footer">
          <span className="salary">{job.salary !== null ? `$${job.salary} per hour` : 'Not specified'}</span>
          <Link to={`/jobs/${job.id}`}>
            <button className="view-details-button">View Details</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="job-card job-card-find-jobs">
      <div className="job-card-avatar">
{job.employer?.avatar ? (
  <img src={`https://jobforge.net/backend${job.employer.avatar}`} alt="Employer Avatar" />
) : (
  <FaUserCircle className="profile-avatar-icon" />
)}
      </div>
      <div className="job-card-content">
        <div className="job-title-row">
          <h3>{job.title}</h3>
          <span className="job-type">{job.job_type || 'Not specified'}</span>
          <span className="view-counter">
            <FaEye /> {job.views || 0}
          </span>
        </div>
        <p>
          <span className="employer-name">{job.employer?.username || 'Unknown'}</span> |{' '}
          <strong>Posted on:</strong> {formatDateInTimezone(job.created_at)}
        </p>
        <p><strong>Description:</strong> {truncateDescription(job.description, 150)}</p>
        <p><strong>Location:</strong> {job.location || 'Not specified'}</p>
        <p><strong>Category:</strong> {job.category?.name || 'Not specified'}</p>
        <div className="job-card-footer">
          <span className="salary">{job.salary !== null ? `$${job.salary}/hr` : 'Not specified'}</span>
          <Link to={`/jobs/${job.id}`}>
            <button className="view-details-button">View Details</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default JobCard;