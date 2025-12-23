import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { applyToJobPostExtended } from '../services/api';
import '../styles/job-details.css';

type Props = {
  isOpen: boolean;
  job: any | null;
  onClose: () => void;
  // если хочешь после успешной отправки обновлять список — можно передать коллбек
  onApplied?: (jobId: string | number) => void;
};

const ApplyJobModal: React.FC<Props> = ({ isOpen, job, onClose, onApplied }) => {
  const navigate = useNavigate();
  const { profile } = useRole();

  const [coverLetter, setCoverLetter] = useState('');
  const [relevantExperience, setRelevantExperience] = useState('');
  const [fullName, setFullName] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // reset как в JobDetails
    setApplyError(null);
    setFullName('');
    setReferredBy('');
    setCoverLetter('');
    setRelevantExperience('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !job) return null;

  const submitApply = async () => {
    if (!profile) {
      navigate('/login');
      return;
    }
    if (profile.role !== 'jobseeker') {
      setApplyError('Only job seekers can apply for jobs.');
      return;
    }

    if (!coverLetter.trim()) {
      setApplyError('Cover letter is required.');
      return;
    }
    if (!relevantExperience.trim()) {
      setApplyError('Relevant experience is required.');
      return;
    }

    try {
      const jobId = job?.id;
      if (!jobId) {
        setApplyError('Job ID not found.');
        return;
      }

      await applyToJobPostExtended({
        job_post_id: jobId,
        cover_letter: coverLetter.trim(),
        relevant_experience: relevantExperience.trim(),
        full_name: fullName.trim() || undefined,
        referred_by: referredBy.trim() || undefined,
      });

      onClose();
      onApplied?.(jobId);

      // как в JobDetails — кидаем в сообщения
      navigate('/jobseeker-dashboard/messages', {
        replace: true,
        state: { jobPostId: jobId },
      });
    } catch (err: any) {
      const msg: string = err?.response?.data?.message || '';

      // как в JobDetails — already applied
      if (
        (err?.response?.status === 400 || err?.response?.status === 409) &&
        /already applied/i.test(msg)
      ) {
        onClose();
        navigate('/jobseeker-dashboard/my-applications', { replace: true });
        return;
      }

      setApplyError(msg || 'Failed to apply. Please try again.');
    }
  };

  return (
    <div
      className="modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="applyTitle"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h3 id="applyTitle">Apply</h3>

        {applyError && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 12 }}>
            {applyError}
          </div>
        )}

        <form
          className="apply-form"
          onSubmit={(e) => {
            e.preventDefault();
            submitApply();
          }}
          noValidate
        >
          <div className="apply-row">
            <label className="apply-label" htmlFor="fullName">
              Full Name (optional)
            </label>
            <input
              id="fullName"
              type="text"
              className="apply-input"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (applyError) setApplyError(null);
              }}
              placeholder="Your full name"
            />
          </div>

          <div className="apply-row">
            <label className="apply-label" htmlFor="referredBy">
              Referred By (optional)
            </label>
            <input
              id="referredBy"
              type="text"
              className="apply-input"
              value={referredBy}
              onChange={(e) => setReferredBy(e.target.value)}
              placeholder="The name/email/ref code of who recommended you"
            />
          </div>

          <div className="apply-row">
            <label className="apply-label" htmlFor="relevantExperience">
              Relevant experience *
              <span className="apply-hint" style={{ display: 'block', fontSize: 12, opacity: 0.8 }}>
                Describe relevant experience: companies, roles, tasks, stack, achievements.
              </span>
            </label>
            <textarea
              id="relevantExperience"
              className="apply-textarea"
              rows={6}
              value={relevantExperience}
              onChange={(e) => setRelevantExperience(e.target.value)}
              placeholder="Describe relevant experience (companies, roles, tasks, stack, achievements…)"
              required
            />
          </div>

          <div className="apply-row">
            <label className="apply-label" htmlFor="coverLetter">
              Why are you a good fit for this role? *
            </label>
            <textarea
              id="coverLetter"
              className="apply-textarea"
              rows={6}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Explain why you’re a strong fit for the role…"
              required
            />
          </div>

          <p className="apply-help">Your resume from profile will be attached automatically.</p>

          <div className="apply-actions">
            <button type="submit" className="apply-btn">
              Submit Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyJobModal;
