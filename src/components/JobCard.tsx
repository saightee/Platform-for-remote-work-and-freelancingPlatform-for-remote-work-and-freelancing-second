import { Link } from 'react-router-dom';
import { JobPost } from '../types';

interface JobCardProps {
  job: JobPost;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  return (
    <div className="job-card">
      <h3>{job.title}</h3>
      <p>Location: {job.location}</p>
      <p>Salary: ${job.salary}</p>
      <p>Type: {job.job_type || 'N/A'}</p>
      <Link to={`/jobs/${job.id}`}>
        <button>View Job</button>
      </Link>
    </div>
  );
};

export default JobCard;