import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { getUserProfileById, getReviewsForUser, incrementProfileView, getMyJobPosts, sendInvitation } from '../services/api';
import { JobSeekerProfile, Review, Category, JobPost } from '@types';
import { useRole } from '../context/RoleContext';
import {
  FaUserCircle, FaEnvelope, FaGlobe, FaClock, FaStar, FaRegStar,
  FaBriefcase, FaLink, FaVideo, FaFilePdf, FaEye, FaShieldAlt, FaDollarSign,
  FaLinkedin, FaInstagram, FaFacebook, FaWhatsapp, FaTelegramPlane
} from 'react-icons/fa';
import Loader from '../components/Loader';
import '../styles/public-profile.css';
import '../styles/invite-modal.css';
import {
  normalizeTelegram, normalizeWhatsApp,
  normalizeLinkedIn, normalizeInstagram, normalizeFacebook
} from '../utils/socials';
import { brandOrigin } from '../brand';
import { toast } from '../utils/toast';



const makeAbs = (url: string) =>
  url?.startsWith('http') ? url : `${brandOrigin()}/backend${url}`;

const PublicProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile: currentUser } = useRole();

  const [profile, setProfile] = useState<JobSeekerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
// Invite modal state
const [inviteOpen, setInviteOpen] = useState(false);
const [myActiveJobs, setMyActiveJobs] = useState<JobPost[]>([]);
const [selectedJobId, setSelectedJobId] = useState('');
const [inviteMessage, setInviteMessage] = useState('');
const [loadingJobs, setLoadingJobs] = useState(false);
const [sendingInvite, setSendingInvite] = useState(false);

const openInvite = async () => {
  setInviteOpen(true);
  setSelectedJobId('');
  setInviteMessage('');
  try {
    setLoadingJobs(true);
    const jobs = await getMyJobPosts();
    const active = (jobs || []).filter((j: any) => j.status === 'Active' && !j.pending_review);
    setMyActiveJobs(active);
  } catch (e) {
    console.error('getMyJobPosts error', e);
    setMyActiveJobs([]);
  } finally {
    setLoadingJobs(false);
  }
};

const closeInvite = () => setInviteOpen(false);

const submitInvite = async () => {
  if (!profile || !selectedJobId) return;
  try {
    setSendingInvite(true);
    await sendInvitation({
      job_post_id: selectedJobId,
      job_seeker_id: String(profile.id),
      message: inviteMessage || undefined,
    });
    toast.success('Invitation sent');
    closeInvite();
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || 'Failed to send invitation';
    toast.error(msg);
  } finally {
    setSendingInvite(false);
  }
};


  useEffect(() => {
    const run = async () => {
      if (!id) { setError('Invalid user ID.'); setIsLoading(false); return; }
      try {
        setIsLoading(true);
        setError(null);
        const [p, r] = await Promise.all([getUserProfileById(id), getReviewsForUser(id)]);
        setProfile(p);
        setReviews(r || []);
        if (p.role === 'jobseeker' && !sessionStorage.getItem(`viewed_profile_${id}`)) {
          await incrementProfileView(id);
          sessionStorage.setItem(`viewed_profile_${id}`, 'true');
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load profile.');
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [id]);

  const backAfterReport =
    currentUser?.role === 'employer'
      ? '/employer-dashboard'
      : currentUser?.role === 'jobseeker'
      ? '/jobseeker-dashboard'
      : '/';

  const stars = useMemo(() => {
    const v = Number(profile?.average_rating ?? 0);
    return Array.from({ length: 5 }, (_, i) =>
      i < Math.round(v) ? <FaStar key={i} className="ppx-star on" /> : <FaRegStar key={i} className="ppx-star" />
    );
  }, [profile?.average_rating]);

  if (isLoading) return <Loader />;
  if (error || !profile) return <div className="ppx-shell"><div className="ppx-alert ppx-err">{error || 'Profile not found'}</div></div>;

  return (
    <div>
      <Header />

      <div className="ppx-shell">
        <div className="ppx-head">
          <h1 className="ppx-title">{profile.username}'s Profile</h1>
          <div className="ppx-meta-head">
            <span className="ppx-views"><FaEye /> {profile.profile_views ?? 0}</span>
            <span className="ppx-role-badge"><FaShieldAlt /> {profile.role}</span>
          </div>
        </div>

        <div className="ppx-grid">
          {/* LEFT CARD */}
          <aside className="ppx-card ppx-left">
            <div className="ppx-avatar-wrap">
              {profile.avatar ? (
                <img src={makeAbs(profile.avatar)} alt="Avatar" className="ppx-avatar" />
              ) : (
                <FaUserCircle className="ppx-avatar-fallback" />
              )}
            </div>

            <h2 className="ppx-name">{profile.username}</h2>

            <div className="ppx-stars" aria-label={`rating ${profile.average_rating ?? 0} of 5`}>
              {stars}
              <span className="ppx-stars-num">
                {typeof profile.average_rating === 'number' ? profile.average_rating.toFixed(1) : 'Not rated'}
              </span>
            </div>

            <ul className="ppx-kv">
              <li>
                <span className="ppx-kv-icon"><FaEnvelope /></span>
                <span className="ppx-kv-label">Email</span>
                <span className="ppx-kv-value">{profile.email || 'Not visible'}</span>
              </li>
              <li>
                <span className="ppx-kv-icon"><FaGlobe /></span>
                <span className="ppx-kv-label">Timezone</span>
                <span className="ppx-kv-value">{profile.timezone || 'Not specified'}</span>
              </li>
           <li>
  <span className="ppx-kv-icon"><FaGlobe /></span>
  <span className="ppx-kv-label">Country</span>
  <span className="ppx-kv-value">{(profile as any).country || 'Not specified'}</span>
</li>
{Array.isArray((profile as any).languages) && (profile as any).languages.length > 0 && (
  <li>
    <span className="ppx-kv-icon"><FaGlobe /></span>
    <span className="ppx-kv-label">Languages</span>
    <span className="ppx-kv-value">{(profile as any).languages.join(', ')}</span>
  </li>
)}
              {profile.role === 'jobseeker' && (
  <li>
    <span className="ppx-kv-icon"><FaBriefcase /></span>
    <span className="ppx-kv-label">Job status</span>
    <span className="ppx-kv-value">
      {(() => {
        const v = (profile as any).job_search_status || 'open_to_offers';
        const label =
          v === 'actively_looking' ? 'Actively looking' :
          v === 'hired' ? 'Hired' :
          'Open to offers';
        const color =
          v === 'actively_looking' ? '#14804a' :
          v === 'hired' ? '#6b7280' :
          '#2563eb';
        return <span style={{ padding: '2px 8px', borderRadius: 999, background: `${color}20`, color }}>{label}</span>;
      })()}
    </span>
  </li>
)}
        <li>
  <span className="ppx-kv-icon"><FaDollarSign /></span>
  <span className="ppx-kv-label">Currency</span>
  <span className="ppx-kv-value">{profile.currency || 'Not specified'}</span>
</li>

{/* NEW: Expected salary (show only if provided) */}
{(profile as any).expected_salary != null && (profile as any).expected_salary !== '' && (
  <li>
    <span className="ppx-kv-icon"><FaDollarSign /></span>
    <span className="ppx-kv-label">Expected salary</span>
    <span className="ppx-kv-value">
      {(profile as any).expected_salary} {profile.currency || ''}
    </span>
  </li>
)}

<li>
  <span className="ppx-kv-icon"><FaBriefcase /></span>
  <span className="ppx-kv-label">Experience</span>
  <span className="ppx-kv-value">{profile.experience || 'Not specified'}</span>
</li>

              <li>
                <span className="ppx-kv-icon"><FaLink /></span>
                <span className="ppx-kv-label">Portfolio</span>
                <span className="ppx-kv-value">
                  {profile.portfolio ? (
                    <a className="ppx-link" title={profile.portfolio} href={profile.portfolio} target="_blank" rel="noopener noreferrer">
                      {profile.portfolio}
                    </a>
                  ) : ('Not specified')}
                </span>
              </li>

              <li>
                <span className="ppx-kv-icon"><FaVideo /></span>
                <span className="ppx-kv-label">Video intro</span>
                <span className="ppx-kv-value">
                  {profile.video_intro ? (
                    <a className="ppx-link" title={profile.video_intro} href={profile.video_intro} target="_blank" rel="noopener noreferrer">
                      {profile.video_intro}
                    </a>
                  ) : ('Not specified')}
                </span>
              </li>

              <li>
                <span className="ppx-kv-icon"><FaFilePdf /></span>
                <span className="ppx-kv-label">Resume</span>
                <span className="ppx-kv-value">
                  {profile.resume ? (
                    <a className="ppx-link" title="Download resume" href={makeAbs(profile.resume)} target="_blank" rel="noopener noreferrer">
                      Download Resume
                    </a>
                  ) : ('Not specified')}
                </span>
              </li>
            {(profile as any).linkedin || (profile as any).instagram || (profile as any).facebook ||
 (profile as any).whatsapp || (profile as any).telegram ? (
  <li>
    <span className="ppx-kv-icon"><FaLink /></span>
    <span className="ppx-kv-label">Socials</span>
    <span className="ppx-kv-value">
      <div className="ppx-socials">
      {(profile as any).linkedin && (
  <a className="ppx-soc ppx-ln" href={normalizeLinkedIn((profile as any).linkedin)} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
    <FaLinkedin />
  </a>
)}
{(profile as any).instagram && (
  <a className="ppx-soc ppx-ig" href={normalizeInstagram((profile as any).instagram)} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
    <FaInstagram />
  </a>
)}
{(profile as any).facebook && (
  <a className="ppx-soc ppx-fb" href={normalizeFacebook((profile as any).facebook)} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
    <FaFacebook />
  </a>
)}
{(profile as any).whatsapp && (
  <a className="ppx-soc ppx-wa" href={normalizeWhatsApp((profile as any).whatsapp)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
    <FaWhatsapp />
  </a>
)}
{(profile as any).telegram && (
  <a className="ppx-soc ppx-tg" href={normalizeTelegram((profile as any).telegram)} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
    <FaTelegramPlane />
  </a>
)}

      </div>
    </span>
  </li>
) : null}

            </ul>

            {profile.skills?.length ? (
              <div className="ppx-skillbox">
                <div className="ppx-skillbox-title">Skills</div>
                <div className="ppx-chips">
                  {profile.skills.map((s: Category) => (
                    <span key={s.id} className="ppx-chip">{s.name}</span>
                  ))}
                </div>
              </div>
            ) : null}

{currentUser?.role === 'employer' && currentUser.id !== profile.id && (
  <button
    type="button"
    className="ppx-btn"
    style={{ background: '#4e74c8', color: '#fff' }}
    onClick={openInvite}
  >
    Invite to interview
  </button>
)}

            {currentUser && currentUser.id !== profile.id && (
              <Link
                className="ppx-btn ppx-outline ppx-report"
                to={`/complaint?type=profile&id=${profile.id}&return=${encodeURIComponent(backAfterReport)}`}
              >
                Report Profile
              </Link>
            )}
            
          </aside>

          {/* RIGHT: description + reviews */}
          <section className="ppx-right">
            <div className="ppx-card">
              <h3 className="ppx-block-title">Description</h3>
              <p className="ppx-text">{profile.description || 'Not specified'}</p>
            </div>

            <div className="ppx-card">
              <h3 className="ppx-block-title">Reviews</h3>
              {reviews.length ? (
                <ul className="ppx-reviews">
                  {reviews.map((rv) => (
                    <li key={rv.id} className="ppx-review">
                      <div className="ppx-review-head">
                        <strong>{rv.reviewer?.username || 'Anonymous'}</strong>
                        <span className="ppx-review-stars" aria-label={`rating ${rv.rating}/5`}>
                          {Array.from({ length: 5 }, (_, i) =>
                            i < rv.rating ? <FaStar key={i} className="ppx-star on" /> : <FaRegStar key={i} className="ppx-star" />
                          )}
                        </span>
                      </div>
                      <div className="ppx-review-body">
                        <div className="ppx-review-line"><b>Comment:</b> {rv.comment}</div>
                        <div className="ppx-review-line">
  <b>Job:</b> {rv.job_application?.job_post?.title || 'Not specified'}
</div>
                        <div className="ppx-review-line"><b>Date:</b> {new Date(rv.created_at).toLocaleString()}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ppx-text muted">No reviews yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
{inviteOpen && (
  <div className="invmd-backdrop" onClick={closeInvite}>
    <div className="invmd-card mjp-modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="invmd-title-pp">
      <div className="invmd-head">
        <h3 id="invmd-title-pp" className="invmd-title">Select Job to invite</h3>
        <button className="invmd-x" onClick={closeInvite} aria-label="Close">×</button>
      </div>

      <div className="invmd-body">
        <div className="invmd-row">
          <label className="invmd-label">Candidate</label>
          <div className="invmd-value">{profile.username}</div>
        </div>

        <div className="invmd-row">
          <label className="invmd-label" htmlFor="invmd-job-pp">Job Post</label>
          {loadingJobs ? (
            <div className="invmd-note">Loading your active jobs…</div>
          ) : myActiveJobs.length ? (
            <select
              id="invmd-job-pp"
              className="invmd-input"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
            >
              <option value="" disabled>Select a job post</option>
              {myActiveJobs.map((j) => (
                <option key={j.id} value={String(j.id)}>
                  {j.title}
                </option>
              ))}
            </select>
          ) : (
            <div className="invmd-note">You have no active jobs available.</div>
          )}
        </div>

        <div className="invmd-row">
          <label className="invmd-label" htmlFor="invmd-msg-pp">Message to candidate <span className="invmd-opt">(optional)</span></label>
          <textarea
            id="invmd-msg-pp"
            className="invmd-textarea"
            rows={4}
            value={inviteMessage}
            onChange={(e) => setInviteMessage(e.target.value)}
            placeholder="We think you’re a great fit for this role…"
          />
        </div>
      </div>

      <div className="invmd-foot">
        <button className="invmd-btn invmd-secondary" type="button" onClick={closeInvite}>Cancel</button>
        <button
          className="invmd-btn invmd-primary"
          type="button"
          onClick={submitInvite}
          disabled={!selectedJobId || sendingInvite}
        >
          {sendingInvite ? 'Sending…' : 'Send Invitation'}
        </button>
      </div>
    </div>
  </div>
)}

      <Footer />
      <Copyright />
    </div>
  );
};

export default PublicProfile;
