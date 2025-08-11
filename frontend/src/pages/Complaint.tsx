import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { useRole } from '../context/RoleContext';
import { submitComplaint } from '../services/api';
import Loader from '../components/Loader';


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

  useEffect(() => {
    if (!profile || !['jobseeker', 'employer'].includes(currentRole || '')) {
      setError('You must be logged in as a jobseeker or employer to submit a complaint.');
      return;
    }

    const type = searchParams.get('type');
    const id = searchParams.get('id');
    if (type === 'job_post' || type === 'profile') {
      setComplaintType(type);
    }
    if (id) {
      setTargetId(id);
    }
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
      if (complaintType === 'job_post') {
        data.job_post_id = targetId;
      } else {
        data.profile_id = targetId;
      }
      const response = await submitComplaint(data);
      setMessage(response.message || 'Complaint submitted successfully!');
      setReason('');
      setTimeout(() => navigate('/profile'), 3000); // Редирект на профиль через 3 секунды
    } catch (err: any) {
      console.error('Error submitting complaint:', err);
      setError(err.response?.data?.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile || !['jobseeker', 'employer'].includes(currentRole || '')) {
    return (
      <div>
        <Header />
      <div className="container complaint-container">
        <h2>Submit Complaint</h2>
        <p>This page is only available for jobseekers and employers.</p>
      </div>
      </div>
    );
  }

  if (isLoading) {
    return <Loader />; // Добавлен лоадер здесь, как в ProfilePage: если isLoading, показываем только Loader вместо всего контента
  }

  return (
    <div>
      <Header />
    <div className="container complaint-container">
      <h2>Submit Complaint</h2>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit} className="complaint-form">
        <div className="form-group">
          <label>Complaint Type:</label>
          <select
            value={complaintType || ''}
            onChange={(e) => setComplaintType(e.target.value as 'job_post' | 'profile')}
            disabled={!!searchParams.get('type')}
          >
            <option value="">Select type</option>
            <option value="job_post">Job Post</option>
            <option value="profile">Profile</option>
          </select>
        </div>
        <div className="form-group">
          <label>Target ID (Job Post or Profile ID):</label>
          <input
            type="text"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder="Enter ID"
            disabled={!!searchParams.get('id')}
          />
        </div>
        <div className="form-group">
          <label>Reason for Complaint:</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the issue"
            rows={5}
          />
        </div>
        <button type="submit" className="action-button" disabled={isLoading}>
          {isLoading ? 'Submitting...' : 'Submit Complaint'}
        </button>
      </form>
    </div>
       <Footer />
      <Copyright />
    </div>
  );
};

export default Complaint;