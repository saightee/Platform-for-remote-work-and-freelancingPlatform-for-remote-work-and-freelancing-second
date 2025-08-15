import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { useRole } from '../context/RoleContext';
import { submitComplaint } from '../services/api';
import Loader from '../components/Loader';
import '../styles/contact-support.css'; // стили с классами cs-*

const Complaint: React.FC = () => {
  const { profile, currentRole } = useRole();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [complaintType, setComplaintType] = useState<'job_post' | 'profile' | null>(null);
  const [targetId, setTargetId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const rawReturn = searchParams.get('return') || '';
  const allowed = ['/employer-dashboard', '/jobseeker-dashboard', '/'];
  const returnTo = allowed.some(p => rawReturn.startsWith(p)) ? rawReturn : '';

  useEffect(() => {
    if (!profile || !['jobseeker', 'employer'].includes(currentRole || '')) {
      setError('You must be logged in as a jobseeker or employer to submit a complaint.');
      return;
    }
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    if (type === 'job_post' || type === 'profile') setComplaintType(type);
    if (id) setTargetId(id);
  }, [profile, currentRole, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintType || !targetId || !reason.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data: { job_post_id?: string; profile_id?: string; reason: string } = {
        reason: reason.trim(),
      };
      if (complaintType === 'job_post') data.job_post_id = targetId;
      else data.profile_id = targetId;

      const response = await submitComplaint(data);
      setMessage(response.message || 'Complaint submitted successfully!');
      setReason('');

      const fallback =
        profile?.role === 'employer'
          ? '/employer-dashboard'
          : profile?.role === 'jobseeker'
          ? '/jobseeker-dashboard'
          : '/';
      const dest = returnTo || fallback;

      setTimeout(() => {
        navigate(dest, { replace: true });
      }, 1200);
    } catch (err: any) {
      console.error('Error submitting complaint:', err);
      setError(err.response?.data?.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Лоадер (как и было)
  if (isLoading) return <Loader />;

  const lockedType = !!searchParams.get('type');
  const lockedId = !!searchParams.get('id');

  return (
    <div>
      <Header />

      <div className="cs-shell">
        <div className="cs-card">
          <h1 className="cs-title">Submit Complaint</h1>
          <p className="cs-subtitle">
            Report abuse, scam, or other violations related to a job post or a profile.
          </p>

          {message && <div className="cs-alert cs-ok">{message}</div>}
          {error && <div className="cs-alert cs-err">{error}</div>}

          {!profile || !['jobseeker', 'employer'].includes(currentRole || '') ? (
            <div className="cs-alert cs-err">
              This page is only available for jobseekers and employers.
            </div>
          ) : (
            <form className="cs-form" onSubmit={handleSubmit} noValidate>
              <div className="cs-row">
                <label className="cs-label">Complaint type</label>
                <select
                  className="cs-input"
                  value={complaintType || ''}
                  onChange={(e) =>
                    setComplaintType(e.target.value as 'job_post' | 'profile')
                  }
                  disabled={lockedType}
                  required
                >
                  <option value="">Select type</option>
                  <option value="job_post">Job Post</option>
                  <option value="profile">Profile</option>
                </select>
              </div>

              <div className="cs-row">
                <label className="cs-label">Target ID (Job Post or Profile ID)</label>
                <input
                  className="cs-input"
                  type="text"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="Enter ID"
                  disabled={lockedId}
                  required
                />
              </div>

              <div className="cs-row">
                <label className="cs-label">Reason</label>
                <textarea
                  className="cs-textarea"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe the issue"
                  rows={6}
                  required
                />
              </div>

              <button type="submit" className="cs-button" disabled={isLoading}>
                {isLoading ? 'Submitting…' : 'Submit complaint'}
              </button>
            </form>
          )}
        </div>
      </div>

      <Footer />
      <Copyright />
    </div>
  );
};

export default Complaint;
