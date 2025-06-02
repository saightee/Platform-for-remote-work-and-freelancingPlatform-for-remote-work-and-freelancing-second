import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
<<<<<<< HEAD
      navigate(`/find-job?title=${encodeURIComponent(title)}`);
=======
      onSearch({ title });
>>>>>>> 106c1739ee3388611e17fd6a61611bb44491a598
    } else {
      navigate(`/find-talent?skills=${encodeURIComponent(title)}`);
    }
  };

  const titlePlaceholder =
    activeTab === 'find-work' ? 'Job title or keyword' : 'Candidate skills or role';

  return (
    <div className="search-bar">
      <div className="search-tabs">
        <button
          className={`tab ${activeTab === 'find-work' ? 'active' : 'inactive'}`}
          onClick={() => handleTabSwitch('find-work')}
        >
          Find Work
        </button>
        <button
          className={`tab ${activeTab === 'hire-talent' ? 'active' : 'inactive'}`}
          onClick={() => handleTabSwitch('hire-talent')}
        >
          Hire Talent
        </button>
      </div>
      <div className="search-inputs">
        <input
          type="text"
          placeholder={titlePlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button onClick={handleSubmit}>Search</button>
      </div>
    </div>
  );
};

export default SearchBar;