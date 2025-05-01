import React, { useState } from 'react';

const Hero: React.FC = () => {
  const [searchType, setSearchType] = useState<'work' | 'hire'>('work');

  const heroStyles: React.CSSProperties = {
    textAlign: 'center',
    padding: '3rem 0',
  };

  const titleStyles: React.CSSProperties = {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#2c3e50',
    marginBottom: '0.5rem',
  };

  const subtitleStyles: React.CSSProperties = {
    fontSize: '1.1rem',
    color: '#666',
    marginBottom: '2rem',
  };

  const searchContainerStyles: React.CSSProperties = {
    display: 'inline-flex',
    flexDirection: 'column',
    backgroundColor: '#fff',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
    width: 'fit-content',
  };

  const toggleContainerStyles: React.CSSProperties = {
    display: 'flex',
    borderBottom: '1px solid #e9ecef',
    borderRadius: '8px 8px 0 0',
    overflow: 'hidden',
  };

  const toggleOptionStyles = (isActive: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem',
    fontSize: '0.9rem',
    fontWeight: 500,
    backgroundColor: isActive ? '#007bff' : '#e9ecef',
    color: isActive ? '#fff' : '#666',
    border: 'none',
    cursor: 'pointer',
    flex: 1,
    textAlign: 'center',
  });

  const searchInputContainerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
  };

  const inputStyles: React.CSSProperties = {
    padding: '0.75rem 1rem',
    fontSize: '0.9rem',
    border: 'none',
    outline: 'none',
    flex: 1,
    minWidth: '300px',
    borderRadius: '0 0 0 8px',
  };

  const buttonStyles: React.CSSProperties = {
    padding: '0.75rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: 500,
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: '0 0 8px 0',
    cursor: 'pointer',
  };

  return (
    <section style={heroStyles}>
      <h1 style={titleStyles}>Professional Virtual Assistant Platform</h1>
      <p style={subtitleStyles}>Connect with top virtual assistants worldwide or find your perfect remote job opportunity</p>
      <div style={searchContainerStyles}>
        <div style={toggleContainerStyles}>
          <button
            style={toggleOptionStyles(searchType === 'work')}
            onClick={() => setSearchType('work')}
          >
            Find Work
          </button>
          <button
            style={toggleOptionStyles(searchType === 'hire')}
            onClick={() => setSearchType('hire')}
          >
            Hire Talent
          </button>
        </div>
        <div style={searchInputContainerStyles}>
          <input
            type="text"
            placeholder={searchType === 'work' ? 'Job title, skills, or keywords' : 'Find an assistant'}
            style={inputStyles}
          />
          <button style={buttonStyles}>Search</button>
        </div>
      </div>
    </section>
  );
};

export default Hero;