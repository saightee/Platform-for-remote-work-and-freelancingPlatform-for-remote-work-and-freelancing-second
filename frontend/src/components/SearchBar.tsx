import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Briefcase, Users } from "lucide-react";
import '../styles/lovable-home.css';

const SearchBar: React.FC = () => {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'jobs' | 'talent'>('jobs');
  const navigate = useNavigate();

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (mode === 'jobs') {
      navigate(`/find-job?title=${encodeURIComponent(title)}`);
    } else {
      navigate(`/find-talent?skills=${encodeURIComponent(title)}`);
    }
  };

  return (
     <div className="oj-search-container">
    <div className="oj-search">
      {/* переключатель Find Jobs / Find Talent */}
      <div className="oj-search-toggle">
        <button
          type="button"
          className={`oj-search-toggle-item ${
            mode === 'jobs' ? 'is-active' : ''
          }`}
          onClick={() => setMode('jobs')}
        >
          <Briefcase className="oj-search-toggle-icon" />
          Find Jobs
        </button>
        <button
          type="button"
          className={`oj-search-toggle-item ${
            mode === 'talent' ? 'is-active' : ''
          }`}
          onClick={() => setMode('talent')}
        >
          <Users className="oj-search-toggle-icon" />
          Find Talent
        </button>
      </div>

      {/* строка поиска как у Lovable */}
      <div className="oj-search-bar">
        <div className="oj-search-input-wrap">
          <Search className="oj-search-input-icon" />
          <input
            className="oj-search-input"
            type="text"
            placeholder={
              mode === 'jobs'
                ? 'Search for jobs...'
                : 'Search for talent...'
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="oj-btn oj-btn--primary oj-search-btn"
          onClick={handleSubmit}
        >
          Search
        </button>
      </div>
    </div>
    </div>
  );
};

export default SearchBar;
