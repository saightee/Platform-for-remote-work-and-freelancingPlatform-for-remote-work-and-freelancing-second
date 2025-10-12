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


// === НОВОЕ: нативный скролл со scroll-snap для iOS/Android/десктопов ===
// синхронизация индикатора со скроллом
useEffect(() => {
  const vp = viewportRef.current;
  if (!vp) return;

  const onScroll = () => {
    const i = Math.round(vp.scrollLeft / vp.clientWidth);
    if (i !== currentSlide) {
      setCurrentSlide(i);
    }
  };

  vp.addEventListener('scroll', onScroll, { passive: true });
  return () => vp.removeEventListener('scroll', onScroll);
}, [currentSlide]);

// плавный переход к слайду
const scrollToSlide = (i: number) => {
  const vp = viewportRef.current;
  if (!vp) return;
  const clamped = Math.max(0, Math.min(i, maxSlide));
  vp.scrollTo({ left: clamped * vp.clientWidth, behavior: 'smooth' });
  setCurrentSlide(clamped);
};


// при ресайзе/повороте экрана — перескроллим к текущему слайду
useEffect(() => {
  const onResize = () => scrollToSlide(currentSlide);
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}, [currentSlide]);

// если количество слайдов изменилось (например, после загрузки категорий),
// не даём currentSlide вывалиться за пределы
useEffect(() => {
  setCurrentSlide((s) => Math.min(s, maxSlide));
}, [maxSlide]);



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

  {/* НОВЫЙ ВЬЮПОРТ: без onPointer* и без inline transform */}
  <div className="cc-viewport" ref={viewportRef}>
    <div className="cc-track">
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

  







<TestimonialsCarousel
  items={testimonials}
  title="What Our Users Say"
  heroImageUrl={"/img/hero-person.jpg"} 
/>
       


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
