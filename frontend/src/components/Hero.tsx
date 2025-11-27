import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Briefcase, Users } from "lucide-react";
import CountUp from 'react-countup';
import SearchBar from './SearchBar';
import { getStats } from '../services/api';
import heroImg1 from '../assets/hero-background.jpg';
import '../styles/lovable-home.css';

const Hero: React.FC = () => {
  const [stats, setStats] = useState({
    totalResumes: 0,
    totalJobPosts: 0,
    totalEmployers: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getStats();
        setStats(data);
      } catch (e) {
        // молча, не ломаем hero
      }
    };
    fetchStats();
  }, []);

  return (
    <section className="oj-hero">
      {/* фон как в Lovable */}
      <div
        className="oj-hero-bg"
        style={{ backgroundImage: `url(${heroImg1})` }}
        aria-hidden="true"
      >
        <div className="oj-hero-overlay" />
      </div>

      <div className="oj-hero-inner">
        <div className="oj-hero-text">
          <h1 className="oj-hero-title">
            <span className="oj-hero-gradient">Online Jobs.</span>{' '}
            Worldwide.
          </h1>
          <p className="oj-hero-subtitle">
            Connect with qualified freelancers or find your next opportunity
          </p>
        </div>

        {/* две карточки как у Lovable Hero */}
        <div className="oj-hero-cta-grid">
          <div className="oj-hero-card oj-hero-card--hire">
            <Briefcase className="oj-hero-card-icon" />
            <h3 className="oj-hero-card-title">Hire Talent</h3>
            <p className="oj-hero-card-text">
              Post a job and receive up to 50 applications
            </p>
            <Link to="/role-selection" className="oj-btn oj-btn--hero">
              Post a Job
            </Link>
          </div>

          <div className="oj-hero-card oj-hero-card--work">
            <Users className="oj-hero-card-icon" />
            <h3 className="oj-hero-card-title">Find Work</h3>
            <p className="oj-hero-card-text">
              Browse thousands of remote opportunities
            </p>
            <Link to="/find-job" className="oj-btn oj-btn--outline">
              Browse Jobs
            </Link>
          </div>
        </div>

        {/* твой SearchBar, но уже с Lovable-обёрткой */}
        <div className="oj-hero-search">
          <SearchBar />
        </div>

        {/* статистика под строкой поиска */}
        {/* <div className="oj-hero-stats">
          <div className="oj-hero-stat">
            <span className="oj-hero-stat-number">
              <CountUp end={stats.totalResumes} duration={2} separator="," />
            </span>
            <span className="oj-hero-stat-label">Freelancers</span>
          </div>
          <div className="oj-hero-stat">
            <span className="oj-hero-stat-number">
              <CountUp end={stats.totalJobPosts} duration={2} separator="," />
            </span>
            <span className="oj-hero-stat-label">Job Openings</span>
          </div>
          <div className="oj-hero-stat">
            <span className="oj-hero-stat-number">
              <CountUp end={stats.totalEmployers} duration={2} separator="," />
            </span>
            <span className="oj-hero-stat-label">Employers</span>
          </div>
        </div> */}
      </div>
    </section>
  );
};

export default Hero;
