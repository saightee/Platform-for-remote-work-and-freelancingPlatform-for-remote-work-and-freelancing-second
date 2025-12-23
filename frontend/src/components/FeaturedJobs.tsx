import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import JobCard from './JobCard';
import Loader from './Loader';
import { searchJobPosts } from '../services/api';
import { JobPost } from '@types';
import '../styles/lovable-home.css';

type FeaturedJobsProps = {
  onApply?: (job: JobPost) => void;
};

const FeaturedJobs: React.FC<FeaturedJobsProps> = ({ onApply }) => {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await searchJobPosts({
          limit: 8,
          sort_by: 'created_at',
          sort_order: 'DESC',
        });
        setJobs(res.data || []);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load jobs.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, []);

  return (
    <section className="oj-section oj-section--jobs">
      <div className="oj-section-inner">
        <div className="oj-section-header oj-section-header--center">
          <div>
            <h2 className="oj-section-title">Latest Job Opportunities</h2>
            <p className="oj-section-subtitle">
              Browse current openings and apply directly through the platform.
            </p>
          </div>
        </div>

        {isLoading && <Loader />}
        {error && <div className="oj-error">{error}</div>}

        {!isLoading && !error && (
          <div className="oj-jobs-grid">
            {jobs.length > 0 ? (
              jobs.slice(0, 6).map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  variant="home"
                  onApply={() => onApply?.(job)}
                />
              ))
            ) : (
              <p>No recent jobs found.</p>
            )}
          </div>
        )}

        <div className="btn_link">
          <Link to="/find-job" className="oj-btn oj-btn--hero jobs_talent_btn">
            View All Job Postings
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedJobs;
