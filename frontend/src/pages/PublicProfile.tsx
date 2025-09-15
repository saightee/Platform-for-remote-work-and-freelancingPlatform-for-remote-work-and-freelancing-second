import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { getUserProfileById, getReviewsForUser, incrementProfileView } from '../services/api';
import { JobSeekerProfile, Review, Category } from '@types';
import { useRole } from '../context/RoleContext';
import {
  FaUserCircle, FaEnvelope, FaGlobe, FaClock, FaStar, FaRegStar,
  FaBriefcase, FaLink, FaVideo, FaFilePdf, FaEye, FaShieldAlt, FaDollarSign,
  FaLinkedin, FaInstagram, FaFacebook, FaWhatsapp, FaTelegramPlane
} from 'react-icons/fa';
import Loader from '../components/Loader';
import '../styles/public-profile.css';

const makeAbs = (url: string) =>
  url?.startsWith('http') ? url : `https://jobforge.net/backend${url}`;

const PublicProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile: currentUser } = useRole();

  const [profile, setProfile] = useState<JobSeekerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <a className="ppx-soc ppx-ln" href={(profile as any).linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <FaLinkedin />
          </a>
        )}
        {(profile as any).instagram && (
          <a className="ppx-soc ppx-ig" href={(profile as any).instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <FaInstagram />
          </a>
        )}
        {(profile as any).facebook && (
          <a className="ppx-soc ppx-fb" href={(profile as any).facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <FaFacebook />
          </a>
        )}
        {(profile as any).whatsapp && (
          <a className="ppx-soc ppx-wa" href={(profile as any).whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
            <FaWhatsapp />
          </a>
        )}
        {(profile as any).telegram && (
          <a className="ppx-soc ppx-tg" href={(profile as any).telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
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
                        <div className="ppx-review-line"><b>Job Application ID:</b> {rv.job_application?.id || 'Not specified'}</div>
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

      <Footer />
      <Copyright />
    </div>
  );
};

export default PublicProfile;
