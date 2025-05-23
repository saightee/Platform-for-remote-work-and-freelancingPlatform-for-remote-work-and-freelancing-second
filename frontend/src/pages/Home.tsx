import { useState, useEffect } from 'react';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import JobCard from '../components/JobCard';
import FeatureCard from '../components/FeatureCard';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { searchJobPosts } from '../services/api';
import { JobPost } from '@types';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [filters, setFilters] = useState<{ title?: string }>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const jobsData = await searchJobPosts(filters);
        setJobs(jobsData);
      } catch (error: any) {
        console.error('Ошибка при загрузке вакансий:', error);
        // Показываем пустой список вместо ошибки, чтобы не ломать интерфейс
        setJobs([]);
      }
    };
    fetchData();
  }, [filters]);

  const handleSearch = (searchFilters: { title?: string }) => {
    setFilters(searchFilters);
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
    "Project Coordinator"
  ];

  return (
    <div>
      <Header />
      <div className="hero">
        <h1>Professional Job Search Platform</h1>
        <p>Connect with top virtual assistants worldwide or find your perfect remote job opportunity</p>
        <SearchBar onSearch={handleSearch} />
      </div>
      <div className="container">
        <h2>Recent Job Postings</h2>
        <div className="job-grid">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>

        <div className="features">
          <h2>Why Choose HireValve</h2>
          <div className="feature-grid">
            <FeatureCard
              title="Smart Matching"
              description="Find the perfect job or candidate with our smart algorithms."
            />
            <FeatureCard
              title="Secure Payments"
              description="Safe and reliable payment processing."
            />
            <FeatureCard
              title="Global Network"
              description="Connect with talent from around the world."
            />
            <FeatureCard
              title="Performance Tracking"
              description="Monitor progress and ensure quality."
            />
            <FeatureCard
              title="Secure Payments"
              description="Safe and reliable payment processing."
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

        <div className="cta-section">
          <div className="cta-content">
            <h2>READY TO GET STARTED?</h2>
            <div className="cta-buttons">
              <Link to="/role-selection" className="cta-button cta-button-filled">Post a Job</Link>
              <Link to="/role-selection" className="cta-button cta-button-outline">Create a Profile</Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default Home;