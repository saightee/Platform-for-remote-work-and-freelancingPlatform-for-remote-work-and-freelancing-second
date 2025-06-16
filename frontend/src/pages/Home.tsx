import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import JobCard from '../components/JobCard';
import FeatureCard from '../components/FeatureCard';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { searchJobPosts, getStats } from '../services/api';
import { JobPost } from '@types';
import { FaSearch, FaLock, FaGlobe, FaChartLine } from 'react-icons/fa';
import CallToAction from '../components/CallToAction';
import CountUp from 'react-countup';

const Home: React.FC = () => {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [filters, setFilters] = useState<{ title?: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    resumes: 0,
    vacancies: 0,
    employers: 0,
  });
  const [showCookieBanner, setShowCookieBanner] = useState<boolean>(true);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Fetching stats and jobs with filters:', filters);
        const statsData = await getStats();
        setStats({
          resumes: statsData.resumes,
          vacancies: statsData.vacancies,
          employers: statsData.employers,
        });
        const jobsData = await searchJobPosts({
          ...filters,
          limit: 9,
          sort_by: 'created_at',
          sort_order: 'DESC',
        });
        setJobs(jobsData);
      } catch (error: any) {
        console.error('Ошибка при загрузке данных:', error);
        setError('Failed to load recent jobs or statistics. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [filters]);

  const handleSearch = (searchFilters: { title?: string }) => {
    setFilters(searchFilters);
  };

  const handleCookieConsent = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowCookieBanner(false);
  };

  const categories = [
    "VIRTUAL ASSISTANT",
    "Social Media Manager",
    "DATA ENTRY SPECIALIST",
    "Customer Support Representative",
    "email marketing specialist",
    "Calendar Manager",
    "CONTENT WRITER",
    "Graphic Designer",
    "BOOKKEEPER",
    "Project Coordinator",
    "E-COMMERCE ASSISTANT",
    "Research Assistant",
    "transcription specialist",
    "Travel Planner",
    "PERSONAL ASSISTANT",
    "SEO Specialist",
  ];

  return (
    <div>
      <Header />
      <div className="hero">
        <h1>Professional <span className="highlight">Job</span> Search Platform</h1>
        <p>Connect with top virtual assistants worldwide or find your perfect remote job opportunity</p>
        <SearchBar onSearch={handleSearch} />
        <div className="counters">
          <div className="counter-item">
            <span className="counter-number">
              {isLoading ? 'Loading...' : <CountUp end={stats.resumes} duration={2} separator="," />}
            </span>
            <span className="counter-label">resumes</span>
          </div>
          <div className="counter-item">
            <span className="counter-number">
              {isLoading ? 'Loading...' : <CountUp end={stats.vacancies} duration={2} separator="," />}
            </span>
            <span className="counter-label">vacancies</span>
          </div>
          <div className="counter-item">
            <span className="counter-number">
              {isLoading ? 'Loading...' : <CountUp end={stats.employers} duration={2} separator="," />}
            </span>
            <span className="counter-label">employers</span>
          </div>
        </div>
      </div>
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
        <div className="features">
          <h2>Why Choose HireValve</h2>
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
          </div>
        </div>
        <div className="categories">
          <h2>Popular Job Categories</h2>
          <div className="category-list">
            {categories.map((category, index) => (
              <span key={index} className={`category-item category-${index}`}>
                {category}
              </span>
            ))}
          </div>
        </div>
      </div>
      <CallToAction />
      <Footer />
      <Copyright />
      {showCookieBanner && (
        <div className="cookie-banner">
          <div className="cookie-content">
            <p>
              We use cookies to ensure that our website works properly and to analyze network traffic.{' '} <br />
              <Link to="/privacy-policy" className="cookie-link">
                Consent to personal data processing and personal data policy
              </Link>
            </p>
            <button className="cookie-button" onClick={handleCookieConsent}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;