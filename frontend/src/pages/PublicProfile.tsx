import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { getUserProfileById, getReviewsForUser, incrementProfileView, getMyJobPosts, sendInvitation } from '../services/api';


// import * as realApi from '../services/api';
// import * as mockApi from '../services/api.mock';


// const isDevPublicProfile =
//   typeof window !== 'undefined' &&
//   window.location?.pathname?.startsWith?.('/dev-public-profile');


// const api: any = isDevPublicProfile ? mockApi : realApi;


// const getUserProfileById   = api.getUserProfileById;
// const getReviewsForUser    = api.getReviewsForUser;
// const incrementProfileView = api.incrementProfileView;
// const getMyJobPosts        = api.getMyJobPosts;
// const sendInvitation       = api.sendInvitation;

import { JobSeekerProfile, Review, Category, JobPost } from '@types';
import { useRole } from '../context/RoleContext';
import {
  FaUserCircle, FaEnvelope, FaGlobe, FaClock, FaStar, FaRegStar,
  FaBriefcase, FaLink, FaVideo, FaFilePdf, FaEye, FaShieldAlt, FaDollarSign,
  FaLinkedin, FaInstagram, FaFacebook, FaWhatsapp, FaTelegramPlane, FaFlag, FaBirthdayCake, 
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
import DOMPurify from 'dompurify';
import '../styles/photoGallery.css';


const makeAbs = (url: string) =>
  url?.startsWith('http') ? url : `${brandOrigin()}/backend${url}`;

const calcAge = (dob?: string | null): number | null => {
  if (!dob) return null;
  const m = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const birth = new Date(year, month, day);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const mdiff = today.getMonth() - birth.getMonth();
  if (mdiff < 0 || (mdiff === 0 && today.getDate() < birth.getDate())) age--;

  if (age < 0 || age > 150) return null;
  return age;
};


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

// === Gallery state (avatar + photos) ===
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Все картинки для галереи: сначала аватар, потом фото из portfolio_files (только изображения)
  const galleryPhotos = useMemo(() => {
    if (!profile) return [];
    const list: string[] = [];

    if (profile.avatar) {
      list.push(makeAbs(profile.avatar));
    }

    const pf = (profile as any).portfolio_files;
    if (Array.isArray(pf)) {
      pf.forEach((u: string) => {
        if (!u) return;
        if (!/\.(jpe?g|png|webp)$/i.test(u)) return;
        list.push(u.startsWith('http') ? u : makeAbs(u));
      });
    }

    return list;
  }, [profile]);



  const openGallery = (index: number) => {
    if (!galleryPhotos.length) return;
    setGalleryImages(galleryPhotos);
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  const closeGallery = () => {
    setGalleryOpen(false);
  };

  // ESC / стрелки влево-вправо
  useEffect(() => {
    if (!galleryOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGalleryOpen(false);
      } else if (e.key === 'ArrowRight' && galleryImages.length > 1) {
        setGalleryIndex((idx) => (idx + 1) % galleryImages.length);
      } else if (e.key === 'ArrowLeft' && galleryImages.length > 1) {
        setGalleryIndex((idx) =>
          idx === 0 ? galleryImages.length - 1 : idx - 1
        );
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [galleryOpen, galleryImages.length]);

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
  if (error || !profile) {
    return (
      <div className="ppx-shell">
        <div className="ppx-alert ppx-err">{error || 'Profile not found'}</div>
      </div>
    );
  }



  return (
    <div>
      <Header />

      {/* LIGHTBOX */}
      {galleryOpen && galleryImages.length > 0 && (
        <div className="ch-photo-modal" onClick={closeGallery}>
          <div className="ch-photo-modal__inner" onClick={(e) => e.stopPropagation()}>
            {/* Close */}
            <button
              type="button"
              className="ch-photo-modal__close"
              onClick={closeGallery}
              aria-label="Close image viewer"
            >
              ×
            </button>

            {/* Arrows */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  className="ch-photo-modal__nav ch-photo-modal__nav--prev"
                  onClick={() =>
                    setGalleryIndex(
                      galleryIndex === 0 ? galleryImages.length - 1 : galleryIndex - 1
                    )
                  }
                  aria-label="Previous image"
                >
                  ‹
                </button>

                <button
                  type="button"
                  className="ch-photo-modal__nav ch-photo-modal__nav--next"
                  onClick={() =>
                    setGalleryIndex(
                      galleryIndex === galleryImages.length - 1 ? 0 : galleryIndex + 1
                    )
                  }
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            )}

            <div className="ch-photo-modal__image-wrap">
              <img
                src={galleryImages[galleryIndex]}
                alt={`Photo ${galleryIndex + 1}`}
                className="ch-photo-modal__img"
              />
            </div>

            {galleryImages.length > 1 && (
              <div className="ch-photo-modal__thumbs">
                {galleryImages.map((src, idx) => (
                  <button
                    key={src + idx}
                    type="button"
                    className={
                      'ch-photo-modal__thumb' +
                      (idx === galleryIndex ? ' is-active' : '')
                    }
                    onClick={() => setGalleryIndex(idx)}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="ppx-shell">
        <div className="ppx-head">
          <div className="ppx-meta-head">
            <span className="ppx-views">
              <FaEye /> {profile.profile_views ?? 0}
            </span>
            <span className="ppx-role-badge">
              <FaShieldAlt /> {profile.role}
            </span>
          </div>
        </div>

        {/* TOP GRID: left card + BIO / Work Experience */}
        <div className="ppx-grid">
          {/* LEFT CARD (НЕ ТРОГАЕМ) */}
          <aside className="ppx-card ppx-left">
            <div className="ppx-avatar-wrap">
              {profile.avatar ? (
                <img
                  src={makeAbs(profile.avatar)}
                  alt="Avatar"
                  className="ppx-avatar"
                  onClick={() => openGallery(0)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') openGallery(0);
                  }}
                  style={{ cursor: galleryPhotos.length ? 'zoom-in' : 'default' }}
                />
              ) : (
                <FaUserCircle className="ppx-avatar-fallback" />
              )}
            </div>

            {/* мини-карусель фоток под аватаром (оставляем как есть) */}
            {/* {Array.isArray((profile as any).portfolio_files) &&
              (profile as any).portfolio_files.some((u: string) =>
                /\.(jpe?g|png|webp)$/i.test(u)
              ) && (
                <div className="ppx-carousel" style={{ marginTop: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      overflowX: 'auto',
                      paddingBottom: 4,
                    }}
                  >
                    {(profile as any).portfolio_files
                      .filter((u: string) => /\.(jpe?g|png|webp)$/i.test(u))
                      .map((u: string, i: number) => (
                        <div
                          key={i}
                          style={{
                            width: 96,
                            height: 96,
                            borderRadius: 12,
                            overflow: 'hidden',
                            flex: '0 0 auto',
                          }}
                        >
                          <img
                            src={u.startsWith('http') ? u : makeAbs(u)}
                            alt={`Photo ${i + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              objectPosition: 'center',
                            }}
                            loading="lazy"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )} */}

            <h2 className="ppx-name">{profile.username}</h2>

            <div
              className="ppx-stars"
              aria-label={`rating ${profile.average_rating ?? 0} of 5`}
            >
              {stars}
              <span className="ppx-stars-num">
                {typeof profile.average_rating === 'number'
                  ? profile.average_rating.toFixed(1)
                  : 'Not rated'}
              </span>
            </div>

            <ul className="ppx-kv">
              {profile.role === 'jobseeker' && (
                  <li>
                    <span className="ppx-kv-icon">
                      <FaBriefcase />
                    </span>
                    <span className="ppx-kv-label">Current position</span>
                    <span className="ppx-kv-value">
                      {(profile as any).current_position || 'Not specified'}
                    </span>
                  </li>
                )}
              <li>
                <span className="ppx-kv-icon">
                  <FaEnvelope />
                </span>
                <span className="ppx-kv-label">Email</span>
                <span className="ppx-kv-value">
                  {profile.email ? (
                    <a
                      className="ppx-ellink"
                      title={profile.email}
                    >
                      {profile.email}
                    </a>
                  ) : (
                    'Not visible'
                  )}
                </span>
              </li>

              {profile.role === 'jobseeker' && (profile as any).date_of_birth && (
                <li>
                  <span className="ppx-kv-icon">
                    <FaBirthdayCake />
                  </span>
                  <span className="ppx-kv-label">Age</span>
                  <span className="ppx-kv-value">
                    {(() => {
                      const age = calcAge((profile as any).date_of_birth);
                      return age != null ? `${age} y.o.` : 'Not specified';
                    })()}
                  </span>
                </li>
              )}

              <li>
                <span className="ppx-kv-icon">
                  <FaFlag />
                </span>
                <span className="ppx-kv-label">Country</span>
                <span className="ppx-kv-value">
                  {(profile as any).country_name ||
                    (profile as any).country ||
                    'Not specified'}
                </span>
              </li>

              {Array.isArray((profile as any).languages) &&
                (profile as any).languages.length > 0 && (
                  <li>
                    <span className="ppx-kv-icon">
                      <FaGlobe />
                    </span>
                    <span className="ppx-kv-label">Languages</span>
                    <span className="ppx-kv-value">
                      {(profile as any).languages.join(', ')}
                    </span>
                  </li>
                )}

                           {profile.role === 'jobseeker' && (
                <li>
                  <span className="ppx-kv-icon">
                    <FaBriefcase />
                  </span>
                  <span className="ppx-kv-label">Job status</span>
                  <span className="ppx-kv-value">
                    {(() => {
                      const v = (profile as any).job_search_status || 'open_to_offers';
                      const label =
                        v === 'actively_looking'
                          ? 'Actively looking'
                          : v === 'hired'
                          ? 'Hired'
                          : 'Open to offers';
                      const color =
                        v === 'actively_looking'
                          ? '#14804a'
                          : v === 'hired'
                          ? '#6b7280'
                          : '#2563eb';
                      return (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: `${color}20`,
                            color,
                          }}
                        >
                          {label}
                        </span>
                      );
                    })()}
                  </span>
                </li>
              )}

              {/* Preferred job type */}
              {profile.role === 'jobseeker' &&
                Array.isArray((profile as any).preferred_job_types) &&
                (profile as any).preferred_job_types.length > 0 && (
                  <li>
                    <span className="ppx-kv-icon">
                      <FaBriefcase />
                    </span>
                    <span className="ppx-kv-label">Preferred job type</span>
                    <span className="ppx-kv-value">
                      {(profile as any).preferred_job_types.join(', ')}
                    </span>
                  </li>
                )}

              {(() => {
                const js: any = profile;
                const min = js.expected_salary;
                const max = js.expected_salary_max;
                const type = js.expected_salary_type;
                const hasMin =
                  min != null &&
                  min !== '' &&
                  Number(min) !== 0;
                const hasMax =
                  max != null &&
                  max !== '' &&
                  Number(max) !== 0;

                const hasSalary = hasMin || hasMax;

                // Currency row: скрываем для jobseeker, если есть expected salary
                if (!(profile.role === 'jobseeker' && hasSalary)) {
                  return (
                    <li>
                      <span className="ppx-kv-icon">
                        <FaDollarSign />
                      </span>
                      <span className="ppx-kv-label">Currency</span>
                      <span className="ppx-kv-value">
                        {profile.currency || 'Not specified'}
                      </span>
                    </li>
                  );
                }
                return null;
              })()}

              {(() => {
                const js: any = profile;
                const min = js.expected_salary;
                const max = js.expected_salary_max;
                const type = js.expected_salary_type;
                const hasMin =
                  min != null &&
                  min !== '' &&
                  Number(min) !== 0;
                const hasMax =
                  max != null &&
                  max !== '' &&
                  Number(max) !== 0;

                if (!hasMin && !hasMax) return null;

                const currency = profile.currency || '';
                const minNum = hasMin ? Number(min) : null;
                const maxNum = hasMax ? Number(max) : null;

                let text = '';
                if (hasMin && hasMax) {
                  text = `${minNum} - ${maxNum}`;
                } else if (hasMin) {
                  text = `${minNum}`;
                } else if (hasMax) {
                  text = `${maxNum}`;
                }

                if (currency) {
                  text = `${text} ${currency}`;
                }

                if (type === 'per month' || type === 'per day') {
                  text = `${text} ${type}`;
                }

                return (
                  <li>
                    <span className="ppx-kv-icon">
                      <FaDollarSign />
                    </span>
                    <span className="ppx-kv-label">Expected salary</span>
                    <span className="ppx-kv-value">{text}</span>
                  </li>
                );
              })()}


              <li>
                <span className="ppx-kv-icon">
                  <FaBriefcase />
                </span>
                <span className="ppx-kv-label">Experience</span>
                <span className="ppx-kv-value">
                  {profile.experience || 'Not specified'}
                </span>
              </li>

             <li>
  <span className="ppx-kv-icon">
    <FaLink />
  </span>
  <span className="ppx-kv-label">Portfolio</span>
  <span className="ppx-kv-value">
    {(() => {
      const raw = (profile as any).portfolio;
      const links: string[] = Array.isArray(raw)
        ? raw
        : raw
        ? [String(raw)]
        : [];

      if (!links.length) return 'Not visible';

      return (
        <div className="ppx-portfolio-links">
          {links.map((url, idx) => (
            <a
              key={idx}
              className="ppx-link"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {url}
            </a>
          ))}
        </div>
      );
    })()}
  </span>
</li>



              <li>
                <span className="ppx-kv-icon">
                  <FaVideo />
                </span>
                <span className="ppx-kv-label">Video intro</span>
                <span className="ppx-kv-value">
                  {profile.video_intro ? (
                    <a
                      className="ppx-link"
                      title={profile.video_intro}
                      href={profile.video_intro}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {profile.video_intro}
                    </a>
                  ) : (
                    'Not visible'
                  )}
                </span>
              </li>


              <li>
                <span className="ppx-kv-icon">
                  <FaFilePdf />
                </span>
                <span className="ppx-kv-label">Resume</span>
                <span className="ppx-kv-value">
                  {profile.resume ? (
                    <a
                      className="ppx-link"
                      title="Download resume"
                      href={makeAbs(profile.resume)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download Resume
                    </a>
                  ) : (
                    'Not visible'
                  )}
                </span>
              </li>


              {(profile as any).linkedin ||
              (profile as any).instagram ||
              (profile as any).facebook ||
              (profile as any).whatsapp ||
              (profile as any).telegram ? (
                <li>
                  <span className="ppx-kv-icon">
                    <FaLink />
                  </span>
                  <span className="ppx-kv-label">Socials</span>
                  <span className="ppx-kv-value">
                    <div className="ppx-socials">
                      {(profile as any).linkedin && (
                        <a
                          className="ppx-soc ppx-ln"
                          href={normalizeLinkedIn((profile as any).linkedin)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="LinkedIn"
                        >
                          <FaLinkedin />
                        </a>
                      )}
                      {(profile as any).instagram && (
                        <a
                          className="ppx-soc ppx-ig"
                          href={normalizeInstagram((profile as any).instagram)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Instagram"
                        >
                          <FaInstagram />
                        </a>
                      )}
                      {(profile as any).facebook && (
                        <a
                          className="ppx-soc ppx-fb"
                          href={normalizeFacebook((profile as any).facebook)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Facebook"
                        >
                          <FaFacebook />
                        </a>
                      )}
                      {(profile as any).whatsapp && (
                        <a
                          className="ppx-soc ppx-wa"
                          href={normalizeWhatsApp((profile as any).whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="WhatsApp"
                        >
                          <FaWhatsapp />
                        </a>
                      )}
                      {(profile as any).telegram && (
                        <a
                          className="ppx-soc ppx-tg"
                          href={normalizeTelegram((profile as any).telegram)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Telegram"
                        >
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
                    <span key={s.id} className="ppx-chip">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* actions row (invite + report) */}
            {currentUser && currentUser.id !== profile.id && (
              <div className="ppx-actions-line">
                {currentUser.role === 'employer' && (
                  <button
                    type="button"
                    className="ppx-btn"
                    style={{ background: '#4e74c8', color: '#fff' }}
                    onClick={openInvite}
                  >
                    Invite to interview
                  </button>
                )}

                <Link
                  className="ppx-btn ppx-outline ppx-report profile-report-btn"
                  to={`/complaint?type=profile&id=${profile.id}&return=${encodeURIComponent(
                    backAfterReport
                  )}`}
                >
                  Report Profile
                </Link>
              </div>
            )}
          </aside>

          {/* RIGHT COLUMN: BIO + WORK EXPERIENCE */}
  {/* RIGHT COLUMN: BIO + CAREER + EDUCATION */}
          <section className="ppx-right">
            {/* BIO */}
            <div className="ppx-card">
              <h3 className="ppx-block-title">BIO</h3>
              {profile.description ? (
                <div
                  className="ppx-richtext"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(profile.description as string),
                  }}
                />
              ) : (
                <p className="ppx-text">Not specified</p>
              )}
            </div>

            {/* Work Experience (structured) */}
            {(Array.isArray((profile as any).job_experience_items) &&
              (profile as any).job_experience_items.length) ||
            (profile as any).current_position ? (
              <div className="ppx-card">
                <h3 className="ppx-block-title">Work Experience</h3>

             

                {Array.isArray((profile as any).job_experience_items) &&
                (profile as any).job_experience_items.length ? (
                  <ul className="ppx-timeline">
                    {(profile as any).job_experience_items.map(
                      (item: any, idx: number) => (
                        <li key={idx} className="ppx-timeline-item">
                          <div className="ppx-timeline-main">
                            <div className="ppx-timeline-title">
                              {item.title || 'Untitled role'}
                            </div>
                        <div className="ppx-timeline-sub">
                            {item.company || 'Company not specified'}
                            { (item.start_year || item.end_year) && (
                              <>
                                {' · '}
                                {item.start_year || '—'} — {item.end_year ?? 'Present'}
                              </>
                            )}
                          </div>

                          </div>
                          {item.description && (
                            <div className="ppx-timeline-desc">
                              {item.description}
                            </div>
                          )}
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p className="ppx-text">Not specified</p>
                )}
              </div>
            ) : null}

            {/* Education */}
            {(Array.isArray((profile as any).education_items) &&
              (profile as any).education_items.length) ||
            (profile as any).education ? (
              <div className="ppx-card">
                <h3 className="ppx-block-title">Education</h3>

                {(profile as any).education && (
                  <p className="ppx-text-muted" style={{ marginBottom: 8 }}>
                    Summary:{' '}
                    <strong>{(profile as any).education}</strong>
                  </p>
                )}

                {Array.isArray((profile as any).education_items) &&
                (profile as any).education_items.length ? (
                  <ul className="ppx-timeline">
                    {(profile as any).education_items.map(
                      (item: any, idx: number) => (
                        <li key={idx} className="ppx-timeline-item">
                          <div className="ppx-timeline-main">
                            <div className="ppx-timeline-title">
                              {item.degree || 'Degree not specified'}
                            </div>
                            <div className="ppx-timeline-sub">
                              {item.institution || 'Institution not specified'}
                              { (item.start_year || item.end_year) && (
                                <>
                                  {' · '}
                                  {item.start_year || '—'} — {item.end_year ?? 'Present'}
                                </>
                              )}
                            </div>

                          </div>
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p className="ppx-text">Not specified</p>
                )}
              </div>
            ) : null}
          </section>
        </div>

        {/* Portfolio */}
  <div className="ppx-card">
    <h3 className="ppx-block-title">Portfolio</h3>

    {Array.isArray((profile as any).portfolio_files) &&
    (profile as any).portfolio_files.length ? (
      <div className="ppx-portfolio-grid">
        {(profile as any).portfolio_files.map((u: string, i: number) => {
          const isImage = /\.(jpe?g|png|webp)$/i.test(u);
          const src = u.startsWith('http') ? u : makeAbs(u);

          if (isImage) {
            // ищем индекс именно этой картинки в galleryPhotos,
            // чтобы крутилось в общей карусели (аватар + фото)
            const galleryIdx = galleryPhotos.indexOf(src);

            return (
              <button
                key={u + i}
                type="button"
                className="ppx-port-thumb ppx-port-thumb--img"
                onClick={() =>
                  openGallery(galleryIdx >= 0 ? galleryIdx : 0)
                }
              >
                <img
                  src={src}
                  alt={`Portfolio ${i + 1}`}
                  className="ppx-port-thumb-img"
                />
              </button>
            );
          }

          // документ (pdf, docx и т.п.) — отдельный тайл, открываем в новой вкладке
          const label = u.split('/').pop() || 'file';

          return (
            <a
              key={u + i}
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="ppx-port-thumb ppx-port-thumb--doc"
              title={label}
            >
              <span className="ppx-port-doc-icon">📄</span>
              <span className="ppx-port-doc-name">{label}</span>
            </a>
          );
        })}
      </div>
    ) : (
      <p className="ppx-text muted">No portfolio files yet.</p>
    )}
  </div>


        {/* REVIEWS (FULL WIDTH) */}
        <div className="ppx-card">
          <h3 className="ppx-block-title">Reviews</h3>
          {reviews.length ? (
            <ul className="ppx-reviews">
              {reviews.map((rv) => (
                <li key={rv.id} className="ppx-review">
                  <div className="ppx-review-head">
                    <strong>{rv.reviewer?.username || 'Anonymous'}</strong>
                    <span
                      className="ppx-review-stars"
                      aria-label={`rating ${rv.rating}/5`}
                    >
                      {Array.from({ length: 5 }, (_, i) =>
                        i < rv.rating ? (
                          <FaStar key={i} className="ppx-star on" />
                        ) : (
                          <FaRegStar key={i} className="ppx-star" />
                        )
                      )}
                    </span>
                  </div>
                  <div className="ppx-review-body">
                    <div className="ppx-review-line">
                      <b>Comment:</b> {rv.comment}
                    </div>
                    <div className="ppx-review-line">
                      <b>Date:</b>{' '}
                      {new Date(rv.created_at).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ppx-text muted">No reviews yet.</p>
          )}
        </div>
      </div>

      {/* INVITE MODAL (оставляем как есть) */}
      {inviteOpen && (
        <div className="invmd-backdrop" onClick={closeInvite}>
          <div
            className="invmd-card mjp-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invmd-title-pp"
          >
            <div className="invmd-head">
              <h3 id="invmd-title-pp" className="invmd-title">
                Select Job to invite
              </h3>
              <button
                className="invmd-x"
                onClick={closeInvite}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="invmd-body">
              <div className="invmd-row">
                <label className="invmd-label">Candidate</label>
                <div className="invmd-value">{profile.username}</div>
              </div>

              <div className="invmd-row">
                <label className="invmd-label" htmlFor="invmd-job-pp">
                  Job Post
                </label>
                {loadingJobs ? (
                  <div className="invmd-note">Loading your active jobs…</div>
                ) : myActiveJobs.length ? (
                  <select
                    id="invmd-job-pp"
                    className="invmd-input"
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                  >
                    <option value="" disabled>
                      Select a job post
                    </option>
                    {myActiveJobs.map((j) => (
                      <option key={j.id} value={String(j.id)}>
                        {j.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="invmd-note">
                    You have no active jobs available.
                  </div>
                )}
              </div>

              <div className="invmd-row">
                <label className="invmd-label" htmlFor="invmd-msg-pp">
                  Message to candidate{' '}
                  <span className="invmd-opt">(optional)</span>
                </label>
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
              <button
                className="invmd-btn invmd-secondary"
                type="button"
                onClick={closeInvite}
              >
                Cancel
              </button>
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
