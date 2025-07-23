import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { getJobPost, applyToJobPost, incrementJobView, checkJobApplicationStatus } from '../services/api';
import { JobPost } from '@types';
import { useRole } from '../context/RoleContext';
import { FaEye, FaBriefcase, FaDollarSign, FaMapMarkerAlt, FaCalendarAlt, FaUserCircle, FaTools, FaFolder } from 'react-icons/fa';
import { format, zonedTimeToUtc } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import sanitizeHtml from 'sanitize-html';
import Loader from '../components/Loader';

const JobDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useRole();
  const [job, setJob] = useState<JobPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState<boolean>(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const viewed = useRef(false); // Добавлено для предотвращения double increment

  useEffect(() => {
    const fetchJob = async () => {
      try {
        if (id) {
          setLoading(true);
          setError(null);
          const jobData = await getJobPost(id);
          setJob(jobData);
          if (!viewed.current) {
            viewed.current = true;
            try {
              const response = await incrementJobView(id);
              setJob((prev) => (prev ? { ...prev, views: response.views || (jobData.views || 0) + 1 } : prev));
            } catch (viewError) {
              console.error('Error incrementing job view:', viewError);
            }
          }
          if (profile?.role === 'jobseeker') {
            const applicationStatus = await checkJobApplicationStatus(id);
            setHasApplied(applicationStatus.hasApplied);
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
    setIsApplyModalOpen(true);
  };

  const submitApply = async () => {
    if (!coverLetter.trim()) {
      setError('Cover letter is required.');
      return;
    }
    try {
      if (id) {
        await applyToJobPost(id, coverLetter);
        setHasApplied(true);
        setIsApplyModalOpen(false);
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

  const goBackToSearch: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault();
    navigate('/find-job', { state: { scrollPosition: location.state?.scrollPosition || 0 } });
  };

  if (loading) return <Loader />;
  if (!job) return <div>Job not found.</div>;

  return (
    <div>
      <Header />
      <div className="container job-details-container">
        <div className="job-details-header">
          <a
            href="/find-job"
            onClick={goBackToSearch}
            className="back-link"
            aria-label="Back to search results"
          >
            Back to search results
          </a>
          <h1>{job.title}</h1>
          <div className="employer-info">
            {job.employer?.avatar ? (
              <img
                src={`https://jobforge.net/backend${job.employer.avatar}`}
                alt="Employer Avatar"
                className="employer-avatar"
              />
            ) : (
              <FaUserCircle className="employer-avatar" />
            )}
            <span className="employer-name">{job.employer?.username || 'Unknown'}</span>
          </div>
          {!profile && (
            <p className="login-prompt">
              Please{' '}
              <Link to="/login" style={{ color: 'white', textDecoration: 'none' }}>
                login
              </Link>{' '}
              or{' '}
              <Link to="/register/jobseeker" style={{ color: 'white', textDecoration: 'none' }}>
                register
              </Link>{' '}
              as jobseeker to apply for this job.
            </p>
          )}
        </div>
        <div className="job-details-panel">
          <div className="job-detail-item">
            <FaBriefcase /> <strong>Type of Work:</strong> {job.job_type || 'Not specified'}
          </div>
<div className="job-detail-item">
  <FaDollarSign /> <strong>Salary:</strong>{' '}
  {job.salary !== null ? `$${job.salary} ${job.salary_type || ''}` : 'Not specified'}
</div>
          <div className="job-detail-item">
            <FaMapMarkerAlt /> <strong>Location:</strong> {job.location || 'Not specified'}
          </div>
          <div className="job-detail-item">
            <FaFolder /> <strong>Category:</strong> {job.category?.name || 'Not specified'}
          </div>
          <div className="job-detail-item">
            <FaCalendarAlt /> <strong>Date Updated:</strong>{' '}
            {formatDateInTimezone(job.updated_at, profile?.timezone) || 'Not specified'}
          </div>
          <div className="job-detail-item">
            <FaEye /> <strong>Views:</strong> {job.views || 0}
          </div>
        </div>
        <div className="job-details-content">
          <div className="job-details-info">
            <h2>Job Overview</h2>
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.description) }} />
            {job.required_skills && job.required_skills.length > 0 && (
              <div className="skill-requirement">
                <FaTools className="skill-icon" />
                <strong>Skill requirement:</strong>
                <div className="skill-tags">
                  {job.required_skills.map((skill, idx) => (
                    <span key={idx} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="job-details-actions">
            {profile?.role === 'jobseeker' && job.status === 'Active' ? (
              hasApplied ? (
                <p className="already-applied">Already Applied</p>
              ) : (
                <button onClick={handleApply} className="action-button">
                  Apply Now
                </button>
              )
            ) : !profile ? (
              <button onClick={() => navigate('/login')} className="action-button">
                Login to Apply
              </button>
            ) : null}
            {profile && (
              <Link
                to={`/complaint?type=job_post&id=${job.id}`}
                className="report-link"
              >
                Report Job Post
              </Link>
            )}
          </div>
        </div>
        {isApplyModalOpen && (
          <div className="modal">
            <div className="modal-content">
              <span className="close" onClick={() => setIsApplyModalOpen(false)}>×</span>
              <h3>Apply with Cover Letter</h3>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Write your cover letter here..."
                rows={6}
              />
              <p>Your resume from profile will be attached automatically.</p>
              <button onClick={submitApply} className="action-button">
                Submit Application
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default JobDetails;