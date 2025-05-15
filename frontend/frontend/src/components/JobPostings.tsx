import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  status: string;
  createdBy: {
    id: string;
    username: string;
    companyName?: string;
  };
  createdAt: string;
}

const JobPostings: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/job-posts`, {
          params: { limit: 9, sort: '-createdAt' },
        });
        setJobs(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch recent jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

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

  const viewDetailsButtonStyles: React.CSSProperties = {
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

  if (loading) return <section style={sectionStyles}><div>Loading...</div></section>;
  if (error) return <section style={sectionStyles}><div>{error}</div></section>;

  return (
    <section style={sectionStyles}>
      <div style={headerStyles}>
        <h2 style={titleStyles}>Recent Job Postings</h2>
        <Link to="/job-posts" style={viewAllStyles}>View all jobs</Link>
      </div>
      <div style={jobCardsStyles}>
        {jobs.map((job) => (
          <div key={job.id} style={jobCardStyles}>
            <h3 style={jobTitleStyles}>{job.title}</h3>
            <p style={companyStyles}>{job.createdBy.companyName || job.createdBy.username}</p>
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
            <p style={salaryStyles}>${job.budget}/hour</p>
            <Link to={`/job-posts/${job.id}`} style={viewDetailsButtonStyles}>View Details</Link>
          </div>
        ))}
      </div>
    </section>
  );
};

export default JobPostings;