import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBriefcase, FaUsers, FaSearch, FaChevronRight } from 'react-icons/fa';

interface SearchBarProps {
  onSearch: (filters: { title?: string }) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [title, setTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'find-work' | 'hire-talent'>('find-work');
  const navigate = useNavigate();

  const handleTabSwitch = (tab: 'find-work' | 'hire-talent') => {
    setActiveTab(tab);
    setTitle('');
  };

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (activeTab === 'find-work') {
      navigate(`/find-job?title=${encodeURIComponent(title)}`);
    } else {
      navigate(`/find-talent?skills=${encodeURIComponent(title)}`);
    }
  };

  const titlePlaceholder =
    activeTab === 'find-work' ? 'job title or keyword' : 'candidate skills or role';

  return (
    <div className="search-bar sb">
      <div className="search-tabs sb-tabs">
        <button
          className={`tab sb-tab ${activeTab === 'find-work' ? 'active' : 'inactive'}`}
          onClick={() => handleTabSwitch('find-work')}
          type="button"
        >
          <FaBriefcase className="tab-icon sb-tab-icon" /> Find Work
        </button>
        <button
          className={`tab sb-tab ${activeTab === 'hire-talent' ? 'active' : 'inactive'}`}
          onClick={() => handleTabSwitch('hire-talent')}
          type="button"
        >
          <FaUsers className="tab-icon sb-tab-icon" /> Hire Talent
        </button>
      </div>

      <div className="search-inputs sb-inputs">
        <FaChevronRight className="input-icon sb-input-icon" />
        <input
          className="sb-input"
          type="text"
          placeholder={titlePlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button className="sb-btn" onClick={handleSubmit} type="button">
          <FaSearch className="button-icon sb-button-icon" /> Search
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
