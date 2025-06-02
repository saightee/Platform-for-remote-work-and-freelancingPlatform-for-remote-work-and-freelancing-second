import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
<<<<<<< HEAD
import { getJobPost, applyToJobPost, incrementJobView, checkJobApplicationStatus } from '../services/api';
=======
import { getJobPost, applyToJobPost, incrementJobView } from '../services/api';
>>>>>>> 106c1739ee3388611e17fd6a61611bb44491a598
import { JobPost } from '@types';
import { useRole } from '../context/RoleContext';
import { FaEye } from 'react-icons/fa';
import { format, zonedTimeToUtc } from 'date-fns-tz';
import { parseISO } from 'date-fns';

const JobDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useRole();
  const [job, setJob] = useState<JobPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState<boolean>(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        if (id) {
          setLoading(true);
          setError(null);
          const jobData = await getJobPost(id);
          setJob(jobData);
          try {
            const response = await incrementJobView(id);
            setJob((prev) => (prev ? { ...prev, views: response.views || (jobData.views || 0) + 1 } : prev));
          } catch (viewError) {
            console.error('Error incrementing job view:', viewError);
<<<<<<< HEAD
          }
          if (profile?.role === 'jobseeker') {
            const applicationStatus = await checkJobApplicationStatus(id);
            setHasApplied(applicationStatus.hasApplied);
=======
            // Не устанавливаем ошибку для UI, чтобы не мешать отображению вакансии
>>>>>>> 106c1739ee3388611e17fd6a61611bb44491a598
          }
        }
      } catch (err: any) {
        console.error('Error fetching job:', err);
        setError(err.response?.data?.message || 'Failed to load job details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id, profile]);

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
        await applyToJobPost(id);
<<<<<<< HEAD
        setHasApplied(true);
=======
>>>>>>> 106c1739ee3388611e17fd6a61611bb44491a598
        navigate('/my-applications');
      }
    } catch (err: any) {
      console.error('Error applying to job:', err);
      setError(err.response?.data?.message || 'Failed to apply. Please try again.');
    }
  };

  const formatDateInTimezone = (dateString?: string, timezone?: string): string => {
    if (!dateString) return 'Not specified';
    try {
      const date = parseISO(dateString);
      if (timezone) {
        const zonedDate = zonedTimeToUtc(date, timezone);
        return format(zonedDate, 'PPpp', { timeZone: timezone });
      }
      return format(date, 'PPpp');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
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
            <p>
              <strong>Salary:</strong>{' '}
              {job.salary
                ? `${profile?.currency || '$'}${job.salary}`
                : 'Not specified'}
            </p>
            <p><strong>Job Type:</strong> {job.job_type || 'Not specified'}</p>
            <p><strong>Category:</strong> {job.category?.name || 'Not specified'}</p>
            <p>
              <strong>Posted On:</strong>{' '}
              {formatDateInTimezone(job.created_at, profile?.timezone)}
            </p>
            <p><strong>Status:</strong> {job.status}</p>
            <p><strong>Views:</strong> <FaEye /> {job.views || 0}</p>
            <h2>Description</h2>
            <p>{job.description}</p>
          </div>
          <div className="job-details-actions">
<<<<<<< HEAD
            {profile?.role === 'jobseeker' && job.status === 'Active' ? (
              hasApplied ? (
                <p className="already-applied">Already Applied</p>
              ) : (
                <button onClick={handleApply}>Apply Now</button>
              )
            ) : (
=======
            {profile?.role === 'jobseeker' && job.status === 'Active' && (
              <button onClick={handleApply}>Apply Now</button>
            )}
            {(!profile || profile.role !== 'jobseeker') && (
>>>>>>> 106c1739ee3388611e17fd6a61611bb44491a598
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