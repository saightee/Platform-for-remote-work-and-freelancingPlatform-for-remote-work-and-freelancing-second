import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import {
  getUserProfileById,
  getReviewsForUser,
  incrementProfileView,
  getMyJobPosts,
  sendInvitation,
} from '../services/api';
import { JobSeekerProfile, Review, Category, JobPost } from '@types';
import { useRole } from '../context/RoleContext';
import {
  Eye,
  Shield,
  UserCircle,
  Globe2,
  CalendarDays,
  Clock,
  CircleDollarSign,
  PlayCircle,
  Linkedin,
  Instagram,
  Facebook,
  MessageCircle,
  Send,
  Briefcase,
  FileDown,
  Mail,
  Share2,
  Link2,
  FolderOpen,
  FileText,
  GraduationCap,
  Award,
  Star,
  Camera,
} from 'lucide-react';

import Loader from '../components/Loader';
import '../styles/public-profile.css';
import '../styles/invite-modal.css';
import {
  normalizeTelegram,
  normalizeWhatsApp,
  normalizeLinkedIn,
  normalizeInstagram,
  normalizeFacebook,
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

  // Gallery state (avatar + photos)
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

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

  const closeGallery = () => setGalleryOpen(false);

  useEffect(() => {
    if (!galleryOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGalleryOpen(false);
      } else if (e.key === 'ArrowRight' && galleryImages.length > 1) {
        setGalleryIndex((idx) => (idx + 1) % galleryImages.length);
      } else if (e.key === 'ArrowLeft' && galleryImages.length > 1) {
        setGalleryIndex((idx) =>
          idx === 0 ? galleryImages.length - 1 : idx - 1,
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
      const active = (jobs || []).filter(
        (j: any) => j.status === 'Active' && !j.pending_review,
      );
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
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Failed to send invitation';
      toast.error(msg);
    } finally {
      setSendingInvite(false);
    }
  };

  // ====== DATA LOAD ======
  useEffect(() => {
    const run = async () => {
      if (!id) {
        setError('Invalid user ID.');
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const [p, r] = await Promise.all([
          getUserProfileById(id),
          getReviewsForUser(id),
        ]);
        setProfile(p);
        setReviews(r || []);
        if (
          p.role === 'jobseeker' &&
          !sessionStorage.getItem(`viewed_profile_${id}`)
        ) {
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
    i < Math.round(v) ? (
      <Star key={i} className="ppx-star on" fill="currentColor" />
    ) : (
      <Star key={i} className="ppx-star" />
    ),
  );
}, [profile?.average_rating]);


  const handleStub = (feature: string) => {
    toast.info(`${feature} is not implemented yet.`);
  };

  if (isLoading) return <Loader />;

  if (error || !profile) {
    return (
      <div className="ppv-root">
        <Header />
        <div className="ppv-shell">
          <div className="ppv-alert ppv-alert--error">
            {error || 'Profile not found'}
          </div>
        </div>
        <Footer />
       
      </div>
    );
  }

const toIdNum = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const viewerId = toIdNum(currentUser?.id);
const profileId = toIdNum(profile.id);

const isOwner = viewerId != null && profileId != null && viewerId === profileId;
const canSeeContacts = currentUser?.role === 'employer' || isOwner;

  // ====== Derived data for header ======

  const js: any = profile;

  const age =
    profile.role === 'jobseeker' && js.date_of_birth
      ? calcAge(js.date_of_birth)
      : null;

  const salaryMin = js.expected_salary;
  const salaryMax = js.expected_salary_max;
  const salaryType = js.expected_salary_type;
  const hasMin =
    salaryMin != null && salaryMin !== '' && Number(salaryMin) !== 0;
  const hasMax =
    salaryMax != null && salaryMax !== '' && Number(salaryMax) !== 0;
  const hasSalary = hasMin || hasMax;

  let salaryText = '';
  if (hasSalary) {
    const minNum = hasMin ? Number(salaryMin) : null;
    const maxNum = hasMax ? Number(salaryMax) : null;
    if (hasMin && hasMax) {
      salaryText = `${minNum} - ${maxNum}`;
    } else if (hasMin) {
      salaryText = String(minNum);
    } else if (hasMax) {
      salaryText = String(maxNum);
    }
    if (profile.currency) salaryText += ` ${profile.currency}`;
    if (salaryType === 'per month' || salaryType === 'per day') {
      salaryText += ` ${salaryType}`;
    }
  }

  const showCurrencyRow = !(profile.role === 'jobseeker' && hasSalary);

  let jobStatusLabel: string | null = null;
  let jobStatusClass = 'ppv-status-pill--open';
  if (profile.role === 'jobseeker') {
    const v = js.job_search_status || 'open_to_offers';
    if (v === 'actively_looking') {
      jobStatusLabel = 'Actively looking';
      jobStatusClass = 'ppv-status-pill--looking';
    } else if (v === 'hired') {
      jobStatusLabel = 'Hired';
      jobStatusClass = 'ppv-status-pill--hired';
    } else {
      jobStatusLabel = 'Open to offers';
      jobStatusClass = 'ppv-status-pill--open';
    }
  }

  const languages: string[] =
    Array.isArray(js.languages) && js.languages.length ? js.languages : [];

  const preferredJobTypes: string[] =
    Array.isArray(js.preferred_job_types) && js.preferred_job_types.length
      ? js.preferred_job_types
      : [];

  const locationText =
    (js.country_name || js.country || '') || 'Location not specified';

  const headerTitle =
    js.current_position || js.headline || js.job_title || js.title || '';

  const photoThumbs =
    galleryPhotos.length > 1 ? galleryPhotos.slice(1) : [];

  const portfolioRaw = (profile as any).portfolio;
  const portfolioLinks: string[] = Array.isArray(portfolioRaw)
    ? portfolioRaw
    : portfolioRaw
    ? [String(portfolioRaw)]
    : [];

  const portfolioFiles: string[] = Array.isArray(js.portfolio_files)
    ? js.portfolio_files
    : [];

return (
  <div>
    <Header />

    {/* LIGHTBOX (оставляем как было) */}
    {galleryOpen && galleryImages.length > 0 && (
      <div className="ch-photo-modal" onClick={closeGallery}>
        <div
          className="ch-photo-modal__inner"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="ch-photo-modal__close"
            onClick={closeGallery}
            aria-label="Close image viewer"
          >
            ×
          </button>

          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                className="ch-photo-modal__nav ch-photo-modal__nav--prev"
                onClick={() =>
                  setGalleryIndex(
                    galleryIndex === 0
                      ? galleryImages.length - 1
                      : galleryIndex - 1,
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
                    galleryIndex === galleryImages.length - 1
                      ? 0
                      : galleryIndex + 1,
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
      <div className="ppx-shell-inner">
        {/* метки просмотров/роли */}
        <div className="ppx-meta-head">
          <span className="ppx-meta-pill">
            <span className="ppx-meta-pill-icon">
              <Eye />
            </span>
            {profile.profile_views ?? 0} views
          </span>
          <span className="ppx-meta-pill">
            <span className="ppx-meta-pill-icon">
              <Shield />
            </span>
            {profile.role}
          </span>
        </div>

        {/* HEADER CARD */}
        <section className="ppx-header-card">
          <div className="ppx-header-top">
            {/* левая часть: аватар + текст */}
            <div className="ppx-header-main">
              <div
                className="ppx-avatar-wrap"
                onClick={() => galleryPhotos.length && openGallery(0)}
                role={galleryPhotos.length ? 'button' : undefined}
                tabIndex={galleryPhotos.length ? 0 : -1}
                onKeyDown={(e) => {
                  if (
                    galleryPhotos.length &&
                    (e.key === 'Enter' || e.key === ' ')
                  ) {
                    openGallery(0);
                  }
                }}
                style={{
                  cursor: galleryPhotos.length ? 'zoom-in' : 'default',
                }}
              >
                {profile.avatar ? (
                  <img
                    src={makeAbs(profile.avatar)}
                    alt="Avatar"
                    className="ppx-avatar"
                  />
                ) : (
                  <UserCircle className="ppx-avatar-fallback" />
                )}
              </div>

              <div className="ppx-header-text">
                <h1 className="ppx-name">{profile.username}</h1>

                {/* подзаголовок: берем либо headline, либо текущую должность */}
                {((profile as any).headline ||
                  (profile as any).current_position) && (
                  <p className="ppx-title">
                    {(profile as any).headline ||
                      (profile as any).current_position}
                  </p>
                )}

                <div className="ppx-meta-row">
                  {((profile as any).country_name ||
                    (profile as any).country) && (
                    <>
                      <span className="ppx-meta-item">
                        <Globe2  className="ppx-icon" />{' '}
                        {(profile as any).country_name ||
                          (profile as any).country}
                      </span>
                      <span className="ppx-meta-dot" />
                    </>
                  )}

                  {profile.role === 'jobseeker' &&
                    (profile as any).date_of_birth && (
                      <>
                        <span className="ppx-meta-item">
                          <CalendarDays  className="ppx-icon" />{' '}
                          {(() => {
                            const age = calcAge(
                              (profile as any).date_of_birth,
                            );
                            return age != null ? `${age} years old` : null;
                          })()}
                        </span>
                        <span className="ppx-meta-dot" />
                      </>
                    )}

                  {profile.experience && (
                    <>
                      <span className="ppx-meta-item">
                        <Clock  className="ppx-icon" /> {profile.experience}
                      </span>
                      <span className="ppx-meta-dot" />
                    </>
                  )}

                  {/* ожидаемая зарплата в кратком формате */}
                  {(() => {
                    const js: any = profile;
                    const min = js.expected_salary;
                    const max = js.expected_salary_max;
                    const type = js.expected_salary_type;
                    const hasMin =
                      min != null && min !== '' && Number(min) !== 0;
                    const hasMax =
                      max != null && max !== '' && Number(max) !== 0;

                    if (!hasMin && !hasMax) return null;

                    const currency = profile.currency || '';
                    const minNum = hasMin ? Number(min) : null;
                    const maxNum = hasMax ? Number(max) : null;

                    let text = '';
                    if (hasMin && hasMax) text = `${minNum} - ${maxNum}`;
                    else if (hasMin) text = `${minNum}`;
                    else if (hasMax) text = `${maxNum}`;

                    if (currency) text = `${text} ${currency}`;
                    if (type === 'per month' || type === 'per day') {
                      text = `${text} ${type}`;
                    }

                    return (
                      <span className="ppx-meta-item">
                        <CircleDollarSign  className="ppx-icon"/> {text}
                      </span>
                    );
                  })()}
                </div>

                {/* статус поиска работы */}
                {profile.role === 'jobseeker' && (
                  <span
                    className="ppx-status-pill"
                    style={(() => {
                      const v =
                        (profile as any).job_search_status ||
                        'open_to_offers';
                      if (v === 'actively_looking') {
                        return {
                          background: '#dcfce7',
                          color: '#14804a',
                        };
                      }
                      if (v === 'hired') {
                        return {
                          background: '#e5e7eb',
                          color: '#374151',
                        };
                      }
                      return {
                        background: '#e0edff',
                        color: '#2563eb',
                      };
                    })()}
                  >
                    {(() => {
                      const v =
                        (profile as any).job_search_status ||
                        'open_to_offers';
                      if (v === 'actively_looking') return 'Actively looking';
                      if (v === 'hired') return 'Hired';
                      return 'Open to offers';
                    })()}
                  </span>
                )}

                {/* рейтинг */}
                <div
                  className="ppx-stars-row"
                  aria-label={`rating ${
                    profile.average_rating ?? 0
                  } of 5`}
                >
                  <span className="ppx-stars">{stars}</span>
                  <span className="ppx-stars-num">
                    {typeof profile.average_rating === 'number'
                      ? profile.average_rating.toFixed(1)
                      : 'Not rated'}
                  </span>
                </div>
              </div>
            </div>

            {/* правая колонка с кнопками */}
            {currentUser && currentUser.id !== profile.id && (
              <div className="ppx-header-actions">
                <div className="ppx-header-actions-row">
                  {currentUser.role === 'employer' && (
                    <button
                      type="button"
                      className="ppx-btn ppx-btn-primary"
                      onClick={openInvite}
                    >
                      <Briefcase />
                      Invite to Job
                    </button>
                  )}

                  {/* <button
                    type="button"
                    className="ppx-btn ppx-btn-outline"
                    disabled
                    title="Message functionality is not implemented yet"
                  >
                    <Mail />
                    Message
                  </button> */}
                </div>
                {/* <div className="ppx-header-actions-row">
                  <button
                    type="button"
                    className="ppx-btn ppx-btn-outline"
                    disabled={!profile.resume}
                    title={
                      profile.resume
                        ? 'Download CV'
                        : 'Resume not available'
                    }
                  >
                    <FileDown />
                    Download CV
                  </button>

                  <button
                    type="button"
                    className="ppx-btn ppx-btn-outline"
                    disabled
                    title="Add to network is a stub for now"
                  >
                    <UserCircle />
                    Add to My Network
                  </button>

                  <button
                    type="button"
                    className="ppx-btn ppx-btn-outline ppx-btn-icon"
                    disabled
                    title="Share profile is a stub for now"
                  >
                    <Share2 />
                  </button>
                </div> */}
              </div>
            )}
          </div>

          {/* Languages */}
          {Array.isArray((profile as any).languages) &&
            (profile as any).languages.length > 0 && (
              <div className="ppx-languages">
                <div className="ppx-languages-title">Languages</div>
                <div className="ppx-lang-chips">
                  {(profile as any).languages.map((lng: string, i: number) => (
                    <span key={i} className="ppx-lang-pill">
                      {lng}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Video intro */}
          <div className="ppx-video">
            <div className="ppx-video-title">Video Introduction</div>
            {profile.video_intro ? (
              <a
                href={profile.video_intro}
                target="_blank"
                rel="noopener noreferrer"
                className="ppx-video-card"
              >
                <div className="ppx-video-icon">
                  <PlayCircle />
                </div>
                <div>
                  <div className="ppx-video-text-main">
                    Watch video introduction
                  </div>
                  <div className="ppx-video-text-sub">
                    Get to know me better
                  </div>
                </div>
              </a>
            ) : (
              <div className="ppx-video-card" style={{ cursor: 'default' }}>
                <div className="ppx-video-icon">
                  <PlayCircle />
                </div>
                <div>
                  <div className="ppx-video-text-main">
                    No video introduction yet
                  </div>
                  <div className="ppx-video-text-sub">
                    The candidate has not added a video.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contact & socials */}
          <div className="ppx-contact">
            <div className="ppx-contact-note">
              <Shield />
              <span>
                Contact information and social networks are private. Connect to unlock.
              </span>
            </div>

            {/* 👇 всё что внутри — блюрится если нельзя смотреть */}
            <div className={'ppx-contact-private' + (canSeeContacts ? '' : ' is-blurred')}>
              <div className="ppx-contact-grid">
                <div className="ppx-contact-chip">
                  <span className="ppx-contact-chip-icon">
                    <Mail />
                  </span>
                  {profile.email || 'Not visible'}
                </div>

                {(() => {
                  const raw = (profile as any).portfolio;
                  const links: string[] = Array.isArray(raw)
                    ? raw
                    : raw
                    ? [String(raw)]
                    : [];
                  if (!links.length) return null;

                  // если скрыто — делаем не-ссылкой (чтобы нельзя было открыть)
                  if (!canSeeContacts) {
                    return (
                      <div className="ppx-contact-chip" aria-hidden="true">
                        <span className="ppx-contact-chip-icon">
                          <Link2 />
                        </span>
                        {links[0]}
                      </div>
                    );
                  }

                  return (
                    <a
                      className="ppx-contact-chip"
                      href={links[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="ppx-contact-chip-icon">
                        <Link2 />
                      </span>
                      {links[0]}
                    </a>
                  );
                })()}
              </div>

              {(profile as any).linkedin ||
              (profile as any).instagram ||
              (profile as any).facebook ||
              (profile as any).whatsapp ||
              (profile as any).telegram ? (
                <div className="ppx-socials">
                  {(profile as any).linkedin && (
                    canSeeContacts ? (
                      <a
                        className="ppx-soc ppx-ln"
                        href={normalizeLinkedIn((profile as any).linkedin)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="LinkedIn"
                      >
                        <Linkedin />
                      </a>
                    ) : (
                      <span className="ppx-soc ppx-ln" aria-hidden="true">
                        <Linkedin />
                      </span>
                    )
                  )}

                  {(profile as any).instagram && (
                    canSeeContacts ? (
                      <a
                        className="ppx-soc ppx-ig"
                        href={normalizeInstagram((profile as any).instagram)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Instagram"
                      >
                        <Instagram />
                      </a>
                    ) : (
                      <span className="ppx-soc ppx-ig" aria-hidden="true">
                        <Instagram />
                      </span>
                    )
                  )}

                  {(profile as any).facebook && (
                    canSeeContacts ? (
                      <a
                        className="ppx-soc ppx-fb"
                        href={normalizeFacebook((profile as any).facebook)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Facebook"
                      >
                        <Facebook />
                      </a>
                    ) : (
                      <span className="ppx-soc ppx-fb" aria-hidden="true">
                        <Facebook />
                      </span>
                    )
                  )}

                  {(profile as any).whatsapp && (
                    canSeeContacts ? (
                      <a
                        className="ppx-soc ppx-wa"
                        href={normalizeWhatsApp((profile as any).whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="WhatsApp"
                      >
                        <MessageCircle />
                      </a>
                    ) : (
                      <span className="ppx-soc ppx-wa" aria-hidden="true">
                        <MessageCircle />
                      </span>
                    )
                  )}

                  {(profile as any).telegram && (
                    canSeeContacts ? (
                      <a
                        className="ppx-soc ppx-tg"
                        href={normalizeTelegram((profile as any).telegram)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Telegram"
                      >
                        <Send />
                      </a>
                    ) : (
                      <span className="ppx-soc ppx-tg" aria-hidden="true">
                        <Send />
                      </span>
                    )
                  )}
                </div>
              ) : null}
            </div>
          </div>

        </section>

        {/* PHOTOS */}
        {galleryPhotos.length > 1 && (
          <section className="ppx-card ppx-photo-section">
            <div className="ppx-section-header">
              <div className="ppx-block-title-row">
                <span className="ppx-section-icon">
                  <Camera />
                </span>
                <h2 className="ppx-section-title">Photos</h2>
              </div>
              <span className="ppx-section-count">
                {galleryPhotos.length} photos
              </span>
            </div>

            <div className="ppx-photo-grid">
              {galleryPhotos.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  className="ppx-photo-thumb"
                  onClick={() => openGallery(i)}
                >
                  <img
                    src={src}
                    alt={`Photo ${i + 1}`}
                    className="ppx-photo-thumb-img"
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* PORTFОЛИО ФАЙЛЫ */}
        {/* <section className="ppx-card">
          <div className="ppx-section-header">
            <div className="ppx-block-title-row">
              <span className="ppx-section-icon">
                <FolderOpen />
              </span>
              <h2 className="ppx-section-title">Portfolio &amp; Work Samples</h2>
            </div>
            <span className="ppx-section-count">
              {Array.isArray((profile as any).portfolio_files)
                ? (profile as any).portfolio_files.length
                : 0}{' '}
              items
            </span>
          </div>

          {Array.isArray((profile as any).portfolio_files) &&
          (profile as any).portfolio_files.length ? (
            <div className="ppx-portfolio-grid">
              {(profile as any).portfolio_files.map(
                (u: string, i: number) => {
                  const isImage = /\.(jpe?g|png|webp)$/i.test(u);
                  const src = u.startsWith('http') ? u : makeAbs(u);

                  if (isImage) {
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

                  const label =
                    u.split('/').pop() || `file-${i + 1}`;

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
                },
              )}
            </div>
          ) : (
            <p className="ppx-text muted">No portfolio files yet.</p>
          )}
        </section> */}

        {/* ABOUT + EXPERIENCE + SKILLS + EDUCATION */}
        <div className="ppx-main-grid">
          <div>
            {/* BIO */}
            <section className="ppx-card">
              <div className="ppx-block-title-row">
                <span className="ppx-section-icon">
                  <FileText />
                </span>
                <h3 className="ppx-block-title">About</h3>
              </div>
              {profile.description ? (
                <div
                  className="ppx-text"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(
                      profile.description as string,
                    ),
                  }}
                />
              ) : (
                <p className="ppx-text">Not specified</p>
              )}
            </section>

            {/* EXPERIENCE */}
            {(Array.isArray((profile as any).job_experience_items) &&
              (profile as any).job_experience_items.length) ||
            (profile as any).current_position ? (
              <section className="ppx-card">
                <div className="ppx-block-title-row">
                  <span className="ppx-section-icon">
                    <Briefcase />
                  </span>
                  <h3 className="ppx-block-title">Experience</h3>
                </div>

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
                              {(item.start_year || item.end_year) && (
                                <>
                                  {' · '}
                                  {item.start_year || '—'} —{' '}
                                  {item.end_year ?? 'Present'}
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
                      ),
                    )}
                  </ul>
                ) : (
                  <p className="ppx-text">Not specified</p>
                )}
              </section>
            ) : null}
          </div>

          <div>
            {/* SKILLS */}
            {profile.skills?.length ? (
              <section className="ppx-card">
                <div className="ppx-block-title-row">
                  <span className="ppx-section-icon">
                    <Award />
                  </span>
                  <h3 className="ppx-skillbox-title">
                    Skills &amp; Expertise
                  </h3>
                </div>
                <div className="ppx-chips">
                  {profile.skills.map((s: Category) => (
                    <span key={s.id} className="ppx-chip">
                      {s.name}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {/* EDUCATION */}
            {(Array.isArray((profile as any).education_items) &&
              (profile as any).education_items.length) ||
            (profile as any).education ? (
              <section className="ppx-card">
                <div className="ppx-block-title-row">
                  <span className="ppx-section-icon">
                    <GraduationCap />
                  </span>
                  <h3 className="ppx-block-title">Education</h3>
                </div>

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
                              {item.institution ||
                                'Institution not specified'}
                              {(item.start_year || item.end_year) && (
                                <>
                                  {' · '}
                                  {item.start_year || '—'} —{' '}
                                  {item.end_year ?? 'Present'}
                                </>
                              )}
                            </div>
                          </div>
                        </li>
                      ),
                    )}
                  </ul>
                ) : (
                  <p className="ppx-text">Not specified</p>
                )}
              </section>
            ) : null}
          </div>
        </div>

        {/* REVIEWS */}
        <section className="ppx-card">
          <div className="ppx-block-title-row">
            <span className="ppx-section-icon">
              <Star />
            </span>
            <h3 className="ppx-block-title">Reviews</h3>
          </div>

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
                          <Star
                            key={i}
                            className="ppx-star on"
                            fill="currentColor"
                          />
                        ) : (
                          <Star key={i} className="ppx-star" />
                        ),
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
        </section>
      </div>
    </div>

    {/* INVITE MODAL — как было */}
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
  
  </div>
);


};

export default PublicProfile;
