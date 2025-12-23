import { Shield, Zap, DollarSign, MessageCircle, Users, Clock, Globe } from "lucide-react";
import '../styles/lovable-home.css';
import { brand } from '../brand';

const Benefits: React.FC = () => {
  const items = [
    {
      icon: <DollarSign />,
      title: 'One-time fee per job',
      description: 'Post online jobs with a simple one-time payment. No subscriptions or hidden fees.',
    },
    {
      icon: <Users />,
      title: 'Up to 50 applicants',
      description: 'Receive a healthy pool of qualified remote candidates for every job posting.',
    },
    {
      icon: <MessageCircle />,
      title: 'Direct messaging',
      description: 'Interview candidates through direct messaging and move quickly.',
    },
    {
      icon: <Clock />,
      title: '30-day visibility',
      description: 'Your online job stays active and visible to talent for a full month.',
    },
    {
      icon: <Zap />,
      title: 'Fast & simple hiring',
      description: 'Create a job in minutes and start receiving applications almost immediately.',
    },
    {
      icon: <Globe />,
      title: 'Global talent pool',
      description: 'Access bilingual LATAM talent, Eastern European tech specialists, Filipino VAs and more.',
    },
  ];

  return (
    <section className="oj-section oj-section--muted">
      <div className="oj-section-inner">
        <div className="oj-section-header oj-section-header--center">
          <h2 className="oj-section-title">
            Why Choose {brand.name} for Remote Work?
          </h2>
          <p className="oj-section-subtitle">
            Find online jobs and connect with diverse, world-class remote talent from LATAM, Eastern Europe, Asia, and beyond
          </p>
        </div>

        <div className="oj-benefits-grid">
          {items.map((b, i) => (
            <article key={i} className="oj-benefit-card">
              <div className="oj-benefit-icon">{b.icon}</div>
              <div>
                <h3 className="oj-benefit-title">{b.title}</h3>
                <p className="oj-benefit-text">{b.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
