import React from 'react';
import { Link } from 'react-router-dom';

const PopularProfessions: React.FC = () => {
  const professions = [
    { name: 'VIRTUAL ASSISTANT', isUpperCase: true },
    { name: 'Social Media Manager', isUpperCase: false },
    { name: 'DATA ENTRY SPECIALIST', isUpperCase: true },
    { name: 'Customer Support Representative', isUpperCase: false },
    { name: 'email marketing specialist', isUpperCase: false },
    { name: 'Calendar Manager', isUpperCase: false },
    { name: 'CONTENT WRITER', isUpperCase: true },
    { name: 'Graphic Designer', isUpperCase: false },
    { name: 'BOOKKEEPER', isUpperCase: true },
    { name: 'Project Coordinator', isUpperCase: false },
    { name: 'E-COMMERCE ASSISTANT', isUpperCase: true },
    { name: 'Research Assistant', isUpperCase: false },
    { name: 'transcription specialist', isUpperCase: false },
    { name: 'Travel Planner', isUpperCase: false },
    { name: 'PERSONAL ASSISTANT', isUpperCase: true },
    { name: 'SEO Specialist', isUpperCase: false },
    { name: 'Project Coordinator', isUpperCase: false },
  ];

  const sectionStyles: React.CSSProperties = {
    padding: '2rem 0',
  };

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  };

  const titleStyles: React.CSSProperties = {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#2c3e50',
  };

  const browseLinkStyles: React.CSSProperties = {
    color: '#007bff',
    textDecoration: 'none',
    fontSize: '0.9rem',
  };

  const professionsStyles: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
  };

  const professionTagStyles = (isUpperCase: boolean): React.CSSProperties => ({
    backgroundColor: '#ecf0f1',
    border: '1px solid #e9ecef',
    borderRadius: '20px',
    padding: '0.5rem 1rem',
    fontSize: '0.9rem',
    color: '#666',
    textDecoration: 'none',
    fontWeight: isUpperCase ? 600 : 400,
    textTransform: isUpperCase ? 'uppercase' : 'none',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
  });

  return (
    <section style={sectionStyles}>
      <div style={headerStyles}>
        <h2 style={titleStyles}>Popular Virtual Professions</h2>
        <Link to="/categories" style={browseLinkStyles}>
          Browse the most in-demand remote job categories
        </Link>
      </div>
      <div style={professionsStyles}>
        {professions.map((profession, index) => (
          <Link
            key={index}
            to={`/category/${profession.name.toLowerCase().replace(/\s+/g, '-')}`}
            style={professionTagStyles(profession.isUpperCase)}
          >
            {profession.name}
          </Link>
        ))}
      </div>
    </section>
  );
};

export default PopularProfessions;