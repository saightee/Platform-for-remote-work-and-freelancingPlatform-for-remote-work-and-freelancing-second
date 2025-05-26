import { useState } from 'react';

interface SearchBarProps {
  onSearch: (filters: { title?: string }) => void; // Убрали location из фильтров
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [title, setTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'find-work' | 'hire-talent'>('find-work');

  const handleTabSwitch = (tab: 'find-work' | 'hire-talent') => {
    setActiveTab(tab);
    setTitle(''); // Сбрасываем значение инпута при переключении вкладки
  };

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    onSearch({ title });
  };

  // Плейсхолдеры в зависимости от активной вкладки
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