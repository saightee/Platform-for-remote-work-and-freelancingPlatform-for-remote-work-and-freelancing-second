import React from 'react';
import '../styles/WorkerCard.css';

interface WorkerCardProps {
  name: string;
  role: string;
}

const WorkerCard: React.FC<WorkerCardProps> = ({ name, role }) => {
  return (
    <div className="worker-card">
      <h3>{name}</h3>
      <p>Role: {role}</p>
    </div>
  );
};

export default WorkerCard;