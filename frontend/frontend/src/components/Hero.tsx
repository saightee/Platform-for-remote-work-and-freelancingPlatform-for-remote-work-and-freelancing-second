import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Hero.css';

const Hero: React.FC = () => {
  const [searchType, setSearchType] = useState<'work' | 'hire'>('work');
  const [keywords, setKeywords] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const queryParams = new URLSearchParams({
      keywords: keywords.trim(),
    }).toString();

    if (searchType === 'work') {
      navigate(`/jobs?${queryParams}`);
    } else {
      navigate(`/workers?${queryParams}`);
    }
  };

  const handleTabChange = (type: 'work' | 'hire') => {
    setSearchType(type);
    setKeywords(''); // Очищаем поле при переключении вкладки
  };

  return (
    <section className="hero">
      <div className="container">
        <h1>Professional Virtual Assistant Platform</h1>
        <p>Connect with top virtual assistants worldwide or find your perfect remote job opportunity</p>
        <div className="search-bar">
          <div className="tab-buttons">
            <button
              className={`tab-btn ${searchType === 'work' ? 'active' : ''}`}
              onClick={() => handleTabChange('work')}
            >
              Find Work
            </button>
            <button
              className={`tab-btn ${searchType === 'hire' ? 'active' : ''}`}
              onClick={() => handleTabChange('hire')}
            >
              Hire Talent
            </button>
          </div>
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              className="search-input"
              placeholder={searchType === 'work' ? 'Job title, skills, or keywords' : 'Find an assistant'}
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
            <button type="submit" className="search-btn">
              Search
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Hero;