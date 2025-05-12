import React from 'react';
import '../styles/GuideCard.css';

interface GuideCardProps {
  title: string;
  link: string;
}

const GuideCard: React.FC<GuideCardProps> = ({ title, link }) => {
  return (
    <div className="guide-card">
      <h3>{title}</h3>
      <a href={link} className="guide-link">Download eBook</a>
    </div>
  );
};

export default GuideCard;