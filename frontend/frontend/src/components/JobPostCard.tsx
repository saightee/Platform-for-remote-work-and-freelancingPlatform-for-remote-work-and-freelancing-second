import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/JobPostCard.css';

interface JobPostCardProps {
  id: string;
  title: string;
  status: string;
}

const JobPostCard: React.FC<JobPostCardProps> = ({ id, title, status }) => {
  return (
    <div className="job-post-card">
      <h3>{title}</h3>
      <p>Status: {status}</p>
      <Link to={`/jobs/${id}`} className="view-details">View Details</Link>
    </div>
  );
};

export default JobPostCard;