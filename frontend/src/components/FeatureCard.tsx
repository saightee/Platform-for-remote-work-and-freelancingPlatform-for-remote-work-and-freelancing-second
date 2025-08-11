// import React from 'react';

// interface FeatureCardProps {
//   icon: React.ReactNode;
//   title: string;
//   description: string;
// }

// const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
//   return (
//     <div className="feature-card">
//       <div className="feature-icon">{icon}</div>
//       <h3>{title}</h3>
//       <p>{description}</p>
//     </div>
//   );
// };

// export default FeatureCard;

import React from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
    </div>
  );
};

export default FeatureCard;