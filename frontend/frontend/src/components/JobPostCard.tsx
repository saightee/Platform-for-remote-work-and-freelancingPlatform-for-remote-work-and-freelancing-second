import React from 'react';
import '../styles/JobPostCard.css';

interface JobPostCardProps {
  title: string;
  status: string;
}

const JobPostCard: React.FC<JobPostCardProps> = ({ title, status }) => {
  return (
    <div className="job-post-card">
      <h3>{title}</h3>
      <p>Status: {status}</p>
    </div>
  );
};

export default JobPostCard;