import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import JobCard from '../components/JobCard';
import FeatureCard from '../components/FeatureCard';
import TalentShowcase from '../components/TalentShowcase';
import { getCategoryIcon } from '../constants/categoryIcons';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { searchJobPosts, getStats, getCategories } from '../services/api';
import { JobPost, Category } from '@types';
import {
  FaSearch, FaLock, FaGlobe, FaChartLine, FaUsers, FaHeadset,
  FaBriefcase, FaChartBar, FaChevronLeft, FaChevronRight, FaQuoteLeft, FaUserTie
} from 'react-icons/fa';
import CountUp from 'react-countup';
import Loader from '../components/Loader';
import leftPerson from '../assets/75891.png';
import rightPerson1 from '../assets/57129.png';
import heroImg1 from '../assets/17550.jpg';
import heroImg2 from '../assets/2147839972.jpg';
import heroImg3 from '../assets/57130.png';
import heroImg4 from '../assets/58136.png';
import ReactCountryFlag from 'react-country-flag';
import { Helmet } from 'react-helmet-async';
import { jwtDecode } from 'jwt-decode';
import TestimonialsCarousel, { Testimonial } from "../components/TestimonialsCarousel";
import { brand } from '../brand';


type JwtPayload = { exp?: number };

const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  const t = localStorage.getItem('token');
  if (!t) return false;
  try {
    const { exp } = jwtDecode<JwtPayload>(t);
    return !exp || exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

const Home: React.FC = () => {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<{ title?: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 const authed = isAuthenticated();
  const [stats, setStats] = useState({
    totalResumes: 0,
    totalJobPosts: 0,
    totalEmployers: 0,
  });



  // ——— Categories carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // (если захочешь показывать кол-во вакансий по категориям — уже готов стейт)
  const [categoryCounts, setCategoryCounts] = useState<{ [key: string]: number }>({});

  // 1) ключ и TTL (по желанию)
const COOKIE_KEY = 'cookieConsent';
const CONSENT_TTL_DAYS = 365; // покажем снова через год

// 2) по умолчанию не показываем, чтобы избежать мигания
const [showCookieBanner, setShowCookieBanner] = useState(false);

// 3) на маунте проверяем localStorage
useEffect(() => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(COOKIE_KEY);
    if (!raw) {
      setShowCookieBanner(true);
      return;
    }
    // поддержка старого формата "accepted" и нового с JSON
    if (raw === 'accepted') {
      setShowCookieBanner(false);
      return;
    }

    const parsed = JSON.parse(raw) as { value: 'accepted'; ts: number };
    const age = Date.now() - (parsed?.ts || 0);
    const fresh = age < CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000;
    setShowCookieBanner(!fresh);
  } catch {
    setShowCookieBanner(true);
  }
}, []);

// 4) синхронизация между вкладками (необязательно, но приятно)
useEffect(() => {
  const onStorage = (e: StorageEvent) => {
    if (e.key === COOKIE_KEY) {
      setShowCookieBanner(false);
    }
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}, []);

// 5) обработчик клика
const handleCookieConsent = () => {
  try {
    localStorage.setItem(
      COOKIE_KEY,
      JSON.stringify({ value: 'accepted', ts: Date.now() })
    );
  } catch {
    // fallback на старый формат
    localStorage.setItem(COOKIE_KEY, 'accepted');
  }
  setShowCookieBanner(false);
};


  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [statsData, jobsData, categoriesData] = await Promise.all([
          getStats(),
          searchJobPosts({ limit: 9, sort_by: 'created_at', sort_order: 'DESC' }),
          getCategories(),
        ]);

        setStats(statsData);
        setJobs(jobsData.data || []);
        setCategories(categoriesData || []);

        if (categoriesData.length > 0) {
          const countsPromises = categoriesData.map(async (cat) => {
            const res = await searchJobPosts({ category_id: cat.id, limit: 1, page: 1 });
            return { [cat.id]: res.total || 0 };
          });
          const countsArray = await Promise.all(countsPromises);
          const counts = countsArray.reduce((acc, obj) => ({ ...acc, ...obj }), {});
          setCategoryCounts(counts);
        }
      } catch (err: any) {
        console.error('Error fetching home data:', err);
        setError(err.response?.data?.message || 'Failed to load data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [filters]);

const testimonials: Testimonial[] = [
  {
    role: "employer",
    text:
      `As an HR Manager, I’m constantly searching for reliable ways to connect with great people. ` +
      `On ${brand.name} I quickly found exactly what our company needed — talented candidates who not only matched the job descriptions but also fit our team culture. ` +
      `Within just a few weeks, I hired several amazing employees through the platform. The process was simple: posting a job, reviewing applicants, and chatting directly with them felt effortless compared to other tools I’ve tried. ` +
      `What I really love is how much time it saved me, and the fact that I could genuinely focus on people, not just resumes. ` +
      `For us, ${brand.name} became more than just a hiring platform — it’s a partner that makes building a strong team much easier.`,
    name: "Anna Schneider",
    title: "HR Manager – Recruitment & Talent Development",
    countryCode: "DE",
    avatarUrl: "/img/jordan.jpg"
  },
  {
    role: "talent",
    text:
      `I joined ${brand.name} hoping to get more freelance work, and I ended up with a steady client in the US. ` +
      `The process was simple, and I love how easy it is to showcase my skills here.`,
    name: "Mateo Rojas",
    title: "Frontend Developer",
    countryCode: "MX"
  },
  {
    role: "employer",
    text:
      `Our company needed remote support fast. Posting jobs on ${brand.name} was easy, and within days I had several strong candidates ready to interview. ` +
      `It saved us so much time.`,
    name: "James O’Connor",
    title: "Operations Director",
    countryCode: "IE"
  },
  {
    role: "employer",
    text:
      `Hiring internationally always seemed complicated, but ${brand.name} made it straightforward. ` +
      `In less than a month, we had two new hires who are already adding value to our projects.`,
    name: "Lars Johansen",
    title: "CEO",
    countryCode: "DK"
  },
  {
    role: "talent",
    text:
      `${brand.name} opened the door to opportunities I never thought I’d have. ` +
      `I landed a marketing role with a European brand, and the collaboration has been amazing so far.`,
    name: "Sofia Rossi",
    title: "Marketing Specialist",
    countryCode: "IT"
  },
  {
    role: "talent",
    text:
      `Thanks to ${brand.name}, I found a data analyst role that matches my background and lets me work remotely. ` +
      `The direct chat feature made connecting with the employer so easy.`,
    name: "Akira Tanaka",
    title: "Data Analyst",
    countryCode: "JP"
  },
  {
    role: "employer",
    text:
      `As a startup founder, I appreciate speed and clarity. ${brand.name} gave me both — ` +
      `I connected with designers and developers quickly and built a reliable team without hassle.`,
    name: "Olivia Brown",
    title: "Startup Founder",
    countryCode: "GB"
  },
  {
    role: "talent",
    text:
      `From the Philippines, it can be hard to reach global clients, but ${brand.name} changed that for me. ` +
      `I’ve already completed projects for companies in Europe and Brazil, and it feels like new doors just keep opening.`,
    name: "Maria Santos",
    title: "Virtual Assistant",
    countryCode: "PH"
  },
  {
    role: "talent",
    text:
      `I’m based in Malaysia, and ${brand.name} gave me the chance to work with companies abroad without ever leaving home. ` +
      `I recently joined a project as a full-stack developer, and the experience has been smooth and rewarding.`,
    name: "Ahmad Faiz",
    title: "Full-Stack Developer",
    countryCode: "MY"
  }
];


  // Группировка категорий для карусели (5 колонок × 2 ряда = 10 карточек на слайд)
  const columns = 5;
  const rows = 2;
  const visibleItems = columns * rows;

  const categoryGroups: Category[][] = useMemo(() => {
    const groups: Category[][] = [];
    for (let i = 0; i < categories.length; i += visibleItems) {
      groups.push(categories.slice(i, i + visibleItems));
    }
    return groups;
  }, [categories, visibleItems]);

  const maxSlide = Math.max(0, categoryGroups.length - 1);

// --- свайп на мобилке: Pointer Events надёжнее в Safari/iOS ---
// --- свайп на мобилке: Pointer Events + pointer capture + cancel (iOS Safari fix) ---
const startXRef = useRef(0);
const draggingRef = useRef(false);
const swipedRef = useRef(false);        // чтобы не кликались ссылки при свайпе
const pointerIdRef = useRef<number | null>(null);
const THRESHOLD = 50;

const resetSwipe = () => {
  draggingRef.current = false;
  pointerIdRef.current = null;
  // swipedRef сбрасываем не здесь, а после предотвращённого клика — см. onClickCapture ниже
};

const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
  // работаем только с тачами; мышь/стилус не трогаем
  if (e.pointerType !== 'touch') return;

  draggingRef.current = true;
  swipedRef.current = false;
  startXRef.current = e.clientX;

  // захватываем указатель — iOS тогда продолжит слать move/up даже при лёгких скроллах
  try {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;
  } catch {
    // старые браузеры могут не поддерживать — ок
    pointerIdRef.current = null;
  }
};

const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
  if (!draggingRef.current || e.pointerType !== 'touch') return;
  // гарантируем, что это тот же pointer, который мы захватили
  if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return;

  const dx = e.clientX - startXRef.current;
  // отметим, что был горизонтальный жест — чтобы не срабатывали клики по ссылкам
  if (Math.abs(dx) > 8) swipedRef.current = true;
  // можно добавить визуальный подыгрывающий drag (не обязательно):
  // e.currentTarget.querySelector('.cc-track')?.setAttribute('style', `transform: translateX(calc(-${currentSlide * 100}% + ${dx}px))`);
};

const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
  if (!draggingRef.current || e.pointerType !== 'touch') return;
  if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return;

  // отпускаем захват
  try {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  } catch {}

  const dx = e.clientX - startXRef.current;
  if (Math.abs(dx) > THRESHOLD) {
    setCurrentSlide(prev =>
      dx < 0 ? Math.min(maxSlide, prev + 1) : Math.max(0, prev - 1)
    );
  }
  resetSwipe();
};

const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
  // iOS часто кидает cancel при вертикальном скролле — нужно почистить состояние
  if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return;
  try {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  } catch {}
  resetSwipe();
};

// Блокируем клик по ссылкам, если прямо перед этим был свайп
useEffect(() => {
  const vp = viewportRef.current;
  if (!vp) return;
  const onClickCapture = (e: MouseEvent) => {
    if (swipedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      swipedRef.current = false; // Сброс после «съеденного» клика
    }
  };
  vp.addEventListener('click', onClickCapture, true);
  return () => vp.removeEventListener('click', onClickCapture, true);
}, []);



  // ——— Testimonials pager
  const tViewportRef = useRef<HTMLDivElement | null>(null);
  const [tPage, setTPage] = useState(0);
  const [tPages, setTPages] = useState(1);

  useEffect(() => {
    const el = tViewportRef.current;
    if (!el) return;
    const cards = el.querySelectorAll('.rt-testimonial-card').length;
    setTPages(Math.max(1, Math.ceil(cards / 2)));

    const onScroll = () => {
      const page = Math.round(el.scrollLeft / el.clientWidth);
      setTPage(page);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const goToTestimonialPage = (i: number) => {
    const el = tViewportRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  const handlePrev = () => setCurrentSlide((prev) => Math.max(0, prev - 1));
  const handleNext = () => setCurrentSlide((prev) => Math.min(maxSlide, prev + 1));
  const handleDotClick = (index: number) => setCurrentSlide(index);

  const handleSearch = (searchFilters: { title?: string }) => {
    setFilters(searchFilters);
  };


  if (isLoading) {
    return <Loader />;
  }

  return (
    <div>
<Helmet>
  <title>{brand.siteTitle}</title>
  <meta name="description" content={brand.siteDescription} />
  <link rel="canonical" href={`https://${brand.domain}/`} />
  <meta property="og:title" content={brand.ogTitle} />
  <meta property="og:description" content={brand.ogDescription} />
  <meta property="og:url" content={`https://${brand.domain}/`} />
</Helmet>

      <Header />

      {/* Hero Section */}
      <div className="hb-hero hb-hero--dots">
        <div className="hb-inner">
          <div className="hb-left">
            <h1 className="hb-title">
              The <span>Simplest Path</span><br />to Connect Talent and Opportunities
            </h1>

            <p className="hb-sub">
              Join a growing community of candidates and employers finding the right fit through clear listings and smart search.
            </p>

            <div className="hb-search">
              <SearchBar onSearch={handleSearch} />
            </div>

            <p className="hb-popular">
              <span>Popular Searches:</span> Content Writer, Finance, Human Resources, Management
            </p>

            <div className="hb-stats">
              <div className="hb-stat">
                <span className="hb-num">
                  {isLoading ? 'Loading...' : <CountUp end={stats.totalResumes} duration={2} separator="," />}
                </span>
                <span className="hb-label">Freelancers</span>
              </div>
              <div className="hb-stat">
                <span className="hb-num">
                  {isLoading ? 'Loading...' : <CountUp end={stats.totalJobPosts} duration={2} separator="," />}
                </span>
                <span className="hb-label">Job Openings</span>
              </div>
              <div className="hb-stat">
                <span className="hb-num">
                  {isLoading ? 'Loading...' : <CountUp end={stats.totalEmployers} duration={2} separator="," />}
                </span>
                <span className="hb-label">Employers</span>
              </div>
            </div>
          </div>

          {/* картинки справа (прячем на планшетах/мобилках) */}
          <div className="hb-right" aria-hidden="true">
            <div className="hb-media">
              <img src={heroImg1} alt="" className="hb-img hb-img--one" />
              <img src={heroImg2} alt="" className="hb-img hb-img--two" />
           
            </div>
          </div>
        </div>
      </div>

      {/* Categories Carousel */}
      {categoryGroups.length > 0 && (
        <div className="cc-wrap">
          <h2 className="cc-title">Browse by category</h2>
          <p className="cc-sub">Find the job that's perfect for you. about 800+ new jobs everyday</p>

          <div className="cc-shell">
            <button
              className="cc-arrow cc-arrow--left"
              onClick={handlePrev}
              disabled={currentSlide === 0}
              aria-label="Previous"
            >
              <FaChevronLeft />
            </button>

           <div
  className="cc-viewport"
  ref={viewportRef}
  onPointerDown={onPointerDown}
  onPointerMove={onPointerMove}
  onPointerUp={onPointerUp}
  onPointerCancel={onPointerCancel}
>
  <div
    className="cc-track"
    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
  >
                {categoryGroups.map((group, groupIndex) => (
                  <div className="cc-group" key={groupIndex}>
                    {group.map((category) => {
                      const Icon = getCategoryIcon(category.name);
                      return (
                        <Link
                          key={category.id}
                          to={`/find-job?category_id=${category.id}`}
                          className="cc-item"
                        >
                          <div className="cc-icon"><Icon /></div>
                          <div className="cc-text">
                            <div className="cc-name">{category.name}</div>
                            <div className="cc-link">Browse Jobs</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <button
              className="cc-arrow cc-arrow--right"
              onClick={handleNext}
              disabled={currentSlide === maxSlide}
              aria-label="Next"
            >
              <FaChevronRight />
            </button>
          </div>

          <div className="cc-dots">
            {Array.from({ length: maxSlide + 1 }).map((_, index) => (
              <button
                key={index}
                className={`cc-dot ${index === currentSlide ? 'cc-dot--active' : ''}`}
                onClick={() => handleDotClick(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Join Us Banner */}
      <div className="container">
        <div className="hv-hiring-banner-container">
          <div className="hv-hiring-banner-left-icon">
            <img src={heroImg3} alt="Person with resume" />
          </div>
          <div className="hv-hiring-banner-content">
            <h2 className="hv-hiring-banner-title">FIND YOUR NEXT JOB</h2>
            <p className="hv-hiring-banner-subtitle">Explore Opportunities & Apply Today</p>
            <p className="hv-hiring-banner-description">
              Browse remote and on-site positions worldwide, connect with top employers, and take the next step toward your ideal career.
            </p>
          </div>
          <Link to="/find-job" className="hv-hiring-banner-button">Find Jobs Now</Link>
          <div className="hv-hiring-banner-right-icons">
            <img src={heroImg4} alt="Person succeeding" />
          </div>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="container">
        <div className="jobs-header">
          <h2>Recent Job Postings</h2>
          <Link to="/find-job" className="view-all-jobs">View all jobs</Link>
        </div>

        {isLoading && <div>Loading recent jobs...</div>}
        {error && <div className="error-message">{error}</div>}

        <div className="home-job-grid job-card-home">
          {jobs.length > 0 ? (
            jobs.slice(0, 6).map((job) => <JobCard key={job.id} job={job} variant="home" />)
          ) : (
            !isLoading && <p>No recent jobs found.</p>
          )}
        </div>
      </div>

      <TalentShowcase />

      {/* Features */}
      <div className="container">
        <div className="features">
          <h2>{brand.whyChooseTitle}</h2>
          <div className="feature-grid">
            <FeatureCard
              icon={<FaSearch />}
              title="Smart Matching"
              description="Find the perfect job or candidate with our smart algorithms."
            />
            <FeatureCard
              icon={<FaLock />}
              title="Secure Payments"
              description="Safe and reliable payment processing."
            />
            <FeatureCard
              icon={<FaGlobe />}
              title="Global Network"
              description="Connect with talent from around the world."
            />
            <FeatureCard
              icon={<FaChartLine />}
              title="Performance Tracking"
              description="Monitor progress and ensure quality."
            />
            <FeatureCard
              icon={<FaUsers />}
              title="Vibrant Community"
              description="Join thousands of professionals sharing insights and opportunities."
            />
            <FeatureCard
              icon={<FaHeadset />}
              title="24/7 Support"
              description="Our team is always ready to assist you with any questions."
            />
            <FeatureCard
              icon={<FaBriefcase />}
              title="Diverse Jobs"
              description="Access a wide range of remote and virtual positions worldwide."
            />
            <FeatureCard
              icon={<FaChartBar />}
              title="Performance Analytics"
              description="Gain insights into your job search or hiring metrics."
            />
          </div>
        </div>

        {/* Hiring Banner */}
        <div className="hv-hiring-banner-container">
          <div className="hv-hiring-banner-left-icon">
            <img src={leftPerson} alt="Person with paper" />
          </div>
          <div className="hv-hiring-banner-content">
            <h2 className="hv-hiring-banner-title">WE ARE HIRING</h2>
            <p className="hv-hiring-banner-subtitle">Let's Work Together & Discover Top Talent</p>
            <p className="hv-hiring-banner-description">
              Connect with the best virtual assistants and remote workers worldwide to build your dream team.
            </p>
          </div>
          <Link to="/find-talent" className="hv-hiring-banner-button">Find Talent Now</Link>
          <div className="hv-hiring-banner-right-icons">
            <img src={rightPerson1} alt="Person pointing" />
          </div>
        </div>

  

{/* <div className="divider-icon"><span>JF</span></div> */}





<TestimonialsCarousel
  items={testimonials}
  title="What Our Users Say"
  heroImageUrl={"/img/hero-person.jpg"} // можно не передавать — возьмётся avatarUrl первого
/>
       
        {/* <div className="rt-testimonials-container">
          <h2 className="rt-testimonials-title">What Our Users Say</h2>
          <div className="rt-testimonials-grid" ref={tViewportRef}>

            <div className="rt-testimonial-card">
              <div className="rt-badge rt-employer"><FaBriefcase /> Employer</div>
              <FaQuoteLeft className="rt-quote-icon" />
              <p className="rt-testimonial-text">The matching algorithm here feels like a quirky wizard – it paired me with a gig that involved decoding ancient spreadsheets. Who knew data entry could be this adventurous?</p>
              <h4 className="rt-name">Alex R.</h4>
              <p className="rt-specialty">E-Commerce Manager <ReactCountryFlag countryCode="US" svg className="rt-flag" /></p>
            </div>
            <div className="rt-testimonial-card">
              <div className="rt-badge rt-talent"><FaUserTie /> Talent</div>
              <FaQuoteLeft className="rt-quote-icon" />
              <p className="rt-testimonial-text">Stumbled upon a project that let me flex my creative muscles in ways I never imagined. It's like the platform whispered secrets about hidden opportunities right into my ear.</p>
              <h4 className="rt-name">Mia T.</h4>
              <p className="rt-specialty">Graphic Designer <ReactCountryFlag countryCode="GB" svg className="rt-flag" /></p>
            </div>
            <div className="rt-testimonial-card">
              <div className="rt-badge rt-employer"><FaBriefcase /> Employer</div>
              <FaQuoteLeft className="rt-quote-icon" />
              <p className="rt-testimonial-text">Hiring felt like assembling a puzzle where all pieces magically fit. The chat feature turned interviews into casual cosmic alignments – pure serendipity!</p>
              <h4 className="rt-name">Jordan L.</h4>
              <p className="rt-specialty">Tech Startup Founder <ReactCountryFlag countryCode="DE" svg className="rt-flag" /></p>
            </div>
            <div className="rt-testimonial-card">
              <div className="rt-badge rt-talent"><FaUserTie /> Talent</div>
              <FaQuoteLeft className="rt-quote-icon" />
              <p className="rt-testimonial-text">This site turned my job hunt into a whimsical treasure hunt. Landed a role that mixes code with storytelling – it's like programming fairy tales for the digital age.</p>
              <h4 className="rt-name">Riley S.</h4>
              <p className="rt-specialty">Web Developer <ReactCountryFlag countryCode="PH" svg className="rt-flag" /></p>
            </div>
            <div className="rt-testimonial-card">
              <div className="rt-badge rt-employer"><FaBriefcase /> Employer</div>
              <FaQuoteLeft className="rt-quote-icon" />
              <p className="rt-testimonial-text">The vetting process is like a backstage pass to talent Wonderland. Hired someone who juggles tasks like a circus performer – effortless and entertaining.</p>
              <h4 className="rt-name">Casey M.</h4>
              <p className="rt-specialty">Marketing Director <ReactCountryFlag countryCode="SE" svg className="rt-flag" /></p>
            </div>
            <div className="rt-testimonial-card">
              <div className="rt-badge rt-talent"><FaUserTie /> Talent</div>
              <FaQuoteLeft className="rt-quote-icon" />
              <p className="rt-testimonial-text">Found a freelance spot that lets me weave words into enchanting narratives. It's as if the platform sprinkled pixie dust on my resume to make it sparkle.</p>
              <h4 className="rt-name">Taylor K.</h4>
              <p className="rt-specialty">Content Writer <ReactCountryFlag countryCode="CA" svg className="rt-flag" /></p>
            </div>
            <div className="rt-testimonial-card">
              <div className="rt-badge rt-employer"><FaBriefcase /> Employer</div>
              <FaQuoteLeft className="rt-quote-icon" />
              <p className="rt-testimonial-text">Building my team was like conducting an orchestra of remote virtuosos. The filters tuned everything perfectly – no sour notes in sight.</p>
              <h4 className="rt-name">Pat D.</h4>
              <p className="rt-specialty">Project Coordinator <ReactCountryFlag countryCode="AU" svg className="rt-flag" /></p>
            </div>
            <div className="rt-testimonial-card">
              <div className="rt-badge rt-talent"><FaUserTie /> Talent</div>
              <FaQuoteLeft className="rt-quote-icon" />
              <p className="rt-testimonial-text">Dived into a role that blends analytics with artistic flair. The opportunities here pop up like unexpected plot twists in a thrilling novel.</p>
              <h4 className="rt-name">Morgan P.</h4>
              <p className="rt-specialty">Data Analyst <ReactCountryFlag countryCode="FR" svg className="rt-flag" /></p>
            </div>
            <div className="rt-testimonial-card">
              <div className="rt-badge rt-employer"><FaBriefcase /> Employer</div>
              <FaQuoteLeft className="rt-quote-icon" />
              <p className="rt-testimonial-text">The direct messaging turned negotiations into a dance of ideas. Assembled a squad that's more like a band of merry adventurers than colleagues.</p>
              <h4 className="rt-name">Drew H.</h4>
              <p className="rt-specialty">HR Specialist <ReactCountryFlag countryCode="NL" svg className="rt-flag" /></p>
            </div>
            <div className="rt-testimonial-card">
              <div className="rt-badge rt-talent"><FaUserTie /> Talent</div>
              <FaQuoteLeft className="rt-quote-icon" />
              <p className="rt-testimonial-text">Snagged a virtual assistant gig that feels like partnering with a time-bending genie. Tasks vanish before I even blink – magical efficiency!</p>
              <h4 className="rt-name">Jordan E.</h4>
              <p className="rt-specialty">Virtual Assistant <ReactCountryFlag countryCode="PH" svg className="rt-flag" /></p>
            </div>
            <div className="rt-testimonial-card">
              <div className="rt-badge rt-employer"><FaBriefcase /> Employer</div>
              <FaQuoteLeft className="rt-quote-icon" />
              <p className="rt-testimonial-text">Sourcing talent here is like fishing in a pond stocked with unicorns. Every catch brings a splash of innovation to my projects.</p>
              <h4 className="rt-name">Lee V.</h4>
              <p className="rt-specialty">Software Engineer Lead <ReactCountryFlag countryCode="JP" svg className="rt-flag" /></p>
            </div>
            <div className="rt-testimonial-card">
              <div className="rt-badge rt-talent"><FaUserTie /> Talent</div>
              <FaQuoteLeft className="rt-quote-icon" />
              <p className="rt-testimonial-text">Landed a translation project that bridges cultures like a linguistic acrobat. The platform's reach feels boundless, like exploring uncharted galaxies.</p>
              <h4 className="rt-name">Sam O.</h4>
              <p className="rt-specialty">Translator <ReactCountryFlag countryCode="ES" svg className="rt-flag" /></p>
            </div>
          </div>
        </div> */}

        {/* <div className="rt-dots">
          {Array.from({ length: tPages }).map((_, i) => (
            <button
              key={i}
              className={`rt-dot ${tPage === i ? 'rt-dot--active' : ''}`}
              onClick={() => goToTestimonialPage(i)}
              aria-label={`Go to testimonials page ${i + 1}`}
              type="button"
            />
          ))}
        </div> */}
      </div>

      {/* Final CTA */}
      <div className="hv-final-cta-wrapper">
        <div className="hv-final-cta-overlay">
          <div className="hv-final-cta-content">
            <h2 className="hv-final-cta-title">Ready to Transform Your Career or Team?</h2>
           <p className="hv-final-cta-subtitle">
  Whether you're seeking top remote talent or your next virtual opportunity, 
  {brand.name} connects you to endless possibilities worldwide.
</p>
                {!authed && (
              <Link to="/role-selection" className="hv-final-cta-button">
                Get Started Today
              </Link>
            )}
          </div>
        </div>
      </div>

      <Footer />
      <Copyright />

      {showCookieBanner && (
        <div className="cb-banner" role="dialog" aria-live="polite" aria-label="Cookie notice">
          <div className="cb-container">
            <div className="cb-text">
              <strong>We use cookies</strong> to keep the site working properly and to analyze traffic.
              Read our&nbsp;
              <Link to="/privacy-policy" className="cb-link">
                Privacy & Data Policy
              </Link>.
            </div>

            <div className="cb-actions">
              <button className="cb-btn" onClick={handleCookieConsent} type="button">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
