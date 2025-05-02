import React from 'react';
import { Link } from 'react-router-dom';

const JobPostings: React.FC = () => {
  const jobs = [
    { id: 1, title: 'Executive Virtual Assistant', company: 'TechSolutions Inc.', type: 'Remote, Full-time', location: 'Anywhere', salary: '$25-$35/hour' },
    { id: 2, title: 'Executive Virtual Assistant', company: 'TechSolutions Inc.', type: 'Remote, Full-time', location: 'Anywhere', salary: '$25-$35/hour' },
    { id: 3, title: 'Executive Virtual Assistant', company: 'TechSolutions Inc.', type: 'Remote, Full-time', location: 'Anywhere', salary: '$25-$35/hour' },
    { id: 4, title: 'Executive Virtual Assistant', company: 'TechSolutions Inc.', type: 'Remote, Full-time', location: 'Anywhere', salary: '$25-$35/hour' },
    { id: 5, title: 'Executive Virtual Assistant', company: 'TechSolutions Inc.', type: 'Remote, Full-time', location: 'Anywhere', salary: '$25-$35/hour' },
    { id: 6, title: 'Executive Virtual Assistant', company: 'TechSolutions Inc.', type: 'Remote, Full-time', location: 'Anywhere', salary: '$25-$35/hour' },
    { id: 7, title: 'Social Media Manager', company: 'Digital Media Co.', type: 'Remote, Part-time', location: 'Europe', salary: '$1500-$2000/month' },
    { id: 8, title: 'Data Entry Specialist', company: 'Data Experts', type: 'Remote, Contract', location: 'Worldwide', salary: '$18-$22/hour' },
    { id: 9, title: 'Executive Virtual Assistant', company: 'TechSolutions Inc.', type: 'Remote, Full-time', location: 'Anywhere', salary: '$25-$35/hour' },
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
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#2c3e50',
  };

  const viewAllStyles: React.CSSProperties = {
    color: '#007bff',
    textDecoration: 'none',
    fontSize: '0.9rem',
  };

  const jobCardsStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.5rem',
  };

  const jobCardStyles: React.CSSProperties = {
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
  };

  const jobTitleStyles: React.CSSProperties = {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#2c3e50',
    marginBottom: '0.5rem',
  };

  const companyStyles: React.CSSProperties = {
    fontSize: '0.9rem',
    color: '#666',
    marginBottom: '0.75rem',
  };

  const tagsStyles: React.CSSProperties = {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  };

  const tagStyles = (type: string): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: '0.3rem',
      fontSize: '0.8rem',
      color: '#666',
    };

    if (type === 'Remote') {
      return { ...baseStyles };
    } else if (type === 'Full-time') {
      return { ...baseStyles };
    } else if (type === 'Anywhere') {
      return { ...baseStyles };
    }
    return baseStyles;
  };

  const circleStyles = (type: string): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
    };

    if (type === 'Remote') {
      return { ...baseStyles, backgroundColor: '#2ecc71' };
    } else if (type === 'Full-time') {
      return { ...baseStyles, backgroundColor: '#e9ecef' };
    } else if (type === 'Anywhere') {
      return { ...baseStyles, backgroundColor: '#ff6b6b' };
    }
    return baseStyles;
  };

  const salaryStyles: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#2c3e50',
    marginBottom: '0.75rem',
  };

  const applyButtonStyles: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '0.5rem',
    fontSize: '0.9rem',
    fontWeight: 500,
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    textAlign: 'center',
    textDecoration: 'none',
    cursor: 'pointer',
  };

  return (
    <section style={sectionStyles}>
      <div style={headerStyles}>
        <h2 style={titleStyles}>Recent Job Postings</h2>
        <Link to="/jobs" style={viewAllStyles}>View all jobs</Link>
      </div>
      <div style={jobCardsStyles}>
        {jobs.map((job) => (
          <div key={job.id} style={jobCardStyles}>
            <h3 style={jobTitleStyles}>{job.title}</h3>
            <p style={companyStyles}>{job.company}</p>
            <div style={tagsStyles}>
              <span style={tagStyles('Remote')}>
                <span style={circleStyles('Remote')}></span>
                Remote
              </span>
              <span style={tagStyles('Full-time')}>
                <span style={circleStyles('Full-time')}></span>
                Full-time
              </span>
              <span style={tagStyles('Anywhere')}>
                <span style={circleStyles('Anywhere')}></span>
                Anywhere
              </span>
            </div>
            <p style={salaryStyles}>{job.salary}</p>
            <Link to={`/job/${job.id}`} style={applyButtonStyles}>Apply</Link>
          </div>
        ))}
      </div>
    </section>
  );
};

export default JobPostings;