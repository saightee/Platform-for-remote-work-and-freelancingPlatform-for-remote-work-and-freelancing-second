import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { getJobPost, applyToJob } from '../services/api';
import { JobPost } from '@types';
import { useRole } from '../context/RoleContext';
import { FaEye } from 'react-icons/fa';

const JobDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useRole();
  const [job, setJob] = useState<JobPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        if (id) {
          const jobData = await getJobPost(id);
          setJob(jobData);
        }
      } catch (err) {
        console.error('Error fetching job:', err);
        setError('Failed to load job details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const handleApply = async () => {
    if (!profile) {
      navigate('/login');
      return;
    }
    if (profile.role !== 'jobseeker') {
      setError('Only job seekers can apply for jobs.');
      return;
    }
    try {
      if (id) {
        await applyToJob(id);
        navigate('/my-applications');
      }
    } catch (err) {
      console.error('Error applying to job:', err);
      setError('Failed to apply. Please try again.');
    }
  };

  if (loading) return <div>Loading...</div>;

  if (!job) return <div>Job not found.</div>;

  return (
    <div>
      <Header />
      <div className="container job-details-container">
        <h1>{job.title}</h1>
        {error && <p className="error-message">{error}</p>}
        <div className="job-details-content">
          <div className="job-details-info">
            <p><strong>Location:</strong> {job.location || 'Not specified'}</p>
            <p><strong>Salary Range:</strong> {job.salaryMin && job.salaryMax ? `$${job.salaryMin} - $${job.salaryMax}` : 'Not specified'}</p>
            <p><strong>Job Type:</strong> {job.job_type || 'Not specified'}</p>
            <p><strong>Category:</strong> {job.category?.name || 'Not specified'}</p>
            <p><strong>Posted On:</strong> {new Date(job.created_at).toLocaleDateString()}</p>
            <p><strong>Status:</strong> {job.status}</p>
            <p><strong>Views:</strong> <FaEye /> {job.views || 0}</p>
            <h2>Description</h2>
            <p>{job.description}</p>
          </div>
          <div className="job-details-actions">
            {profile?.role === 'jobseeker' && job.status === 'open' && (
              <button onClick={handleApply}>Apply Now</button>
            )}
            {(!profile || profile.role !== 'jobseeker') && (
              <button onClick={() => navigate('/login')}>Login to Apply</button>
            )}
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default JobDetails;