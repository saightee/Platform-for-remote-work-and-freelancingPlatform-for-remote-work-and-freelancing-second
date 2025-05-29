import { Link } from 'react-router-dom';
import { JobPost } from '@types';
import { formatDateInTimezone } from '../utils/dateUtils';
import { FaEye, FaUserCircle } from 'react-icons/fa';

interface JobCardProps {
  job: JobPost;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const truncateDescription = (description: string, maxLength: number) => {
    if (description.length > maxLength) {
      return description.substring(0, maxLength) + '...';
    }
    return description;
  };

  return (
    <div className="job-card">
      <div className="job-card-avatar">
        {job.employer?.avatar ? (
         <img src={`https://jobforge.net/backend${job.employer?.avatar || ''}`} alt="Employer Avatar" />
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
          <strong>Employer:</strong> {job.employer?.username || 'Unknown'} |{' '}
          <strong>Posted on:</strong> {formatDateInTimezone(job.created_at)}
        </p>
        <p><strong>Salary:</strong> {job.salary ? `$${job.salary}` : 'Not specified'}</p>
        <p><strong>Description:</strong> {truncateDescription(job.description, 150)}</p>
        <p><strong>Location:</strong> {job.location || 'Not specified'}</p>
        <p><strong>Category:</strong> {job.category?.name || 'Not specified'}</p>
        <div className="job-card-footer">
          <Link to={`/jobs/${job.id}`}>
            <button className="view-details-button">View Details</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default JobCard;