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

  // свайп на мобилке
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    let startX = 0;
    let deltaX = 0;
    let touching = false;
    const THRESHOLD = 50;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touching = true;
      startX = e.touches[0].clientX;
      deltaX = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (!touching) return;
      deltaX = e.touches[0].clientX - startX;
    };
    const onEnd = () => {
      if (!touching) return;
      touching = false;
      if (Math.abs(deltaX) > THRESHOLD) {
        if (deltaX < 0 && currentSlide < maxSlide) setCurrentSlide(s => Math.min(maxSlide, s + 1));
        if (deltaX > 0 && currentSlide > 0)       setCurrentSlide(s => Math.max(0, s - 1));
      }
    };

    vp.addEventListener('touchstart', onStart, { passive: true });
    vp.addEventListener('touchmove',  onMove,  { passive: true });
    vp.addEventListener('touchend',   onEnd);

    return () => {
      vp.removeEventListener('touchstart', onStart);
      vp.removeEventListener('touchmove',  onMove);
      vp.removeEventListener('touchend',   onEnd);
    };
  }, [currentSlide, maxSlide]);

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
  <title>Jobforge — The Simplest Path to Connect Talent and Opportunities</title>
  <meta
    name="description"
    content="Join a growing community of candidates and employers. Create a standout profile, apply with one click, and chat directly."
  />
  <link rel="canonical" href="https://jobforge.net/" />
  <meta property="og:title" content="Jobforge — Remote Work & Global Hiring" />
  <meta property="og:description" content="Find remote jobs or hire global talent today." />
  <meta property="og:url" content="https://jobforge.net/" />
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
                <span className="hb-label">resumes</span>
              </div>
              <div className="hb-stat">
                <span className="hb-num">
                  {isLoading ? 'Loading...' : <CountUp end={stats.totalJobPosts} duration={2} separator="," />}
                </span>
                <span className="hb-label">vacancies</span>
              </div>
              <div className="hb-stat">
                <span className="hb-num">
                  {isLoading ? 'Loading...' : <CountUp end={stats.totalEmployers} duration={2} separator="," />}
                </span>
                <span className="hb-label">employers</span>
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

            <div className="cc-viewport" ref={viewportRef}>
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
          <h2>Why Choose JobForge</h2>
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

        {/* Testimonials */}
        <div className="rt-testimonials-container">
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
        </div>

        <div className="rt-dots">
          {Array.from({ length: tPages }).map((_, i) => (
            <button
              key={i}
              className={`rt-dot ${tPage === i ? 'rt-dot--active' : ''}`}
              onClick={() => goToTestimonialPage(i)}
              aria-label={`Go to testimonials page ${i + 1}`}
              type="button"
            />
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="hv-final-cta-wrapper">
        <div className="hv-final-cta-overlay">
          <div className="hv-final-cta-content">
            <h2 className="hv-final-cta-title">Ready to Transform Your Career or Team?</h2>
            <p className="hv-final-cta-subtitle">
              Whether you're seeking top remote talent or your next virtual opportunity,
              JobForge connects you to endless possibilities worldwide.
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
